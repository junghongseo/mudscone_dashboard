export type BrandId = 'overview' | 'mudscone' | 'oatter' | 'wysh' | 'ledger' | 'production' | 'vat';

export type ERRCQuadrant = 'E' | 'R_reduce' | 'R_raise' | 'C';

export interface ERRCItem {
  id: string;
  title: string;
  description?: string;
  quadrant: ERRCQuadrant;
}

export interface StrategyFactor {
  id: string;
  name: string;
  errcQuadrant?: ERRCQuadrant;
}

export interface BusinessItem {
  id: string;
  name: string;
  isSelf: boolean;
  color?: string;
  tagline?: string;
}

export interface RevenueGoal {
  targetAmount: number;
  currentAmount: number;
  year: number;
}

export interface BrandStrategyData {
  id: string;
  name: string;
  englishName: string;
  tagline: string;
  themeColor: string;
  revenue: RevenueGoal;
  businesses: BusinessItem[];
  factors: StrategyFactor[];
  errcItems: ERRCItem[];
  scores: Record<string, number>;
}
