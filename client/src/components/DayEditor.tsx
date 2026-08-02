import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { store } from '../stores/FinanceStore';
import { addDays, dateLabel, fmtMoney } from '../utils/calendar';

interface Props {
  date: string;
  onClose: () => void;
  onOpenRecurring: () => void;
}

export const DayEditor = observer(function DayEditor({ date, onClose, onOpenRecurring }: Props) {
  const detail = store.dayDetail.get(date);
  const [actual, setActual] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [etype, setEtype] = useState<'expense' | 'income'>('expense');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void store.loadDetail(date);
  }, [date]);

  useEffect(() => {
    setActual(detail && detail.actualBalance !== null ? String(detail.actualBalance) : '');
    setAmount('');
    setNote('');
  }, [date, detail?.actualBalance]);

  const saveActual = async () => {
    const v = parseFloat(actual.replace(',', '.'));
    if (isNaN(v)) return;
    setBusy(true);
    try {
      await store.setBalance(date, v);
      setActual('');
    } finally {
      setBusy(false);
    }
  };

  const addPlan = async () => {
    const v = parseFloat(amount.replace(',', '.'));
    if (isNaN(v) || v <= 0) return;
    setBusy(true);
    try {
      await store.addPlanned(date, etype, v, note.trim() || undefined);
      setAmount('');
      setNote('');
    } finally {
      setBusy(false);
    }
  };

  const prev = store.dayInfo.get(addDays(date, -1));
  let diff: number | null = null;
  if (detail?.actualBalance != null && prev?.plannedBalance != null) {
    const predicted = prev.plannedBalance - detail.plannedExpense + detail.plannedIncome;
    diff = detail.actualBalance - predicted;
  }

  return (
    <aside className="editor">
      <div className="editor-head">
        <div className="editor-date">{dateLabel(date)}</div>
        <button type="button" className="icon-btn" onClick={onClose} title="Закрыть">
          ×
        </button>
      </div>

      <div className="card">
        <div className="row between">
          <span className="muted">Запланированный остаток</span>
          <b>{fmtMoney(detail?.plannedBalance ?? null)} ₽</b>
        </div>
        <div className="row between">
          <span className="muted">Фактический остаток</span>
          <b>{detail?.actualBalance != null ? `${fmtMoney(detail.actualBalance)} ₽` : '—'}</b>
        </div>
        {diff !== null && (
          <div className="row between">
            <span className="muted">Отклонение от прогноза</span>
            <b className={diff < 0 ? 'diff e' : 'diff i'}>
              {diff > 0 ? '+' : diff < 0 ? '−' : ''}
              {fmtMoney(Math.abs(diff))} ₽
            </b>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Зафиксировать фактический остаток</div>
        <p className="hint">
          Укажите остаток в конце дня. Следующие дни считаются от него (остаток − расход + доход).
        </p>
        <div className="row">
          <input
            type="number"
            step="any"
            inputMode="decimal"
            value={actual}
            placeholder="0"
            onChange={(e) => setActual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveActual();
            }}
          />
          <button type="button" className="primary" onClick={() => void saveActual()} disabled={busy}>
            ОК
          </button>
          {detail?.actualBalance != null && (
            <button
              type="button"
              className="danger"
              onClick={() => void store.clearBalance(date)}
              disabled={busy}
              title="Убрать зафиксированный остаток"
            >
              Сброс
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Планы на этот день</div>
        <div className="entries">
          {detail?.entries.map((en) => (
            <div key={en.id} className="entry">
              <span className={en.type === 'expense' ? 'sign e' : 'sign i'}>
                {en.type === 'expense' ? '−' : '+'}
              </span>
              <span className="note">{en.note || (en.type === 'expense' ? 'Расход' : 'Доход')}</span>
              <span className={`amt ${en.type === 'expense' ? 'e' : 'i'}`}>{fmtMoney(en.amount)}</span>
              <button
                type="button"
                className="icon-btn"
                title="Удалить"
                onClick={() => void store.deletePlanned(en.id, date)}
              >
                ×
              </button>
            </div>
          ))}
          {detail && detail.entries.length === 0 && <div className="empty">Нет запланированных записей</div>}
        </div>
        <div className="add-form">
          <div className="row">
            <div className="seg">
              <button
                type="button"
                className={etype === 'expense' ? 'on e' : ''}
                onClick={() => setEtype('expense')}
              >
                Расход
              </button>
              <button
                type="button"
                className={etype === 'income' ? 'on i' : ''}
                onClick={() => setEtype('income')}
              >
                Доход
              </button>
            </div>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              value={amount}
              placeholder="Сумма"
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addPlan();
              }}
            />
            <button type="button" className="primary" onClick={() => void addPlan()} disabled={busy}>
              +
            </button>
          </div>
          <input
            value={note}
            placeholder="Название"
            maxLength={200}
            list="note-suggestions"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addPlan();
            }}
          />
          <datalist id="note-suggestions">
            {store.suggestions(etype).map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Повторяющиеся на этот день</div>
        <div className="entries">
          {detail?.matchingRules.map((r) => (
            <div key={r.id} className="entry">
              <span className={r.type === 'expense' ? 'sign e' : 'sign i'}>
                {r.type === 'expense' ? '−' : '+'}
              </span>
              <span className="note">{r.note || (r.type === 'expense' ? 'Регулярный расход' : 'Регулярный доход')}</span>
              <span className={`amt ${r.type === 'expense' ? 'e' : 'i'}`}>{fmtMoney(r.amount)}</span>
            </div>
          ))}
          {detail && detail.matchingRules.length === 0 && (
            <div className="empty">Нет повторяющихся записей</div>
          )}
        </div>
        <button type="button" className="link" onClick={onOpenRecurring}>
          Управлять повторяющимися…
        </button>
      </div>
    </aside>
  );
});
