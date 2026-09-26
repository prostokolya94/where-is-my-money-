import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { TodoItem } from './api/client';
import { Calendar } from './components/Calendar';
import { DayEditor } from './components/DayEditor';
import { RecurringPanel } from './components/RecurringPanel';
import { SalaryPanel } from './components/SalaryPanel';
import { TodoModal } from './components/TodoModal';
import { TodosView } from './components/TodosView';
import { store } from './stores/FinanceStore';
import { fmtMoney, todayStr } from './utils/calendar';

type View = 'money' | 'todos';

const VIEW_KEY = 'wimm-view';

function loadView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === 'todos' ? 'todos' : 'money';
  } catch {
    return 'money';
  }
}

function saveView(v: View): void {
  try {
    localStorage.setItem(VIEW_KEY, v);
  } catch {
    return;
  }
}

export const App = observer(function App() {
  const [view, setView] = useState<View>(loadView);
  const [selected, setSelected] = useState<string | null>(null);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showSalary, setShowSalary] = useState(false);
  const [todoEditor, setTodoEditor] = useState<{
    item: TodoItem | null;
    parent?: TodoItem;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      await store.loadRecurring();
      await store.loadNotes();
    })();
  }, []);

  const today = store.dayInfo.get(todayStr());
  const todayBalance = today ? today.actualBalance ?? today.plannedBalance : null;

  const select = (s: string) => {
    store.selectedDate = s;
    setSelected(s);
  };

  const switchView = (next: View) => {
    setView(next);
    saveView(next);
    if (next !== 'money') {
      store.selectedDate = null;
      setSelected(null);
      setShowRecurring(false);
      setShowSalary(false);
      setTodoEditor(null);
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Где моё</h1>
        <nav className="tab-nav" aria-label="Разделы">
          <button
            type="button"
            className={view === 'money' ? 'on' : ''}
            onClick={() => switchView('money')}
          >
            Деньги
          </button>
          <button
            type="button"
            className={view === 'todos' ? 'on' : ''}
            onClick={() => switchView('todos')}
          >
            Дела
          </button>
        </nav>
        {view === 'money' && (
          <div className="today-balance">
            {todayBalance !== null ? (
              <>
                Сегодня: <b>{fmtMoney(todayBalance)} ₽</b>
              </>
            ) : (
              <span className="muted">Сегодня: нет данных</span>
            )}
          </div>
        )}
        <div className="spacer" />
        {view === 'money' ? (
          <>
            <button type="button" className="ghost" onClick={() => setShowSalary(true)}>
              Расчёт зарплаты
            </button>
            <button type="button" className="ghost" onClick={() => setShowRecurring(true)}>
              Повторяющиеся
            </button>
          </>
        ) : (
          <button type="button" className="ghost" onClick={() => setTodoEditor({ item: null })}>
            Добавить дело
          </button>
        )}
      </header>

      <main className="main">
        {view === 'money' ? (
          <Calendar onSelect={select} />
        ) : (
          <TodosView
            onEdit={(item) => setTodoEditor({ item })}
            onAddSubtask={(parent) => setTodoEditor({ item: null, parent })}
          />
        )}
      </main>

      {view === 'money' && selected && (
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
      {todoEditor && (
        <TodoModal
          item={todoEditor.item}
          parent={todoEditor.parent ?? null}
          onClose={() => setTodoEditor(null)}
        />
      )}
    </div>
  );
});
