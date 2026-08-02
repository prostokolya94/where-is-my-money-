import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useState } from 'react';
import { store } from '../stores/FinanceStore';
import { fmtMoney } from '../utils/calendar';

interface Props {
  onClose: () => void;
}

interface SalaryRow {
  id: number;
  ym: number;
  monthHours: string;
  advanceHours: string;
  advanceDate: string;
  salaryDate: string;
  vacationDays: string;
  vacationDate: string;
}

const BASE_KEY = 'salary-base';
const ROWS_KEY = 'salary-rows';

function ymParts(ym: number): { y: number; m: number } {
  return { y: Math.floor(ym / 12), m: ym % 12 };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function currentMonthYM(): number {
  const n = new Date();
  return n.getFullYear() * 12 + n.getMonth();
}

function lastDayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

function monthName(ym: number): string {
  const { y, m } = ymParts(ym);
  return new Date(Date.UTC(y, m, 1)).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
}

function newRow(ym: number): SalaryRow {
  const { y, m } = ymParts(ym);
  const last = lastDayOfMonth(y, m);
  const n = ymParts(ym + 1);
  return {
    id: Date.now(),
    ym,
    monthHours: '',
    advanceHours: '',
    advanceDate: `${y}-${pad(m + 1)}-${pad(last)}`,
    salaryDate: `${n.y}-${pad(n.m + 1)}-15`,
    vacationDays: '',
    vacationDate: '',
  };
}

function loadBase(): string {
  try {
    return localStorage.getItem(BASE_KEY) ?? '';
  } catch {
    return '';
  }
}

function loadRows(): SalaryRow[] {
  try {
    const raw = localStorage.getItem(ROWS_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as SalaryRow[]).map((r) => ({
      id: r.id ?? Date.now(),
      ym: typeof r.ym === 'number' ? r.ym : currentMonthYM(),
      monthHours: r.monthHours ?? '',
      advanceHours: r.advanceHours ?? '',
      advanceDate: r.advanceDate ?? '',
      salaryDate: r.salaryDate ?? '',
      vacationDays: r.vacationDays ?? '',
      vacationDate: r.vacationDate ?? '',
    }));
  } catch {
    return [];
  }
}

export const SalaryPanel = observer(function SalaryPanel({ onClose }: Props) {
  const [base, setBase] = useState(loadBase());
  const [rows, setRows] = useState<SalaryRow[]>(loadRows());
  const [saved, setSaved] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const currentYM = useMemo(() => {
    const n = new Date();
    return n.getFullYear() * 12 + n.getMonth();
  }, []);

  const months = useMemo(() => {
    const list: { ym: number; label: string }[] = [];
    for (let ym = currentYM - 1; ym <= currentYM + 12; ym++) {
      list.push({ ym, label: monthName(ym) });
    }
    return list;
  }, [currentYM]);

  useEffect(() => {
    try {
      localStorage.setItem(BASE_KEY, base);
    } catch {
      /* ignore */
    }
  }, [base]);

  useEffect(() => {
    try {
      localStorage.setItem(ROWS_KEY, JSON.stringify(rows));
    } catch {
      /* ignore */
    }
  }, [rows]);

  const baseNum = parseFloat(base.replace(',', '.'));

  const compute = (r: SalaryRow) => {
    const mh = parseFloat(r.monthHours.replace(',', '.'));
    const ah = parseFloat(r.advanceHours.replace(',', '.'));
    if (!baseNum || !mh || mh <= 0 || isNaN(ah) || ah < 0) return null;
    const hourly = baseNum / mh;
    const advance = Math.round(hourly * ah * 100) / 100;
    const vd = parseFloat(r.vacationDays.replace(',', '.'));
    const vacationHours = !isNaN(vd) && vd > 0 ? vd * 8 : 0;
    const vacation = Math.round(hourly * vacationHours * 100) / 100;
    const salary = Math.round((baseNum - advance - vacation) * 100) / 100;
    return { hourly, daily: hourly * 8, advance, vacation, vacationHours, salary };
  };

  const addRow = () => {
    setRows((r) => [...r, newRow(currentYM)]);
  };

  const updateRow = (id: number, patch: Partial<SalaryRow>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSaved((s) => s.filter((x) => x !== id));
  };

  const removeRow = (id: number) => {
    setRows((rs) => rs.filter((r) => r.id !== id));
    setSaved((s) => s.filter((x) => x !== id));
  };

  const saveRow = async (r: SalaryRow) => {
    const calc = compute(r);
    if (!calc || !r.advanceDate || !r.salaryDate) return;
    setBusy(true);
    try {
      const label = monthName(r.ym);
      await store.upsertPlanned('income', r.advanceDate, calc.advance, `Аванс · ${label}`);
      if (calc.vacation > 0 && r.vacationDate) {
        await store.upsertPlanned('income', r.vacationDate, calc.vacation, `Отпускные · ${label}`);
      }
      await store.upsertPlanned('income', r.salaryDate, calc.salary, `Зарплата · ${label}`);
      setSaved((s) => [...s.filter((x) => x !== r.id), r.id]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel salary-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>Расчёт зарплаты</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="card">
          <label className="field-label">Оклад в месяц (₽)</label>
          <input
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            value={base}
            placeholder="напр. 100000"
            onChange={(e) => setBase(e.target.value)}
          />
          <p className="hint">
            Аванс = оклад × часы(1–14) ÷ часы месяца. Отпускные = ставка × дни × 8ч. Зарплата = оклад − аванс − отпускные.
          </p>
        </div>

        <div className="salary-rows">
          {rows.map((r) => {
            const calc = compute(r);
            return (
              <div key={r.id} className="card salary-row">
                <div className="salary-row-head">
                  <select value={r.ym} onChange={(e) => updateRow(r.id, { ym: Number(e.target.value) })}>
                    {months.map((m) => (
                      <option key={m.ym} value={m.ym}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="icon-btn" title="Удалить строку" onClick={() => removeRow(r.id)}>
                    ×
                  </button>
                </div>

                <div className="grid2">
                  <div className="field">
                    <label className="field-label">Рабочие часы в месяце</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      value={r.monthHours}
                      placeholder="напр. 168"
                      onChange={(e) => updateRow(r.id, { monthHours: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Часы на аванс (с 1 по 14)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      value={r.advanceHours}
                      placeholder="напр. 80"
                      onChange={(e) => updateRow(r.id, { advanceHours: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Дата аванса</label>
                    <input type="date" value={r.advanceDate} onChange={(e) => updateRow(r.id, { advanceDate: e.target.value })} />
                  </div>
                  <div className="field">
                    <label className="field-label">Дата зарплаты</label>
                    <input type="date" value={r.salaryDate} onChange={(e) => updateRow(r.id, { salaryDate: e.target.value })} />
                  </div>
                </div>

                <div className="vacation-box">
                  <div className="field">
                    <label className="field-label">Дней отпуска (необязательно)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      inputMode="decimal"
                      value={r.vacationDays}
                      placeholder="напр. 14"
                      onChange={(e) => updateRow(r.id, { vacationDays: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Дата отпускных (необязательно)</label>
                    <input type="date" value={r.vacationDate} onChange={(e) => updateRow(r.id, { vacationDate: e.target.value })} />
                  </div>
                </div>

                <div className="salary-summary">
                  <div className="rate-line">
                    {calc
                      ? `Ставка: ${fmtMoney(calc.hourly)} ₽/час · ${fmtMoney(calc.daily)} ₽/день (8ч)`
                      : 'Ставка: —'}
                  </div>
                  <div className="sum-line">
                    Аванс: <b className="i">{calc ? `${fmtMoney(calc.advance)} ₽` : '—'}</b>
                  </div>
                  {calc && calc.vacation > 0 && (
                    <div className="sum-line">
                      Отпускные ({calc.vacationHours} ч): <b className="i">{`${fmtMoney(calc.vacation)} ₽`}</b>
                    </div>
                  )}
                  <div className="sum-line">
                    Зарплата: <b className="i">{calc ? `${fmtMoney(calc.salary)} ₽` : '—'}</b>
                  </div>
                </div>

                <div className="row between">
                  <button
                    type="button"
                    className="primary"
                    disabled={busy || !calc || !r.advanceDate || !r.salaryDate}
                    onClick={() => void saveRow(r)}
                  >
                    Добавить в календарь
                  </button>
                  {saved.includes(r.id) && <span className="muted">Сохранено ✓</span>}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <div className="empty">Пока нет строк. Добавьте месяц.</div>}
        </div>

        <button type="button" className="ghost" onClick={addRow}>
          + Добавить месяц
        </button>
      </div>
    </div>
  );
});
