import { FormEvent, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { TodoItem } from '../api/client';
import { store } from '../stores/FinanceStore';
import { dateLabel } from '../utils/calendar';

interface Props {
  item: TodoItem | null;
  parent: TodoItem | null;
  onClose: () => void;
}

export const TodoModal = observer(function TodoModal({ item, parent, onClose }: Props) {
  const [title, setTitle] = useState(item?.title ?? '');
  const [dueDate, setDueDate] = useState(item?.dueDate ?? '');
  const [sectionId, setSectionId] = useState<number | null>(item?.sectionId ?? null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTitle(item?.title ?? '');
    setDueDate(item?.dueDate ?? '');
    setSectionId(item?.sectionId ?? null);
  }, [item?.id, item?.title, item?.dueDate, item?.sectionId]);

  const parentTodo =
    parent ?? (item?.parentId != null ? store.todos.find((t) => t.id === item?.parentId) ?? null : null);
  const isSubtask = !!parentTodo;
  const parentSection = parentTodo
    ? store.todoSections.find((s) => s.id === parentTodo.sectionId)?.name ?? 'Без раздела'
    : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    setBusy(true);
    try {
      const payload = {
        title: value,
        dueDate: dueDate || null,
        sectionId: isSubtask ? undefined : sectionId,
        parentId: parentTodo?.id ?? null,
      };
      if (item) await store.updateTodo(item.id, payload);
      else await store.addTodo(payload);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel todo-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>
            {isSubtask ? 'Новая подзадача' : item ? 'Изменить дело' : 'Новое дело'}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {isSubtask && (
          <p className="hint">
            Подзадача для «{parentTodo.title}» · раздел: {parentSection}
          </p>
        )}

        <form className="todo-form" onSubmit={(e) => void submit(e)}>
          <label className="field-label" htmlFor="todo-title">
            Название
          </label>
          <input
            id="todo-title"
            value={title}
            maxLength={200}
            autoFocus
            placeholder="Например, оплатить интернет"
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="field-label" htmlFor="todo-due">
            Плановое выполнение
          </label>
          <input
            id="todo-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <p className="hint">Необязательно. Дата фактического выполнения проставится сама, когда отметишь галочку.</p>

          {item?.doneAt && (
            <>
              <label className="field-label">Фактическое выполнение</label>
              <p className="hint">{dateLabel(item.doneAt.slice(0, 10))}</p>
            </>
          )}

          <label className="field-label" htmlFor="todo-section">
            Раздел
          </label>
          {isSubtask ? (
            <p className="hint">{parentSection}</p>
          ) : (
            <select
              id="todo-section"
              value={sectionId ?? ''}
              onChange={(e) => setSectionId(e.target.value === '' ? null : Number(e.target.value))}
            >
              <option value="">Без раздела</option>
              {store.todoSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
          <p className="hint">Необязательно. Дело без раздела попадёт в блок «Без раздела».</p>

          <div className="row todo-form-actions">
            <button type="button" className="ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="primary" disabled={busy || !title.trim()}>
              {item ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
});
