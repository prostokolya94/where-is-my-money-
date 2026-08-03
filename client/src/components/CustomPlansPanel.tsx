import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { CustomPlan } from '../api/client';
import { store } from '../stores/FinanceStore';
import { fmtMoney } from '../utils/calendar';

interface Props {
  onClose: () => void;
}

export const CustomPlansPanel = observer(function CustomPlansPanel({ onClose }: Props) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newBalance, setNewBalance] = useState('0');
  const [rowDate, setRowDate] = useState('');
  const [rowAmount, setRowAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      await store.loadCustomPlans();
      await store.loadNotes();
    })();
  }, []);

  const plans = store.customPlans;
  const plan = plans.find((p) => p.id === selectedId) ?? plans[0] ?? null;

  const createPlan = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      await store.addCustomPlan({
        title: newTitle.trim(),
        label: newLabel.trim() || newTitle.trim(),
        initialBalance: parseFloat(newBalance.replace(',', '.')) || 0,
      });
      setNewTitle('');
      setNewLabel('');
      setNewBalance('0');
      setShowNew(false);
    } finally {
      setBusy(false);
    }
  };

  const savePlan = async (d: { title: string; label: string; initialBalance: string }) => {
    if (!plan || !d.title.trim()) return;
    setBusy(true);
    try {
      await store.updateCustomPlan(plan.id, {
        title: d.title.trim(),
        label: d.label.trim(),
        initialBalance: parseFloat(d.initialBalance.replace(',', '.')) || 0,
      });
    } finally {
      setBusy(false);
    }
  };

  const addRow = async () => {
    if (!plan || !rowDate) return;
    const v = parseFloat(rowAmount.replace(',', '.'));
    if (isNaN(v) || v <= 0) return;
    setBusy(true);
    try {
      await store.addCustomPlanRow(plan.id, { date: rowDate, amount: v });
      setRowDate('');
      setRowAmount('');
    } finally {
      setBusy(false);
    }
  };

  const commitRow = async (rowId: number, d: { date?: string; amount?: number; overrideBefore?: number | null; overrideSnapshot?: number | null }) => {
    setBusy(true);
    try {
      await store.updateCustomPlanRow(rowId, d);
    } finally {
      setBusy(false);
    }
  };

  const handleBefore = async (rowId: number, autoBefore: number, overridden: boolean, value: string) => {
    const v = parseFloat(value.replace(',', '.'));
    if (isNaN(v)) return;
    if (!overridden && Math.abs(v - autoBefore) < 0.005) return;
    if (Math.abs(v - autoBefore) < 0.005) {
      await commitRow(rowId, { overrideBefore: null, overrideSnapshot: null });
    } else {
      await commitRow(rowId, { overrideBefore: v, overrideSnapshot: autoBefore });
    }
  };

  const computation = plan ? store.computePlan(plan) : null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel plans-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>Свои планы</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="plan-tabs">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              className={plan?.id === p.id ? 'on' : ''}
              onClick={() => setSelectedId(p.id)}
            >
              {p.title}
            </button>
          ))}
          <button type="button" className="ghost small" onClick={() => setShowNew((s) => !s)}>
            + Новый план
          </button>
        </div>

        {showNew && (
          <div className="card">
            <div className="card-title">Новый план</div>
            <input value={newTitle} placeholder="Название (напр. «Логопед»)" maxLength={200} onChange={(e) => setNewTitle(e.target.value)} />
            <input value={newLabel} placeholder="Метка для трат (если пусто — как название)" maxLength={200} onChange={(e) => setNewLabel(e.target.value)} />
            <input type="number" step="any" inputMode="decimal" value={newBalance} placeholder="Начальный баланс" onChange={(e) => setNewBalance(e.target.value)} />
            <button type="button" className="primary" onClick={() => void createPlan()} disabled={busy || !newTitle.trim()}>
              Создать
            </button>
          </div>
        )}

        {plan && (
          <>
            <PlanEditor
              plan={plan}
              busy={busy}
              onSave={(d) => void savePlan(d)}
              onDelete={() => void store.deleteCustomPlan(plan.id)}
            />

            <div className="card">
              <div className="card-title">Строки плана (списания)</div>
              <div className="plan-row plan-row-head">
                <span>Дата</span>
                <span>Сумма</span>
                <span>Перед платежом</span>
                <span>После</span>
                <span />
              </div>
              {computation?.rows.map((r) => (
                <div key={r.id} className="plan-row">
                  <input
                    type="date"
                    defaultValue={r.date}
                    onBlur={(e) => void commitRow(r.id, { date: e.target.value })}
                  />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    inputMode="decimal"
                    defaultValue={String(r.amount)}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value.replace(',', '.'));
                      if (!isNaN(v) && v > 0) void commitRow(r.id, { amount: v });
                    }}
                  />
                  <div className="before-cell">
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      defaultValue={String(r.before)}
                      title="Баланс до платежа. Считается автоматически, можно переопределить вручную."
                      onBlur={(e) => void handleBefore(r.id, r.autoBefore, r.overridden, e.target.value)}
                    />
                    {r.overridden && <span className="badge">ручн.</span>}
                    {r.stale && <span className="badge warn" title="Данные изменились, значение пересчитано">пересчёт</span>}
                  </div>
                  <b className="after">{fmtMoney(r.after)} ₽</b>
                  <button type="button" className="icon-btn" title="Удалить строку" onClick={() => void store.deleteCustomPlanRow(r.id)}>
                    ×
                  </button>
                </div>
              ))}
              {computation && computation.rows.length === 0 && (
                <div className="empty">Строк нет. Добавьте строку, чтобы запланировать списание.</div>
              )}

              <div className="row">
                <input type="date" value={rowDate} onChange={(e) => setRowDate(e.target.value)} />
                <input
                  type="number"
                  step="any"
                  min="0"
                  inputMode="decimal"
                  value={rowAmount}
                  placeholder="Сумма"
                  onChange={(e) => setRowAmount(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void addRow();
                  }}
                />
                <button type="button" className="primary" onClick={() => void addRow()} disabled={busy || !rowDate}>
                  +
                </button>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Автоподтянутые траты (метка «{plan.label}»)</div>
              {computation && computation.contributions.length > 0 ? (
                <div className="contrib-list">
                  {computation.contributions.map((c, i) => (
                    <div key={i} className="entry">
                      <span className="sign i">+</span>
                      <span className="note">{c.date}</span>
                      <span className="amt i">{fmtMoney(c.amount)} ₽</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">Нет расходов с этой меткой (регистр не важен).</div>
              )}
            </div>
          </>
        )}

        {plans.length === 0 && !showNew && (
          <div className="empty">Создайте первый план — соберите цель из трат по метке и запланируйте списания.</div>
        )}
      </div>
    </div>
  );
});

