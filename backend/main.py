import os
import io
import re
import uuid
import shutil
import openpyxl
from typing import Optional
from dotenv import load_dotenv

# Load parent Dashboard/.env and local backend/.env
parent_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
if os.path.exists(parent_env):
    load_dotenv(parent_env)
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from pydantic import BaseModel

# Import custom modular helpers
from gemini_analyzer import analyze_document_with_gemini
from excel_parsers import (
    try_parse_bank_excel,
    try_parse_toss_excel,
    try_parse_naver_pay_excel,
    try_parse_koces_excel,
    try_parse_qoo10_excel,
    try_parse_paypal_excel,
    try_parse_youtube_excel,
)
from report_exporter import export_report_excel

app = FastAPI(title="VAT Report Automation API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase Credentials
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL", "https://uxvifhjwdsalugzvogds.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dmlmaGp3ZHNhbHVnenZvZ2RzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNDkzMDksImV4cCI6MjA5OTgyNTMwOX0.-BHD4cuq6hDNUoqsmLpx-VrubtMUdglrA0Upujz4J-M")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Storage directories
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "sample", "부가세신고 매출자료 정리.xlsx")


class CreateReportPayload(BaseModel):
    year: int
    quarter: int


class RowUpdatePayload(BaseModel):
    amount: Optional[int] = None
    memo: Optional[str] = None
    status: Optional[str] = None


class SettingPayload(BaseModel):
    value: str


def get_gemini_key() -> Optional[str]:
    env_key = os.getenv("GEMINI_API_KEY")
    if env_key:
        return env_key
    try:
        res = supabase.table("settings").select("value").eq("key", "gemini_api_key").execute()
        if res.data:
            return res.data[0]["value"]
    except Exception as e:
        print(f"Error fetching API Key: {e}")
    return None


def recalculate_bank_transfer(report_id: str, brand: str):
    """
    Recalculates the amount for the bank transfer row of a brand.
    Formula: bank_income - bank_expense - bank_toss_receipt - bank_koces_receipt (if Otter)
    """
    try:
        res = supabase.table("report_rows").select("*").eq("report_id", report_id).eq("brand", brand).execute()
        rows = res.data or []
        
        bank_row = None
        for r in rows:
            if r["classification"] == "무통장입금":
                bank_row = r
                break
                
        if not bank_row:
            return

        toss_receipt_row = None
        for r in rows:
            if r["pg_store"] == "토스페이먼츠" and r["classification"] == "현금영수증 별도발급":
                toss_receipt_row = r
                break
                
        bank_toss_val = toss_receipt_row["amount"] if (toss_receipt_row and toss_receipt_row["amount"] is not None) else 0

        bank_inc = bank_row.get("bank_income") or 0
        bank_exp = bank_row.get("bank_expense") or 0
        bank_koces = bank_row.get("bank_koces_receipt") or 0

        calculated_amt = bank_inc - bank_exp - bank_toss_val - (bank_koces if brand == "오터" else 0)

        supabase.table("report_rows").update({
            "amount": calculated_amt,
            "bank_toss_receipt": bank_toss_val
        }).eq("id", bank_row["id"]).execute()

    except Exception as e:
        print(f"Error recalculating bank transfer row for {brand}: {e}")


