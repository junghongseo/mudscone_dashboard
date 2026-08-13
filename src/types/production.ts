export interface ProductionItem {
  product_name: string;
  raw_name?: string;
  category: '삼각' | '바' | '미니큐브';
  batch_size: number;
  min_bumper_qty: number;
  is_confirmed?: boolean;
  parent_scone_name?: string;
  order_qty: number;
  extra_qty: number;
  required_qty: number;
  carryover_qty: number;
  production_qty: number;
  base_panels?: number;
  panels: number;
  is_bumper_applied?: boolean;
  excess_qty: number;
  halfpack_order_qty?: number;
  halfpack_panels?: number;
  is_halfpack_carryover?: boolean;
}

export interface ProductCatalogItem {
  id?: string;
  name: string;
  category: '삼각' | '바' | '미니큐브';
  batch_size: number;
  min_bumper_qty: number;
  is_confirmed?: boolean;
  parent_scone_name?: string;
}

export interface SetItemComponent {
  id?: string;
  set_id?: string;
  product_name: string;
  quantity: number;
}

export interface SetProductCatalogItem {
  set_name: string;
  components: SetItemComponent[];
}

export interface SetCatalogItem {
  id?: string;
  name: string;
  description?: string;
  is_confirmed?: boolean;
  items: SetItemComponent[];
}

export interface SetBreakdownSummary {
  set_name: string;
  set_order_qty: number;
  components: SetItemComponent[];
}
