import { FormEvent, useEffect, useState } from 'react';
import { TodoSection } from '../api/client';
import { store } from '../stores/FinanceStore';
import { ColorPalette, DEFAULT_COLOR } from './ColorPalette';

interface Props {
  section: TodoSection | null;
  onClose: () => void;
}

export function TodoSectionModal({ section, onClose }: Props) {
  const [name, setName] = useState(section?.name ?? '');
  const [color, setColor] = useState(section?.color ?? DEFAULT_COLOR);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(section?.name ?? '');
    setColor(section?.color ?? DEFAULT_COLOR);
  }, [section?.id, section?.name, section?.color]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return;
    setBusy(true);
    try {
      if (section) await store.updateTodoSection(section.id, { name: value, color });
      else await store.addTodoSection({ name: value, color });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel todo-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>{section ? 'Изменить раздел' : 'Новый раздел'}</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="todo-form" onSubmit={(e) => void submit(e)}>
          <label className="field-label" htmlFor="section-name">
            Название
          </label>
          <input
            id="section-name"
            value={name}
            maxLength={60}
            autoFocus
            placeholder="Например, Работа"
            onChange={(e) => setName(e.target.value)}
          />

          <span className="field-label">Цвет блока</span>
          <ColorPalette value={color} onChange={setColor} />

          <div className="row todo-form-actions">
            <button type="button" className="ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="primary" disabled={busy || !name.trim()}>
              {section ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
