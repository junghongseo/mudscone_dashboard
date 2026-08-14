import openpyxl
import math
import re
import io
from typing import List, Dict, Any

def clean_product_name(name: str) -> str:
    """Strips invoice-ordering prefixes like '---', '-', spaces from product names."""
    if not name:
        return ""
    cleaned = re.sub(r'^[-_\s]+', '', str(name)).strip()
    return cleaned

def normalize_scone_key(name: str) -> str:
    if not name:
        return ""
    s = re.sub(r'\[.*?\]', '', str(name))
    s = re.sub(r'\(.*?\)', '', s)
    for kw in ['스틱', '스콘', '3팩', '1팩', '하프팩', '미니큐브', '미니쉐이크', '서비스', '팩']:
        s = s.replace(kw, '')
    return re.sub(r'\s+', '', s).strip().lower()

def parse_production_excel(file_contents: bytes, set_catalog_map: Dict[str, Any] = None, catalog_dict: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Parses EasyAdmin production order excel file bytes.
    Detects Product Name and Option columns.
    Combines product name and option text into raw full item names.
    Decomposes registered Set Products into single scone components.
    Aggregates order quantities by product name and categorizes items.
    """
    workbook = openpyxl.load_workbook(filename=io.BytesIO(file_contents), data_only=True)
    target_sheet = workbook.active

    # 1. Locate header row and target columns dynamically
    header_row_idx = None
    product_col_idx = None
    option_col_idx = None
    qty_col_idx = None

    for r in range(1, min(10, target_sheet.max_row + 1)):
        row_str = [str(target_sheet.cell(r, c).value or '').strip() for c in range(1, min(25, target_sheet.max_column + 1))]
        for idx, val in enumerate(row_str):
            if val in ['상품명', '품목명']:
                product_col_idx = idx + 1
            elif val == '공급처상품명' and not product_col_idx:
                product_col_idx = idx + 1
            elif val in ['옵션', '옵션명', '품목옵션', '공급처옵션명', '옵션정보']:
                option_col_idx = idx + 1
            elif val in ['수량', '주문수량', '품목수량']:
                qty_col_idx = idx + 1

        if product_col_idx and qty_col_idx:
            header_row_idx = r
            break

    # Fallback default positions if headers not found by exact name
    if not product_col_idx:
        product_col_idx = 5  # Column E in summary format
    if not option_col_idx:
        option_col_idx = 6   # Column F in summary format
    if not qty_col_idx:
        qty_col_idx = 17     # Column Q in summary format
    if not header_row_idx:
        header_row_idx = 1

    # 2. Aggregate order quantities by clean product name & handle Set / Halfpack / MiniShake / Stick / Service / Misc
    product_orders: Dict[str, Dict[str, Any]] = {}
    set_breakdowns: List[Dict[str, Any]] = []

    set_map = set_catalog_map or {}

    def get_category_info(clean_name: str):
        c_lower = clean_name.lower()
        is_service = '서비스' in clean_name
        is_misc = any(k in c_lower for k in ['요프', '요거트', 'opp', '대파', '피넛', '스무스', '크런치', '스타터팩', '이매진', '유크림', '기타'])
        is_stick = not is_service and not is_misc and '스틱' in clean_name
        is_shake = not is_service and not is_misc and not is_stick and ('미니쉐이크' in clean_name or '쉐이크' in clean_name)
        is_halfpack = not is_service and not is_misc and not is_stick and not is_shake and ('하프팩' in clean_name or '미니큐브' in clean_name)
        is_bar = not is_service and not is_misc and '바' in clean_name and ('스콘' not in clean_name or '바스콘' in clean_name or clean_name.endswith('바'))
        
        if is_service:
            return '서비스', 1
        elif is_misc:
            return '기타', 1
        elif is_stick:
            return '스틱', 9  # 9 packs per panel (1 EasyAdmin qty = 3 packs)
        elif is_shake:
            return '미니쉐이크', 4  # 4 bags per panel (18 pieces per bag)
        elif is_halfpack:
            return '미니큐브', 2  # 2 bags per panel (36 pieces per bag)
        elif is_bar:
            return '바', 10
        else:
            return '삼각', 8

    for r in range(header_row_idx + 1, target_sheet.max_row + 1):
        raw_name = target_sheet.cell(r, product_col_idx).value
        raw_option = target_sheet.cell(r, option_col_idx).value if option_col_idx else None
        raw_qty = target_sheet.cell(r, qty_col_idx).value

        if not raw_name:
            continue

        clean_name = clean_product_name(str(raw_name))
        if not clean_name:
            continue

        # Option text handling
        opt_str = str(raw_option).strip() if raw_option and str(raw_option).strip() not in ['None', 'none', '없음', '기본', '단품'] else ''
        full_clean_name = f"{clean_name} ({opt_str})" if opt_str else clean_name

        try:
            qty = int(raw_qty) if raw_qty is not None else 0
        except (ValueError, TypeError):
            qty = 0

        if qty <= 0:
            continue

        # Check if item matches a registered Set Product (exact match only for manager control & safety)
        if full_clean_name in set_map or clean_name in set_map:
            s_name = full_clean_name if full_clean_name in set_map else clean_name
            set_info = set_map[s_name]
            if isinstance(set_info, list):
                components = set_info
            elif isinstance(set_info, dict):
                components = set_info.get("items", []) or set_info.get("components", [])
            else:
                components = []
            
            set_breakdowns.append({
                "set_name": s_name,
                "set_order_qty": qty,
                "components": components,
            })

            # Multiply set order qty by component qty and add to component scones
            for comp in components:
                comp_name = comp["product_name"]
                comp_qty = comp.get("quantity", 1) * qty
                category, batch_size = get_category_info(comp_name)

                if comp_name not in product_orders:
                    product_orders[comp_name] = {
                        "raw_name": comp_name,
                        "order_qty": 0,
                        "category": category,
                        "batch_size": batch_size,
                        "is_set_component": True
                    }
                product_orders[comp_name]["order_qty"] += comp_qty
        else:
            # Single Scone / Halfpack / MiniShake / Stick / Service / Misc Item
            category, batch_size = get_category_info(full_clean_name)
            
            # If a single stick item name contains '3팩', each order unit contains 3 packs of sticks
            multiplier = 3 if (category == '스틱' and '3팩' in full_clean_name) else 1
            calculated_qty = qty * multiplier

            if full_clean_name not in product_orders:
                product_orders[full_clean_name] = {
                    "raw_name": f"{raw_name} [{opt_str}]" if opt_str else str(raw_name).strip(),
                    "order_qty": 0,
                    "category": category,
                    "batch_size": batch_size,
                    "is_set_component": True if category == '스틱' else False
                }
            product_orders[full_clean_name]["order_qty"] += calculated_qty

    # 3. Calculate batches, panels, bumper, and excess cleanly
    result = []
    for clean_name, item in product_orders.items():
        category = item["category"]
        batch_size = item["batch_size"]
        order_qty = item["order_qty"]
        is_set_comp = item.get("is_set_component", False)

        min_bumper_qty = 2
        extra_qty = 0
        carryover_qty = 0

        required_qty = order_qty + extra_qty
        production_qty = max(0, required_qty - carryover_qty)

        if category == '스틱':
            base_panels = math.ceil(production_qty / 9.0) if production_qty > 0 else 0
            excess_qty = (base_panels * 9) - production_qty
            is_bumper_applied = False
            panels = base_panels
        elif category == '미니쉐이크':
            base_panels = math.ceil(production_qty / 4.0) if production_qty > 0 else 0
            excess_qty = (base_panels * 4) - production_qty
            is_bumper_applied = False
            panels = base_panels
        elif category == '미니큐브':
            base_panels = math.ceil(production_qty / 2.0) if production_qty > 0 else 0
            excess_qty = (base_panels * 2) - production_qty
            is_bumper_applied = False
            panels = base_panels
        elif category in ['서비스', '기타']:
            base_panels = 0
            panels = 0
            is_bumper_applied = False
            excess_qty = 0
        else:
            base_panels = math.ceil(production_qty / float(batch_size)) if production_qty > 0 and batch_size > 0 else 0
            base_excess = (base_panels * batch_size) - production_qty

            if production_qty > 0 and base_excess < min_bumper_qty:
                panels = base_panels + 1
                is_bumper_applied = True
                excess_qty = (panels * batch_size) - production_qty
            else:
                panels = base_panels
                is_bumper_applied = False
                excess_qty = base_excess

        result.append({
            "product_name": clean_name,
            "raw_name": item["raw_name"],
            "category": category,
            "batch_size": batch_size,
            "min_bumper_qty": min_bumper_qty,
            "parent_scone_name": None,
            "order_qty": order_qty,
            "extra_qty": extra_qty,
            "required_qty": required_qty,
            "carryover_qty": carryover_qty,
            "production_qty": production_qty,
            "base_panels": base_panels,
            "panels": panels,
            "is_bumper_applied": is_bumper_applied,
            "excess_qty": excess_qty,
            "halfpack_order_qty": order_qty if category == '미니큐브' else 0,
            "halfpack_panels": round(order_qty / 2.0, 1) if category == '미니큐브' else 0,
            "is_set_component": is_set_comp,
        })

    return {
        "status": "success",
        "items": result,
        "set_breakdowns": set_breakdowns
    }