function PlanEditor({
  plan,
  busy,
  onSave,
  onDelete,
}: {
  plan: CustomPlan;
  busy: boolean;
  onSave: (d: { title: string; label: string; initialBalance: string }) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(plan.title);
  const [label, setLabel] = useState(plan.label);
  const [balance, setBalance] = useState(String(plan.initialBalance));

  useEffect(() => {
    setTitle(plan.title);
    setLabel(plan.label);
    setBalance(String(plan.initialBalance));
  }, [plan.id, plan.title, plan.label, plan.initialBalance]);

  const dirty = title !== plan.title || label !== plan.label || parseFloat(balance.replace(',', '.')) !== plan.initialBalance;

  return (
    <div className="card">
      <div className="card-title">Параметры плана</div>
      <input value={title} placeholder="Название" maxLength={200} onChange={(e) => setTitle(e.target.value)} />
      <input value={label} placeholder="Метка для автоподтягивания трат" maxLength={200} onChange={(e) => setLabel(e.target.value)} />
      <input
        type="number"
        step="any"
        inputMode="decimal"
        value={balance}
        placeholder="Начальный баланс"
        onChange={(e) => setBalance(e.target.value)}
      />
      <div className="row between">
        <button type="button" className="primary" disabled={busy || !dirty || !title.trim()} onClick={() => onSave({ title, label, initialBalance: balance })}>
          Сохранить
        </button>
        <button type="button" className="danger" disabled={busy} onClick={onDelete}>
          Удалить план
        </button>
      </div>
    </div>
  );
}
