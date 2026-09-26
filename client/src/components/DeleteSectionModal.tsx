import { RemoveSectionItems, TodoSection } from '../api/client';

interface Props {
  section: TodoSection;
  count: number;
  onClose: () => void;
  onConfirm: (mode: RemoveSectionItems) => void;
}

export function DeleteSectionModal({ section, count, onClose, onConfirm }: Props) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel todo-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>Удалить раздел?</h2>
          <button type="button" className="icon-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <p className="hint">
          В разделе «{section.name}» {count} дел. Что сделать с ними?
        </p>

        <div className="row todo-form-actions">
          <button type="button" className="ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="ghost" onClick={() => onConfirm('unassign')}>
            В «Без раздела»
          </button>
          <button type="button" className="danger" onClick={() => onConfirm('delete')}>
            Удалить дела
          </button>
        </div>
      </div>
    </div>
  );
}
