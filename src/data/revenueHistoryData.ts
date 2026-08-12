import rawData from './revenueHistoryData.json';

export interface DailyRevenueRecord {
  date: string;
  year: number;
  mudscone: number;
  oatter: number;
  wysh: number;
  mudsanghoe: number;
  total: number;
  channels: {
    mudscone: Record<string, number>;
    oatter: Record<string, number>;
    wysh: Record<string, number>;
  };
}

export const REVENUE_HISTORY_DATA: DailyRevenueRecord[] = rawData as DailyRevenueRecord[];
