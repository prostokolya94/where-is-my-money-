export const WEEK_H = 112;
export const HEADER_H = 46;

export function toDateStr(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
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

export function todayStr(): string {
  return toDateStr(new Date());
}

export function isToday(s: string): boolean {
  return s === todayStr();
}

export function dateLabel(s: string): string {
  const d = parseDate(s);
  const cap = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
  return cap(d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }));
}

export function monthLabel(y: number, m: number): string {
  return new Date(Date.UTC(y, m, 1)).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

export interface Week {
  ym: number;
  isMonthStart: boolean;
  monthLabel: string | null;
  weekStart: Date | null;
  cells: (Date | null)[];
}

export function weeksForMonth(y: number, m: number): Omit<Week, 'ym' | 'isMonthStart' | 'monthLabel'>[] {
  const first = new Date(Date.UTC(y, m, 1));
  const last = new Date(Date.UTC(y, m + 1, 0));
  const startCol = (first.getUTCDay() + 6) % 7; // понедельник = 0
  const daysInMonth = last.getUTCDate();
  const weekCount = Math.ceil((startCol + daysInMonth) / 7);
  const weeks: Omit<Week, 'ym' | 'isMonthStart' | 'monthLabel'>[] = [];
  let day = 1;
  for (let w = 0; w < weekCount; w++) {
    const cells: (Date | null)[] = [];
    let weekStart: Date | null = null;
    for (let c = 0; c < 7; c++) {
      const idx = w * 7 + c;
      if (idx >= startCol && day <= daysInMonth) {
        const dt = new Date(Date.UTC(y, m, day));
        cells.push(dt);
        if (!weekStart) weekStart = dt;
        day++;
      } else {
        cells.push(null);
      }
    }
    weeks.push({ weekStart, cells });
  }
  return weeks;
}

export function fmtMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const sign = n < 0 ? '−' : '';
  return (
    sign +
    Math.abs(Math.round(n * 100) / 100).toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
  );
}