def initialize_report_rows(report_id: str):
    """
    Pre-populates rows for a new VAT report using the template Excel file.
    """
    if not os.path.exists(TEMPLATE_PATH):
        print(f"Template path does not exist: {TEMPLATE_PATH}")
        return

    try:
        wb = openpyxl.load_workbook(TEMPLATE_PATH, data_only=False)
        sheet = wb.active

        rows_to_insert = []
        current_brand = None
        current_pg = None

        for r in range(3, 81):
            col_a = sheet.cell(row=r, column=1).value
            col_b = sheet.cell(row=r, column=2).value
            col_c = sheet.cell(row=r, column=3).value
            col_d = sheet.cell(row=r, column=4).value
            col_e = sheet.cell(row=r, column=5).value

            if col_a and str(col_a).strip():
                current_brand = str(col_a).strip()
            if col_b and str(col_b).strip():
                current_pg = str(col_b).strip()

            classification = str(col_c).strip() if col_c else ""

            if not current_brand and not classification:
                continue

            ref_parts = []
            if col_d is not None:
                val_d_str = str(col_d).strip()
                if val_d_str.startswith('='):
                    ref_parts.append(f"수식: {val_d_str}")
            if col_e is not None and str(col_e).strip():
                ref_parts.append(f"참고: {str(col_e).strip()}")

            reference = " | ".join(ref_parts)

            status = "empty"
            if classification == "합계" or (current_brand == "판매금액 총합"):
                status = "formula"

            rows_to_insert.append({
                "report_id": report_id,
                "brand": current_brand or "",
                "pg_store": current_pg or "",
                "classification": classification,
                "amount": None,
                "reference": reference,
                "excel_row": r,
                "status": status,
                "memo": ""
            })

        if rows_to_insert:
            supabase.table("report_rows").insert(rows_to_insert).execute()
    except Exception as e:
        print(f"Error initializing report rows: {e}")


@app.get("/api/reports")
def get_all_reports():
    try:
        res = supabase.table("reports").select("*").order("year", desc=True).order("quarter", desc=True).execute()
        return res.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/reports")
