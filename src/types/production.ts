export interface ProductionItem {
  id?: string;
  product_name: string;
  raw_name?: string;
  category: '삼각' | '바' | '미니큐브' | '미니쉐이크' | '스틱' | '서비스' | '기타';
  batch_size: number;
  min_bumper_qty?: number;
  order_qty: number;
  extra_qty: number;
  required_qty: number;
  carryover_qty: number;
  production_qty: number;
  base_panels: number;
  panels: number;
  is_bumper_applied: boolean;
  excess_qty: number;
  halfpack_order_qty?: number;
  halfpack_panels?: number;
  is_confirmed?: boolean;
  parent_scone_name?: string;
  oven_number?: string;
  heavy_cream_per_panel?: number;
  is_set_component?: boolean;
  sort_order?: number;
  is_separator?: boolean;
}

export interface ProductCatalogItem {
  id?: string;
  name: string;
  category: '삼각' | '바' | '미니큐브' | '미니쉐이크' | '스틱' | '서비스' | '기타';
  batch_size: number;
  min_bumper_qty?: number;
  is_confirmed?: boolean;
  parent_scone_name?: string;
  oven_number?: string;
  heavy_cream_per_panel?: number;
  sort_order?: number;
}

export interface SetItemComponent {
  id?: string;
  set_id?: string;
  product_name: string;
  quantity: number;
}

export interface SetCatalogItem {
  id?: string;
  set_name: string;
  description?: string;
  is_confirmed?: boolean;
  components: SetItemComponent[];
}

export interface SetBreakdownSummary {
  set_name: string;
  set_order_qty: number;
  components: SetItemComponent[];
}
