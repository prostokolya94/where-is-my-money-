import { RecurringRule } from './entities/recurring-rule.entity';

export function toDateStr(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toDateStr(d);
}

export function ruleMatchesDate(rule: RecurringRule, date: string): boolean {
  if (date < rule.startDate) return false;
  if (rule.endDate && date > rule.endDate) return false;

  const dt = parseDate(date);
  const weekday = (dt.getUTCDay() + 6) % 7; // 0=Пн
  const dom = dt.getUTCDate();
  const month = dt.getUTCMonth() + 1;
  const daysInMonth = new Date(Date.UTC(dt.getUTCFullYear(), month, 0)).getUTCDate();
  const targetDay = Math.min(rule.dayOfMonth ?? 1, daysInMonth);

  switch (rule.frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return rule.dayOfWeek === weekday;
    case 'monthly':
      return dom === targetDay;
    case 'yearly':
      return month === rule.monthOfYear && dom === targetDay;
    default:
      return false;
  }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
