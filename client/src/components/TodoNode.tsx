import { useState } from 'react';
import { TodoItem } from '../api/client';
import { store } from '../stores/FinanceStore';
import { dateLabel, todayStr } from '../utils/calendar';
import { DeleteTodoModal } from './DeleteTodoModal';

export type ChildrenMap = Map<number, TodoItem[]>;

interface Props {
  todo: TodoItem;
  byParent: ChildrenMap;
  onEdit: (todo: TodoItem) => void;
  onAddSubtask: (todo: TodoItem) => void;
}

export function TodoNode({ todo, byParent, onEdit, onAddSubtask }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(false);
  const children = byParent.get(todo.id) ?? [];
  const overdue = !todo.done && !!todo.dueDate && todo.dueDate < todayStr();

  const descendants = (node: TodoItem): number =>
    (byParent.get(node.id) ?? []).reduce((acc, child) => acc + 1 + descendants(child), 0);

  const remove = () => {
    if (descendants(todo) > 0) {
      setPendingDelete(true);
      return;
    }
    if (window.confirm(`Удалить дело «${todo.title}»?`)) void store.deleteTodo(todo.id, 'cascade');
  };

  return (
    <div className="todo-node">
      <div className={`todo-row${todo.done ? ' done' : ''}`}>
        {children.length > 0 ? (
          <button
            type="button"
            className="todo-caret"
            title={collapsed ? 'Развернуть' : 'Свернуть'}
            draggable={false}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? `▸ ${children.length}` : '▾'}
          </button>
        ) : (
          <span className="todo-caret placeholder" />
        )}

        <input
          type="checkbox"
          checked={todo.done}
          aria-label={todo.title}
          draggable={false}
          onChange={() => void store.updateTodo(todo.id, { done: !todo.done })}
        />

        <button type="button" className="todo-title" draggable={false} onClick={() => onEdit(todo)}>
          {todo.title}
        </button>

        {todo.dueDate && (
          <span
            className={`todo-due${overdue ? ' overdue' : ''}`}
            title="Плановое выполнение"
          >
            до {dateLabel(todo.dueDate)}
          </span>
        )}

        {todo.doneAt && (
          <span className="todo-done-at" title="Фактическое выполнение">
            ✓ {dateLabel(todo.doneAt.slice(0, 10))}
          </span>
        )}

        <button
          type="button"
          className="icon-btn"
          title="Добавить подзадачу"
          draggable={false}
          onClick={() => onAddSubtask(todo)}
        >
          ＋
        </button>
        <button
          type="button"
          className="icon-btn"
          title="Изменить"
          draggable={false}
          onClick={() => onEdit(todo)}
        >
          ✎
        </button>
        <button type="button" className="icon-btn" title="Удалить" draggable={false} onClick={remove}>
          ×
        </button>
      </div>

      {pendingDelete && (
        <DeleteTodoModal
          todo={todo}
          count={descendants(todo)}
          onClose={() => setPendingDelete(false)}
        />
      )}

      {!collapsed && children.length > 0 && (
        <div className="todo-children">
          {children.map((child) => (
            <TodoNode
              key={child.id}
              todo={child}
              byParent={byParent}
              onEdit={onEdit}
              onAddSubtask={onAddSubtask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
