export interface VatReport {
  id: string;
  year: number;
  quarter: number;
  created_at?: string;
  updated_at?: string;
}

export interface VatReportRow {
  id: string;
  report_id: string;
  brand: string;
  pg_store: string;
  classification: string;
  amount: number | null;
  reference?: string;
  excel_row?: number;
  status: 'empty' | 'success' | 'formula' | 'error';
  memo?: string;
  bank_income?: number;
  bank_expense?: number;
  bank_toss_receipt?: number;
  bank_koces_receipt?: number;
  created_at?: string;
  updated_at?: string;
}

export interface VatAnalyticsData {
  reports: VatReport[];
  totals_by_quarter: Record<string, number>;
  brand_breakdown: Record<string, Record<string, number>>;
}
