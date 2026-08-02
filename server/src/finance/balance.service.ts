import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { addDays, round2, ruleMatchesDate } from './balance.util';
import { DayBalance } from './entities/day-balance.entity';
import { PlannedEntry } from './entities/planned-entry.entity';
import { RecurringRule } from './entities/recurring-rule.entity';

export interface DayInfo {
  date: string;
  plannedExpense: number;
  plannedIncome: number;
  plannedBalance: number | null;
  actualBalance: number | null;
}

export interface DayDetail extends DayInfo {
  entries: PlannedEntry[];
  matchingRules: { id: number; type: 'expense' | 'income'; amount: number; note: string | null }[];
}

@Injectable()
export class BalanceService {
  constructor(
    @InjectRepository(DayBalance)
    private readonly dayBalanceRepo: Repository<DayBalance>,
    @InjectRepository(PlannedEntry)
    private readonly plannedRepo: Repository<PlannedEntry>,
    @InjectRepository(RecurringRule)
    private readonly recurringRepo: Repository<RecurringRule>,
  ) {}

  /**
   * Расчёт планируемого остатка для каждого дня диапазона.
   * Цепочка: остаток(d) = фактический остаток(d) если он зафиксирован,
   * иначе остаток(d-1) - расход(d) + доход(d).
   */
  async computeRange(from: string, to: string): Promise<DayInfo[]> {
    const anchor = await this.dayBalanceRepo.findOne({
      where: { date: LessThanOrEqual(from) },
      order: { date: 'DESC' },
    });

    // Цепочку считаем с последнего фактического остатка, чтобы учесть планы
    // между ним и началом запрошенного диапазона.
    const startDay = anchor ? anchor.date : from;

    const balances = await this.dayBalanceRepo.find({
      where: { date: Between(startDay, to) },
      order: { date: 'ASC' },
    });
    const balanceByDate = new Map(balances.map((b) => [b.date, b.amount]));

    const entries = await this.plannedRepo.find({ where: { date: Between(startDay, to) } });
    const rules = await this.recurringRepo.find();

    const expenseByDate = new Map<string, number>();
    const incomeByDate = new Map<string, number>();
    for (const e of entries) {
      const map = e.type === 'expense' ? expenseByDate : incomeByDate;
      map.set(e.date, (map.get(e.date) ?? 0) + e.amount);
    }

    const days: DayInfo[] = [];
    let cur: number | null = null;
    let d = startDay;
    while (d <= to) {
      let expense = expenseByDate.get(d) ?? 0;
      let income = incomeByDate.get(d) ?? 0;
      for (const r of rules) {
        if (ruleMatchesDate(r, d)) {
          if (r.type === 'expense') expense += r.amount;
          else income += r.amount;
        }
      }

      const actual = balanceByDate.get(d);
      if (actual !== undefined) {
        cur = actual;
      } else if (cur !== null) {
        cur = cur - expense + income;
      }

      if (d >= from) {
        days.push({
          date: d,
          plannedExpense: round2(expense),
          plannedIncome: round2(income),
          plannedBalance: cur === null ? null : round2(cur),
          actualBalance: actual ?? null,
        });
      }
      d = addDays(d, 1);
    }
    return days;
  }

  async getDayDetail(date: string): Promise<DayDetail> {
    const [day] = await this.computeRange(date, date);
    const entries = await this.plannedRepo.find({ where: { date }, order: { id: 'ASC' } });
    const rules = await this.recurringRepo.find();
    const matchingRules = rules
      .filter((r) => ruleMatchesDate(r, date))
      .map((r) => ({ id: r.id, type: r.type, amount: r.amount, note: r.note }));

    return { ...day, entries, matchingRules };
  }

  async setBalance(date: string, amount: number): Promise<DayBalance> {
    const existing = await this.dayBalanceRepo.findOne({ where: { date } });
    if (existing) {
      existing.amount = amount;
      return this.dayBalanceRepo.save(existing);
    }
    return this.dayBalanceRepo.save(this.dayBalanceRepo.create({ date, amount }));
  }

  async deleteBalance(date: string): Promise<void> {
    await this.dayBalanceRepo.delete({ date });
  }
}
