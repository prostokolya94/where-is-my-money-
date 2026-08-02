export type EntryType = 'expense' | 'income';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DayInfo {
  date: string;
  plannedExpense: number;
  plannedIncome: number;
  plannedBalance: number | null;
  actualBalance: number | null;
}

export interface PlannedEntry {
  id: number;
  date: string;
  type: EntryType;
  amount: number;
  note: string | null;
}

export interface RecurringRule {
  id: number;
  type: EntryType;
  amount: number;
  note: string | null;
  frequency: Frequency;
  startDate: string;
  endDate: string | null;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  monthOfYear: number | null;
}

export interface DayDetail extends DayInfo {
  entries: PlannedEntry[];
  matchingRules: { id: number; type: EntryType; amount: number; note: string | null }[];
}

export interface CreateRecurringInput {
  type: EntryType;
  amount: number;
  note?: string;
  frequency: Frequency;
  startDate: string;
  endDate?: string | null;
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
}

async function req<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `Ошибка ${res.status}`;
    try {
      const j = await res.json();
      if (Array.isArray(j.message)) msg = j.message.join('; ');
      else if (j.message) msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getDays: (from: string, to: string) =>
    req<{ days: DayInfo[] }>('GET', `/api/days?from=${from}&to=${to}`),

  getDayDetail: (date: string) => req<DayDetail>('GET', `/api/days/${date}`),

  setBalance: (date: string, amount: number) =>
    req<DayInfo>('PUT', `/api/days/${date}`, { amount }),

  deleteBalance: (date: string) => req<{ ok: boolean }>('DELETE', `/api/days/${date}`),

  getPlanned: (date: string) => req<PlannedEntry[]>('GET', `/api/planned?date=${date}`),

  getAllPlanned: () => req<PlannedEntry[]>('GET', '/api/planned'),

  addPlanned: (d: { date: string; type: EntryType; amount: number; note?: string }) =>
    req<PlannedEntry>('POST', '/api/planned', d),

  deletePlanned: (id: number) => req<{ ok: boolean }>('DELETE', `/api/planned/${id}`),

  getRecurring: () => req<RecurringRule[]>('GET', '/api/recurring'),

  addRecurring: (d: CreateRecurringInput) => req<RecurringRule>('POST', '/api/recurring', d),

  updateRecurring: (id: number, d: Partial<CreateRecurringInput>) =>
    req<RecurringRule>('PATCH', `/api/recurring/${id}`, d),

  deleteRecurring: (id: number) => req<{ ok: boolean }>('DELETE', `/api/recurring/${id}`),
};
