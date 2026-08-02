import { observer } from 'mobx-react-lite';
import { FormEvent, useEffect, useState } from 'react';
import { Frequency, RecurringRule } from '../api/client';
import { store } from '../stores/FinanceStore';
import { fmtMoney, todayStr } from '../utils/calendar';

interface Props {
  onClose: () => void;
}

const WEEKDAYS = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье'];
const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const FREQ_LABEL: Record<Frequency, string> = {
  daily: 'Каждый день',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
};

function ruleDesc(r: RecurringRule): string {
  const base =
    r.frequency === 'daily'
      ? 'ежедневно'
      : r.frequency === 'weekly'
        ? `по ${WEEKDAYS[r.dayOfWeek ?? 0]}`
        : r.frequency === 'monthly'
          ? `${r.dayOfMonth}-го числа`
          : `${r.dayOfMonth} ${MONTHS[(r.monthOfYear ?? 1) - 1]}`;
  let s = `с ${r.startDate}`;
  if (r.endDate) s += ` по ${r.endDate}`;
  return `${base}, ${s}`;
}

interface FormState {
  type: 'expense' | 'income';
  amount: string;
  note: string;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  dayOfWeek: number;
  dayOfMonth: number;
  monthOfYear: number;
}

function emptyForm(): FormState {
  return {
    type: 'expense',
    amount: '',
    note: '',
    frequency: 'monthly',
    startDate: todayStr(),
    endDate: '',
    dayOfWeek: 0,
    dayOfMonth: 1,
    monthOfYear: 1,
  };
}

export const RecurringPanel = observer(function RecurringPanel({ onClose }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void store.loadRecurring();
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(form.amount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0 || !form.startDate) return;
    setBusy(true);
    try {
      const payload = {
        type: form.type,
        amount,
        note: form.note.trim() || undefined,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.endDate || null,
        dayOfWeek: form.frequency === 'weekly' ? form.dayOfWeek : null,
        dayOfMonth: form.frequency === 'monthly' || form.frequency === 'yearly' ? form.dayOfMonth : null,
        monthOfYear: form.frequency === 'yearly' ? form.monthOfYear : null,
      };
      if (editingId) await store.updateRecurring(editingId, payload);
      else await store.addRecurring(payload);
      setEditingId(null);
      setForm(emptyForm());
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (r: RecurringRule) => {
    setEditingId(r.id);
    setForm({
      type: r.type,
      amount: String(r.amount),
      note: r.note ?? '',
      frequency: r.frequency,
      startDate: r.startDate,
      endDate: r.endDate ?? '',
      dayOfWeek: r.dayOfWeek ?? 0,
      dayOfMonth: r.dayOfMonth ?? 1,
      monthOfYear: r.monthOfYear ?? 1,
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>Повторяющиеся траты и доходы</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="rule-form" onSubmit={(e) => void submit(e)}>
          <div className="seg">
            <button
              type="button"
              className={form.type === 'expense' ? 'on e' : ''}
              onClick={() => set('type', 'expense')}
            >
              Расход
            </button>
            <button
              type="button"
              className={form.type === 'income' ? 'on i' : ''}
              onClick={() => set('type', 'income')}
            >
              Доход
            </button>
          </div>
          <input
            type="number"
            step="any"
            min="0"
            inputMode="decimal"
            value={form.amount}
            placeholder="Сумма"
            onChange={(e) => set('amount', e.target.value)}
          />
          <input
            value={form.note}
            placeholder="Название (напр. «Зарплата»)"
            maxLength={200}
            list="note-suggestions-rec"
            onChange={(e) => set('note', e.target.value)}
          />
          <datalist id="note-suggestions-rec">
            {store.suggestions(form.type).map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <select value={form.frequency} onChange={(e) => set('frequency', e.target.value as Frequency)}>
            {(Object.keys(FREQ_LABEL) as Frequency[]).map((f) => (
              <option key={f} value={f}>
                {FREQ_LABEL[f]}
              </option>
            ))}
          </select>

          {form.frequency === 'weekly' && (
            <select value={form.dayOfWeek} onChange={(e) => set('dayOfWeek', Number(e.target.value))}>
              {WEEKDAYS.map((d, i) => (
                <option key={i} value={i}>
                  Каждый {d}
                </option>
              ))}
            </select>
          )}
          {form.frequency === 'monthly' && (
            <select value={form.dayOfMonth} onChange={(e) => set('dayOfMonth', Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}-го числа
                </option>
              ))}
            </select>
          )}
          {form.frequency === 'yearly' && (
            <>
              <select value={form.dayOfMonth} onChange={(e) => set('dayOfMonth', Number(e.target.value))}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              <select value={form.monthOfYear} onChange={(e) => set('monthOfYear', Number(e.target.value))}>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </>
          )}

          <input
            type="date"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
            placeholder="До (необяз.)"
            title="Дата окончания (необязательно)"
          />

          <button type="submit" className="primary" disabled={busy}>
            {editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {editingId && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
              }}
            >
              Отмена
            </button>
          )}
        </form>

        <div className="entries">
          {store.recurring.map((r) => (
            <div key={r.id} className="entry">
              <span className={r.type === 'expense' ? 'sign e' : 'sign i'}>
                {r.type === 'expense' ? '−' : '+'}
              </span>
              <span className="note">
                <b>{r.note || (r.type === 'expense' ? 'Регулярный расход' : 'Регулярный доход')}</b>
                <small>{ruleDesc(r)}</small>
              </span>
              <span className={`amt ${r.type === 'expense' ? 'e' : 'i'}`}>{fmtMoney(r.amount)} ₽</span>
              <button type="button" className="icon-btn" title="Изменить" onClick={() => startEdit(r)}>
                ✎
              </button>
              <button
                type="button"
                className="icon-btn"
                title="Удалить"
                onClick={() => void store.deleteRecurring(r.id)}
              >
                ×
              </button>
            </div>
          ))}
          {store.recurring.length === 0 && <div className="empty">Пока нет повторяющихся записей</div>}
        </div>
      </div>
    </div>
  );
});
