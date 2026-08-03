import { makeAutoObservable } from 'mobx';
import {
  api,
  CreateRecurringInput,
  DayDetail,
  DayInfo,
  EntryType,
  RecurringRule,
} from '../api/client';
import { HEADER_H, monthLabel, WEEK_H, Week, weeksForMonth } from '../utils/calendar';

export class FinanceStore {
  dayInfo = new Map<string, DayInfo>();
  dayDetail = new Map<string, DayDetail>();
  recurring: RecurringRule[] = [];
  expenseNoteFreq = new Map<string, number>();
  incomeNoteFreq = new Map<string, number>();
  loadedFrom: string | null = null;
  loadedTo: string | null = null;
  loading = false;
  selectedDate: string | null = null;

  startYM = this.currentYM;
  endYM = this.currentYM;

  private loadSeq = 0;

  constructor() {
    makeAutoObservable(this);
  }

  get currentYM(): number {
    const n = new Date();
    return n.getFullYear() * 12 + n.getMonth();
  }

  get minStartYM(): number {
    return this.currentYM;
  }

  get maxEndYM(): number {
    return this.currentYM + 12;
  }

  get weeks(): Week[] {
    const ws: Week[] = [];
    for (let ym = this.startYM; ym <= this.endYM; ym++) {
      const y = Math.floor(ym / 12);
      const m = ym % 12;
      const mw = weeksForMonth(y, m);
      mw.forEach((w, i) => {
        ws.push({
          ...w,
          ym,
          isMonthStart: i === 0,
          monthLabel: i === 0 ? monthLabel(y, m) : null,
        });
      });
    }
    return ws;
  }

  extendForward(): void {
    if (this.endYM >= this.maxEndYM) return;
    this.endYM = Math.min(this.endYM + 2, this.maxEndYM);
  }

  extendBack(): number {
    const old = this.startYM;
    const target = Math.max(old - 2, this.minStartYM);
    if (target === old) return 0;
    this.startYM = target;
    return this.monthsHeight(target, old - 1);
  }

  monthsHeight(fromYM: number, toYM: number): number {
    let total = 0;
    for (let ym = fromYM; ym <= toYM; ym++) {
      const y = Math.floor(ym / 12);
      const m = ym % 12;
      total += weeksForMonth(y, m).length * WEEK_H + HEADER_H;
    }
    return total;
  }

  async loadRange(from: string, to: string): Promise<void> {
    const seq = ++this.loadSeq;
    this.loading = true;
    this.loadedFrom = from;
    this.loadedTo = to;
    try {
      const res = await api.getDays(from, to);
      if (seq !== this.loadSeq) return;
      this.dayInfo = new Map(res.days.map((d) => [d.date, d]));
    } finally {
      if (seq === this.loadSeq) this.loading = false;
    }
  }

  async refreshRange(): Promise<void> {
    if (this.loadedFrom && this.loadedTo) {
      await this.loadRange(this.loadedFrom, this.loadedTo);
    }
  }

  async loadDetail(date: string): Promise<void> {
    const det = await api.getDayDetail(date);
    this.dayDetail.set(date, det);
  }

  async loadRecurring(): Promise<void> {
    this.recurring = await api.getRecurring();
  }

  /** Частота уже использованных имён трат/доходов (для подсказок в поле «Название»). */
  async loadNotes(): Promise<void> {
    const entries = await api.getAllPlanned();
    const expense = new Map<string, number>();
    const income = new Map<string, number>();
    const add = (note: string, type: EntryType) => {
      const key = note.trim();
      if (!key) return;
      const map = type === 'expense' ? expense : income;
      map.set(key, (map.get(key) ?? 0) + 1);
    };
    for (const e of entries) {
      if (e.note) add(e.note, e.type);
    }
    for (const r of this.recurring) {
      if (r.note) add(r.note, r.type);
    }
    this.expenseNoteFreq = expense;
    this.incomeNoteFreq = income;
  }

  suggestions(type: EntryType, limit = 8): string[] {
    const map = type === 'expense' ? this.expenseNoteFreq : this.incomeNoteFreq;
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([n]) => n);
  }

  async setBalance(date: string, amount: number): Promise<void> {
    await api.setBalance(date, amount);
    await this.refreshRange();
    await this.loadDetail(date);
  }

  async clearBalance(date: string): Promise<void> {
    await api.deleteBalance(date);
    await this.refreshRange();
    await this.loadDetail(date);
  }

  async addPlanned(date: string, type: 'expense' | 'income', amount: number, note?: string): Promise<void> {
    await api.addPlanned({ date, type, amount, note });
    await this.loadDetail(date);
    await this.refreshRange();
    await this.loadNotes();
  }

  /** Создать или обновить запись по дате + типу + названию (не плодит дубли). */
  async upsertPlanned(type: EntryType, date: string, amount: number, note: string): Promise<void> {
    const existing = await api.getPlanned(date);
    const found = existing.find((e) => e.type === type && e.note === note);
    if (found) {
      await api.updatePlanned(found.id, { amount });
    } else {
      await api.addPlanned({ date, type, amount, note });
    }
    await this.loadDetail(date);
    await this.refreshRange();
    await this.loadNotes();
  }

  async deletePlanned(id: number, date: string): Promise<void> {
    await api.deletePlanned(id);
    await this.loadDetail(date);
    await this.refreshRange();
    await this.loadNotes();
  }

  /** Обмен всех разовых планов между двумя днями (повторяющиеся не затрагиваются). */
  async swapPlanned(from: string, to: string): Promise<void> {
    await api.swapPlanned(from, to);
    await this.loadDetail(from);
    await this.loadDetail(to);
    await this.refreshRange();
  }

  /** Копирование всех разовых планов из дня from в день to (источник не трогается). */
  async clonePlanned(from: string, to: string): Promise<void> {
    await api.clonePlanned(from, to);
    await this.loadDetail(to);
    await this.refreshRange();
  }

  async addRecurring(input: CreateRecurringInput): Promise<void> {
    await api.addRecurring(input);
    await this.loadRecurring();
    await this.refreshRange();
    await this.loadNotes();
  }

  async updateRecurring(id: number, input: Partial<CreateRecurringInput>): Promise<void> {
    await api.updateRecurring(id, input);
    await this.loadRecurring();
    await this.refreshRange();
    await this.loadNotes();
  }

  async deleteRecurring(id: number): Promise<void> {
    await api.deleteRecurring(id);
    await this.loadRecurring();
    await this.refreshRange();
    await this.loadNotes();
  }
}

export const store = new FinanceStore();
