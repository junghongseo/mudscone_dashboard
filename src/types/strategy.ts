export type BrandId = 'overview' | 'mudscone' | 'oatter' | 'wysh' | 'ledger';

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
  description?: string;
}

export interface BusinessItem {
  id: string;
  name: string;
  color: string;
  isSelf: boolean;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  markerSymbol?: 'square' | 'triangle' | 'diamond' | 'circle';
}

export interface RevenueGoal {
  year: number;
  targetAmount: number;
  currentAmount: number;
  unit: string;
}

export interface BrandStrategyData {
  id: BrandId;
  name: string;
  englishName: string;
  tagline: string;
  themeColor: string;
  accentColor: string;
  errcItems: ERRCItem[];
  factors: StrategyFactor[];
  businesses: BusinessItem[];
  scores: Record<string, number>;
  revenue: RevenueGoal;
}
