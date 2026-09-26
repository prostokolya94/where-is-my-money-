import { RemoveTodoChildren, TodoItem } from '../api/client';
import { store } from '../stores/FinanceStore';

interface Props {
  todo: TodoItem;
  count: number;
  onClose: () => void;
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

export function DeleteTodoModal({ todo, count, onClose }: Props) {
  const remove = (children: RemoveTodoChildren) => {
    void store.deleteTodo(todo.id, children);
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel todo-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>Удалить дело?</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="hint">
          В деле «{todo.title}» {count} {plural(count, 'вложенное дело', 'вложенных дела', 'вложенных дел')}.
          Что с ними сделать?
        </p>

        <div className="row todo-form-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="ghost" onClick={() => remove('promote')}>
            Поднять на уровень выше
          </button>
          <button type="button" className="danger" onClick={() => remove('cascade')}>
            Удалить всё
          </button>
        </div>
      </div>
    </div>
  );
}
