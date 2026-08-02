import { makeAutoObservable } from 'mobx';
import {
  api,
  CreateRecurringInput,
  DayDetail,
  DayInfo,
  RecurringRule,
} from '../api/client';
import { HEADER_H, monthLabel, WEEK_H, Week, weeksForMonth } from '../utils/calendar';

export class FinanceStore {
  dayInfo = new Map<string, DayInfo>();
  dayDetail = new Map<string, DayDetail>();
  recurring: RecurringRule[] = [];
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
  }

  async deletePlanned(id: number, date: string): Promise<void> {
    await api.deletePlanned(id);
    await this.loadDetail(date);
    await this.refreshRange();
  }

  async addRecurring(input: CreateRecurringInput): Promise<void> {
    await api.addRecurring(input);
    await this.loadRecurring();
    await this.refreshRange();
  }

  async updateRecurring(id: number, input: Partial<CreateRecurringInput>): Promise<void> {
    await api.updateRecurring(id, input);
    await this.loadRecurring();
    await this.refreshRange();
  }

  async deleteRecurring(id: number): Promise<void> {
    await api.deleteRecurring(id);
    await this.loadRecurring();
    await this.refreshRange();
  }
}

export const store = new FinanceStore();
