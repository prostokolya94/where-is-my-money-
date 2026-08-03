import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Calendar } from './components/Calendar';
import { CustomPlansPanel } from './components/CustomPlansPanel';
import { DayEditor } from './components/DayEditor';
import { RecurringPanel } from './components/RecurringPanel';
import { SalaryPanel } from './components/SalaryPanel';
import { store } from './stores/FinanceStore';
import { fmtMoney, todayStr } from './utils/calendar';

export const App = observer(function App() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    void (async () => {
      await store.loadRecurring();
      await store.loadNotes();
      await store.loadCustomPlans();
    })();
  }, []);

  const today = store.dayInfo.get(todayStr());
  const todayBalance = today ? today.actualBalance ?? today.plannedBalance : null;

  const select = (s: string) => {
    store.selectedDate = s;
    setSelected(s);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Где мои деньги</h1>
        <div className="today-balance">
          {todayBalance !== null ? (
            <>
              Сегодня: <b>{fmtMoney(todayBalance)} ₽</b>
            </>
          ) : (
            <span className="muted">Сегодня: нет данных</span>
          )}
        </div>
        <div className="spacer" />
        <button type="button" className="ghost" onClick={() => setShowPlans(true)}>
          Свои планы
        </button>
        <button type="button" className="ghost" onClick={() => setShowSalary(true)}>
          Расчёт зарплаты
        </button>
        <button type="button" className="ghost" onClick={() => setShowRecurring(true)}>
          Повторяющиеся
        </button>
      </header>

      <main className="main">
        <Calendar onSelect={select} />
      </main>

      {selected && (
        <DayEditor
          date={selected}
          onClose={() => {
            store.selectedDate = null;
            setSelected(null);
          }}
          onOpenRecurring={() => setShowRecurring(true)}
        />
      )}
      {showRecurring && <RecurringPanel onClose={() => setShowRecurring(false)} />}
      {showSalary && <SalaryPanel onClose={() => setShowSalary(false)} />}
      {showPlans && <CustomPlansPanel onClose={() => setShowPlans(false)} />}
    </div>
  );
});