def create_report(payload: CreateReportPayload):
    try:
        check_res = supabase.table("reports").select("*").eq("year", payload.year).eq("quarter", payload.quarter).execute()
        if check_res.data:
            raise HTTPException(status_code=400, detail=f"{payload.year}년 {payload.quarter}분기 보고서가 이미 존재합니다.")

        insert_res = supabase.table("reports").insert({
            "year": payload.year,
            "quarter": payload.quarter,
            "status": "in_progress"
        }).execute()
        report = insert_res.data[0]

        initialize_report_rows(report["id"])
        return report
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/{report_id}")
def get_report_details(report_id: str):
    try:
        report_res = supabase.table("reports").select("*").eq("id", report_id).execute()
        if not report_res.data:
            raise HTTPException(status_code=404, detail="Report not found")
        report = report_res.data[0]

        rows_res = supabase.table("report_rows").select("*").eq("report_id", report_id).order("excel_row", desc=False).execute()
        rows = rows_res.data

        return {
            "report": report,
            "rows": rows
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/rows/{row_id}")
def update_report_row(row_id: str, payload: RowUpdatePayload):
    try:
        row_res = supabase.table("report_rows").select("*").eq("id", row_id).execute()
        if not row_res.data:
            raise HTTPException(status_code=404, detail="Row not found")
        row = row_res.data[0]

        update_data = {}
        if payload.amount is not None:
            update_data["amount"] = payload.amount
            update_data["status"] = "success"
        if payload.memo is not None:
            update_data["memo"] = payload.memo
        if payload.status is not None:
            update_data["status"] = payload.status

        if not update_data:
            return row

        supabase.table("report_rows").update(update_data).eq("id", row_id).execute()

        if row["classification"] == "무통장입금":
            recalculate_bank_transfer(row["report_id"], row["brand"])
        elif row["pg_store"] == "토스페이먼츠" and row["classification"] == "현금영수증 별도발급":
            recalculate_bank_transfer(row["report_id"], row["brand"])

        updated_row_res = supabase.table("report_rows").select("*").eq("id", row_id).execute()
        return updated_row_res.data[0]
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rows/{row_id}/upload")
def upload_and_analyze(
    row_id: str,
    file: UploadFile = File(...),
    file_type: str = Form("standard")
):
    try:
        row_res = supabase.table("report_rows").select("*").eq("id", row_id).execute()
        if not row_res.data:
            raise HTTPException(status_code=404, detail="Row not found")
        row = row_res.data[0]

        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        local_filepath = os.path.join(UPLOAD_DIR, unique_filename)

        with open(local_filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        with open(local_filepath, "rb") as f:
            file_bytes = f.read()

        parsed_amount = None
        custom_reason = None
        if file_ext.lower() in ['.xlsx', '.xls']:
            if file_type in ['bank_income', 'bank_expense']:
                parsed_amount = try_parse_bank_excel(file_bytes, file_type)
            elif row["pg_store"] == "토스페이먼츠":
                parsed_amount = try_parse_toss_excel(file_bytes, row["classification"])
            elif row["pg_store"] and ("네이버" in row["pg_store"] or "스마트스토어" in row["pg_store"]):
                parsed_amount = try_parse_naver_pay_excel(file_bytes, row["classification"])
            elif row["pg_store"] and "KOCES" in row["pg_store"]:
                parsed_amount = try_parse_koces_excel(file_bytes, row["classification"])
            elif row["pg_store"] and "큐텐" in row["pg_store"]:
                parsed_amount = try_parse_qoo10_excel(file_bytes)
            elif row["pg_store"] == "페이팔":
                res_tuple = try_parse_paypal_excel(file_bytes)
                if res_tuple:
                    parsed_amount, custom_reason = res_tuple
            elif row["brand"] == "유튜브":
                res_tuple = try_parse_youtube_excel(file_bytes)
                if res_tuple:
                    parsed_amount, custom_reason = res_tuple

        if parsed_amount is not None:
            reason = custom_reason or f"Excel 파일에서 직접 파싱되었습니다. ({row['brand']} - {row['classification']})"
            analysis_result = {
                "status": "success",
                "amount": parsed_amount,
                "raw_response": reason
            }
        else:
            api_key = get_gemini_key()
            if not api_key:
                raise HTTPException(status_code=400, detail="Gemini API Key가 설정되지 않았습니다.")

            brand = row["brand"]
            pg_store = row["pg_store"]
            classification = row["classification"]
            reference = row["reference"]

            if pg_store == "에이블리":
                if classification == "신용카드 발행":
                    reference = "에이블리 부가세신고 내역 이미지에서 '신용카드 발행' 열의 '총 합계' 금액을 찾아 반환하십시오."
                elif classification == "현금영수증 발행":
                    reference = "에이블리 부가세신고 내역 이미지에서 '현금영수증 발행' 열의 '총 합계' 금액을 찾아 반환하십시오."
                elif classification == "현금 결제":
                    reference = "에이블리 부가세신고 내역 이미지에서 '현금 결제' 열의 '총 합계' 금액을 찾아 반환하십시오."
                elif classification == "휴대폰 결제":
                    reference = "에이블리 부가세신고 내역 이미지에서 '휴대폰 결제' 열의 '총 합계' 금액을 찾아 반환하십시오."
                elif classification == "프로모션 지원금":
                    reference = "에이블리 부가세신고 내역 이미지에서 '프로모션 지원금' 열의 '총 합계' 금액을 찾아 반환하십시오."
                elif classification == "기타":
                    reference = "에이블리 부가세신고 내역 이미지에서 '기타' 하위의 가장 오른쪽 '기타' 열의 '총 합계' 금액을 찾아 반환하십시오."
            elif pg_store and "쿠팡" in pg_store:
                if classification == "신용/체크카드 발행 매출":
                    reference = "쿠팡 부가세신고 매출 내역 이미지에서 '신용/체크카드 발행 매출' 열의 '총합계' 금액을 찾아 반환하십시오."
                elif classification == "현금영수증 발행 매출":
                    reference = "쿠팡 부가세신고 매출 내역 이미지에서 '현금영수증 발행 매출' 열의 '총합계' 금액을 찾아 반환하십시오."
                elif classification == "기타":
                    reference = "쿠팡 부가세신고 매출 내역 이미지에서 '기타' 열의 '총합계' 금액을 찾아 반환하십시오."

            if file_type == 'bank_income':
                classification = "무통장입금 수입 매출"
                reference = "수입 거래내역 엑셀/이미지에서 무통장입금 총 매출 합계를 찾아 반환하십시오."
            elif file_type == 'bank_expense':
                classification = "무통장입금 지출 취소환불"
                reference = "지출 거래내역 엑셀/이미지에서 취소환불 금액 합계를 찾아 반환하십시오."

            supabase.table("report_rows").update({"status": "analyzing"}).eq("id", row_id).execute()

            analysis_result = analyze_document_with_gemini(
                api_key=api_key,
                file_bytes=file_bytes,
                file_name=file.filename,
                mime_type=file.content_type or "",
                brand=brand,
                pg_store=pg_store,
                classification=classification,
                reference=reference
            )

        if analysis_result["status"] == "success":
            amount = analysis_result["amount"]

            update_data = {}
            if file_type == 'bank_income':
                update_data["bank_income"] = amount
                update_data["file_path"] = local_filepath
            elif file_type == 'bank_expense':
                update_data["bank_expense"] = amount
                update_data["file_path_extra"] = local_filepath
            else:
                update_data["amount"] = amount
                update_data["file_path"] = local_filepath
                update_data["status"] = "success"

            update_data["raw_response"] = {"text": analysis_result["raw_response"]}

            supabase.table("report_rows").update(update_data).eq("id", row_id).execute()

            if row["classification"] == "무통장입금":
                recalculate_bank_transfer(row["report_id"], row["brand"])
            elif row["pg_store"] == "토스페이먼츠" and row["classification"] == "현금영수증 별도발급":
                recalculate_bank_transfer(row["report_id"], row["brand"])

            updated_row_res = supabase.table("report_rows").select("*").eq("id", row_id).execute()
            return updated_row_res.data[0]
        else:
            supabase.table("report_rows").update({
                "status": "error",
                "raw_response": {"error": analysis_result.get("error")}
            }).eq("id", row_id).execute()
            raise HTTPException(status_code=500, detail=analysis_result.get("error"))

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def load_historical_sales():
    historical_path = r"c:\Users\damon\Desktop\ANTIGRAVITY\부가세신고\sample\부가세신고 매출자료 정리.xlsx"
    if not os.path.exists(historical_path):
        return []
    try:
        wb = openpyxl.load_workbook(historical_path, data_only=True)
        if '성장그래프' not in wb.sheetnames:
            return []
        sheet = wb['성장그래프']
        data = []
        for r in range(2, sheet.max_row + 1):
            label = sheet.cell(row=r, column=1).value
            sales = sheet.cell(row=r, column=2).value
            if not label or sales is None:
                continue
            label_str = str(label).strip()
            if label_str in ["합계", "계", "이전"]:
                continue
            match = re.match(r"(\d{4})년\s*(\d)분기", label_str)
            if match:
                year = int(match.group(1))
                quarter = int(match.group(2))
                if year < 2026 or (year == 2026 and quarter < 2):
                    data.append({
                        "year": year,
                        "quarter": quarter,
                        "quarter_label": f"{year}년 {quarter}분기",
                        "sales": int(sales)
                    })
        return sorted(data, key=lambda x: (x["year"], x["quarter"]))
    except Exception as e:
        print(f"Error loading historical sales from excel: {e}")
        return []


@app.get("/api/analytics")
def get_sales_analytics():
    try:
        reports_res = supabase.table("reports").select("*").execute()
        reports = reports_res.data or []

        rows_res = supabase.table("report_rows").select("*").execute()
        all_rows = rows_res.data or []

        report_rows_map = {}
        for row in all_rows:
            rid = row["report_id"]
            if rid not in report_rows_map:
                report_rows_map[rid] = []
            report_rows_map[rid].append(row)

        sales_brands = ['머드스콘', '오터', '위시', '유튜브', '페이팔', '인스타그램']

        all_quarters = []
        breakdowns = {}

        historical_data = load_historical_sales()
        for hist in historical_data:
            rep_id = f"historical_{hist['year']}_{hist['quarter']}"
            all_quarters.append({
                "report_id": rep_id,
                "year": hist["year"],
                "quarter": hist["quarter"],
                "quarter_label": hist["quarter_label"],
                "sales": hist["sales"]
            })
            breakdowns[rep_id] = {
                "totalSales": hist["sales"],
                "growthRate": 0.0,
                "brandBreakdown": [],
                "pgBreakdown": [],
                "topBrand": {"name": "-", "value": 0, "percentage": 0},
                "topPg": {"name": "-", "value": 0, "percentage": 0}
            }

        for rep in reports:
            if rep["year"] < 2026 or (rep["year"] == 2026 and rep["quarter"] < 2):
                continue

            rep_id = rep["id"]
            rep_rows = report_rows_map.get(rep_id, [])

            filtered_rows = [
                r for r in rep_rows
                if r["brand"] in sales_brands
                and r["classification"] != "합계"
                and r["brand"] != "판매금액 총합"
                and r["amount"] is not None
            ]

            total_sales = sum(r["amount"] for r in filtered_rows)

            brand_map = {}
            pg_map = {}

            for r in filtered_rows:
                b = r["brand"]
                p = r["pg_store"]
                amt = r["amount"]

                brand_map[b] = brand_map.get(b, 0) + amt
                pg_map[p] = pg_map.get(p, 0) + amt

            brand_breakdown = [
                {
                    "name": b,
                    "value": val,
                    "percentage": round((val / total_sales * 100), 1) if total_sales > 0 else 0
                }
                for b, val in brand_map.items()
            ]
            brand_breakdown.sort(key=lambda x: x["value"], reverse=True)

            pg_breakdown = [
                {
                    "name": p,
                    "value": val,
                    "percentage": round((val / total_sales * 100), 1) if total_sales > 0 else 0
                }
                for p, val in pg_map.items()
            ]
            pg_breakdown.sort(key=lambda x: x["value"], reverse=True)

            top_brand = brand_breakdown[0] if brand_breakdown else {"name": "-", "value": 0, "percentage": 0}
            top_pg = pg_breakdown[0] if pg_breakdown else {"name": "-", "value": 0, "percentage": 0}

            all_quarters.append({
                "report_id": rep_id,
                "year": rep["year"],
                "quarter": rep["quarter"],
                "quarter_label": f"{rep['year']}년 {rep['quarter']}분기",
                "sales": total_sales
            })

            breakdowns[rep_id] = {
                "totalSales": total_sales,
                "growthRate": 0.0,
                "brandBreakdown": brand_breakdown,
                "pgBreakdown": pg_breakdown,
                "topBrand": top_brand,
                "topPg": top_pg
            }

        sorted_quarters = sorted(all_quarters, key=lambda x: (x["year"], x["quarter"]))

        previous_sales = None
        for item in sorted_quarters:
            sales = item["sales"]
            growth_rate = 0.0
            if previous_sales is not None and previous_sales > 0:
                growth_rate = round(((sales - previous_sales) / previous_sales) * 100, 1)
            previous_sales = sales

            rep_id = item["report_id"]
            if rep_id in breakdowns:
                breakdowns[rep_id]["growthRate"] = growth_rate

        return {
            "trends": sorted_quarters,
            "breakdowns": breakdowns
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/reports/{report_id}/export")
def export_report(report_id: str):
    try:
        report_res = supabase.table("reports").select("*").eq("id", report_id).execute()
        if not report_res.data:
            raise HTTPException(status_code=404, detail="Report not found")
        report = report_res.data[0]

        rows_res = supabase.table("report_rows").select("*").eq("report_id", report_id).order("excel_row", desc=False).execute()
        rows = rows_res.data

        return export_report_excel(report, rows, TEMPLATE_PATH, UPLOAD_DIR)
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/settings")
def get_settings():
    try:
        res = supabase.table("settings").select("*").execute()
        settings_dict = {}
        if res.data:
            for item in res.data:
                settings_dict[item["key"]] = item["value"]
        if "gemini_api_key" not in settings_dict and os.getenv("GEMINI_API_KEY"):
            settings_dict["gemini_api_key"] = os.getenv("GEMINI_API_KEY")
        return settings_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/settings")
def save_setting(payload: SettingPayload):
    try:
        res = supabase.table("settings").upsert({
            "key": "gemini_api_key",
            "value": payload.value
        }).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
