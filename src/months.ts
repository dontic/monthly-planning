export type Month = {
  key: string;
  label: string;
  year: number;
  /** 0-based month index, as in Date#getMonth */
  month: number;
};

export const monthKey = (year: number, month: number) => `${year}-${String(month + 1).padStart(2, '0')}`;

export const currentMonthKey = (d = new Date()) => monthKey(d.getFullYear(), d.getMonth());

export { planningYearStart } from '../shared/cycle';

export function planningMonths(startYear: number): Month[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = (8 + i) % 12;
    const year = startYear + (8 + i >= 12 ? 1 : 0);
    const label = new Date(year, month, 1).toLocaleString('en', { month: 'short' });
    return { key: monthKey(year, month), label, year, month };
  });
}
