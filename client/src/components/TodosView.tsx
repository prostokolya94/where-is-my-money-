import { CSSProperties, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { RemoveSectionItems, TodoItem, TodoSection } from '../api/client';
import { store } from '../stores/FinanceStore';
import { ColorPalette } from './ColorPalette';
import { DeleteSectionModal } from './DeleteSectionModal';
import { TodoNode, type ChildrenMap } from './TodoNode';
import { TodoSectionModal } from './TodoSectionModal';

const UNASSIGNED = -1;

function tint(hex: string, alpha: number): string {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(15, 18, 22, ${alpha})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

interface Props {
  onEdit: (todo: TodoItem) => void;
  onAddSubtask: (todo: TodoItem) => void;
}

export const TodosView = observer(function TodosView({ onEdit, onAddSubtask }: Props) {
  const [sectionEditor, setSectionEditor] = useState<{ section: TodoSection | null } | null>(null);
  const [deleting, setDeleting] = useState<TodoSection | null>(null);
  const [paletteFor, setPaletteFor] = useState<number | null>(null);
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  useEffect(() => {
    void store.loadTodos();
    void store.loadTodoSections();
  }, []);

  useEffect(() => {
    if (paletteFor === null) return;
    const close = () => setPaletteFor(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [paletteFor]);

  const sections = store.todoSections;
  const total = store.todos.length;
  const doneCount = store.todos.filter((t) => t.done).length;

  const byParent: ChildrenMap = new Map();
  for (const t of store.todos) {
    if (t.parentId === null) continue;
    const list = byParent.get(t.parentId) ?? [];
    list.push(t);
    byParent.set(t.parentId, list);
  }

  const countIn = (sectionId: number | null) =>
    store.todos.filter((t) => (t.sectionId ?? null) === sectionId).length;

  const move = (drag: number, targetIndex: number) => {
    const ids = sections.map((s) => s.id);
    const from = ids.indexOf(drag);
    if (from < 0) return;
    const rest = ids.filter((id) => id !== drag);
    const to = Math.max(0, Math.min(from < targetIndex ? targetIndex - 1 : targetIndex, rest.length));
    rest.splice(to, 0, drag);
    void store.reorderTodoSections(rest);
  };

  const removeSection = (section: TodoSection) => {
    const count = countIn(section.id);
    if (count === 0) {
      if (window.confirm(`Удалить раздел «${section.name}»?`)) void store.deleteTodoSection(section.id, 'unassign');
    } else {
      setDeleting(section);
    }
  };

  const confirmRemove = (mode: RemoveSectionItems) => {
    if (deleting) void store.deleteTodoSection(deleting.id, mode);
    setDeleting(null);
  };

  const renderBlock = (section: TodoSection | null, targetIndex: number) => {
    const blockId = section ? section.id : UNASSIGNED;
    const sectionKey = section ? section.id : null;
    const items = store.todos.filter((t) => (t.sectionId ?? null) === sectionKey);
    const roots = items.filter((t) => t.parentId === null);
    const style = (
      section
        ? { '--sec': tint(section.color, 0.55), '--sec-strong': tint(section.color, 0.85) }
        : { '--sec': 'rgba(15, 18, 22, 0.12)', '--sec-strong': 'rgba(15, 18, 22, 0.4)' }
    ) as CSSProperties;

    return (
      <div
        key={blockId}
        className={`todo-section${dragId === blockId ? ' dragging' : ''}${overId === blockId ? ' over' : ''}`}
        style={style}
        draggable={!!section}
        onDragStart={() => section && setDragId(section.id)}
        onDragEnd={() => {
          setDragId(null);
          setOverId(null);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOverId(blockId);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          setOverId((cur) => (cur === blockId ? null : cur));
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId !== null) move(dragId, targetIndex);
          setDragId(null);
          setOverId(null);
        }}
      >
        <div className="todo-section-head">
          <span className="todo-section-title">{section ? section.name : 'Без раздела'}</span>
          <span className="todo-section-count">{items.length}</span>
          {section && (
            <button
              type="button"
              className="color-dot"
              style={{ background: tint(section.color, 0.78) }}
              title="Цвет блока"
              draggable={false}
              onClick={(e) => {
                e.stopPropagation();
                setPaletteFor(paletteFor === section.id ? null : section.id);
              }}
            />
          )}
          {section && (
            <button
              type="button"
              className="icon-btn"
              title="Изменить"
              draggable={false}
              onClick={() => setSectionEditor({ section })}
            >
              ✎
            </button>
          )}
          {section && (
            <button
              type="button"
              className="icon-btn"
              title="Удалить"
              draggable={false}
              onClick={() => removeSection(section)}
            >
              ×
            </button>
          )}
        </div>

        {section && paletteFor === section.id && (
          <div className="palette-pop" onClick={(e) => e.stopPropagation()}>
            <ColorPalette
              value={section.color}
              onChange={(color) => void store.updateTodoSection(section.id, { color })}
            />
          </div>
        )}

        <div className="todo-section-list">
          {roots.length === 0 ? (
            <div className="empty">Пусто</div>
          ) : (
            roots.map((t) => (
              <TodoNode
                key={t.id}
                todo={t}
                byParent={byParent}
                onEdit={onEdit}
                onAddSubtask={onAddSubtask}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="todos-view">
      <div className="todos-toolbar">
        <div className="card-title">Список дел</div>
        {total > 0 ? (
          <span className="muted">
            Выполнено: {doneCount} из {total}
          </span>
        ) : (
          <span className="muted">Пока пусто — добавь первое дело кнопкой в шапке</span>
        )}
        <div className="spacer" />
        <button type="button" className="ghost" onClick={() => setSectionEditor({ section: null })}>
          Добавить раздел
        </button>
      </div>

      <div className="todos-grid">
        {sections.map((s, i) => renderBlock(s, i))}
        {renderBlock(null, sections.length)}
      </div>

      {sectionEditor && (
        <TodoSectionModal section={sectionEditor.section} onClose={() => setSectionEditor(null)} />
      )}
      {deleting && (
        <DeleteSectionModal
          section={deleting}
          count={countIn(deleting.id)}
          onClose={() => setDeleting(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
});
