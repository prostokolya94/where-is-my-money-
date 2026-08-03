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

export interface CustomPlanRow {
  id: number;
  planId: number;
  date: string;
  amount: number;
  overrideBefore: number | null;
  overrideSnapshot: number | null;
}

export interface CustomPlan {
  id: number;
  title: string;
  label: string;
  initialBalance: number;
  order: number;
  rows: CustomPlanRow[];
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

  updatePlanned: (id: number, d: Partial<{ date: string; type: EntryType; amount: number; note?: string }>) =>
    req<PlannedEntry>('PATCH', `/api/planned/${id}`, d),

  swapPlanned: (from: string, to: string) =>
    req<{ ok: boolean }>('POST', '/api/planned/swap', { from, to }),

  clonePlanned: (from: string, to: string) =>
    req<{ ok: boolean; copied: number }>('POST', '/api/planned/clone', { from, to }),

  getRecurring: () => req<RecurringRule[]>('GET', '/api/recurring'),

  addRecurring: (d: CreateRecurringInput) => req<RecurringRule>('POST', '/api/recurring', d),

  updateRecurring: (id: number, d: Partial<CreateRecurringInput>) =>
    req<RecurringRule>('PATCH', `/api/recurring/${id}`, d),

  deleteRecurring: (id: number) => req<{ ok: boolean }>('DELETE', `/api/recurring/${id}`),

  getCustomPlans: () => req<CustomPlan[]>('GET', '/api/custom-plans'),

  addCustomPlan: (d: { title: string; label?: string; initialBalance?: number }) =>
    req<CustomPlan>('POST', '/api/custom-plans', d),

  updateCustomPlan: (id: number, d: Partial<{ title: string; label: string; initialBalance: number }>) =>
    req<CustomPlan>('PATCH', `/api/custom-plans/${id}`, d),

  deleteCustomPlan: (id: number) => req<{ ok: boolean }>('DELETE', `/api/custom-plans/${id}`),

  addCustomPlanRow: (planId: number, d: { date: string; amount: number }) =>
    req<CustomPlanRow>('POST', `/api/custom-plans/${planId}/rows`, d),

  updateCustomPlanRow: (
    rowId: number,
    d: Partial<{ date: string; amount: number; overrideBefore: number | null; overrideSnapshot: number | null }>,
  ) => req<CustomPlanRow>('PATCH', `/api/custom-plans/rows/${rowId}`, d),

  deleteCustomPlanRow: (rowId: number) => req<{ ok: boolean }>('DELETE', `/api/custom-plans/rows/${rowId}`),
};
