import { useState } from 'react';
import type { Project } from '../../shared/data';
import type { Month } from '../months';
import { ProjectEditor } from './ProjectEditor';

type Props = {
  projects: Project[];
  months: Month[];
  currentKey: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onChange: (project: Project) => void;
  onDelete: (id: string) => void;
  onMove: (from: number, to: number) => void;
};

export function ProjectPanel({ projects, months, currentKey, selectedId, onSelect, onAdd, onChange, onDelete, onMove }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Insertion point while dragging: the dragged project goes before this index (0..length).
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const endDrag = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const drop = () => {
    if (dragIndex !== null && dropIndex !== null) {
      const to = dropIndex > dragIndex ? dropIndex - 1 : dropIndex;
      if (to !== dragIndex) onMove(dragIndex, to);
    }
    endDrag();
  };

  return (
    <aside className="panel">
      <div className="panel-head">
        <h2>Projects</h2>
        <button className="btn primary" onClick={onAdd}>
          + Add project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="empty">
          No projects in this cycle yet. Add the ones you want to work on from Sep {months[0].year} to Aug{' '}
          {months[11].year}.
        </p>
      ) : (
        <p className="hint">Drag to reorder. The top project sits on top of the chart. Switch a project off to leave it out.</p>
      )}

      <ol className="project-list">
        {projects.map((p, i) => {
          const selected = p.id === selectedId;
          const classes = [
            'project',
            selected && 'selected',
            p.hidden && 'off',
            dragIndex === i && 'dragging',
            dropIndex === i && dragIndex !== null && 'drop-before',
            dropIndex === projects.length && i === projects.length - 1 && dragIndex !== null && 'drop-after',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <li
              key={p.id}
              className={classes}
              onDragOver={(e) => {
                if (dragIndex === null) return;
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                setDropIndex(e.clientY < rect.top + rect.height / 2 ? i : i + 1);
              }}
              onDrop={(e) => {
                e.preventDefault();
                drop();
              }}
            >
              <div
                className="project-row"
                role="button"
                tabIndex={0}
                aria-expanded={selected}
                draggable
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', p.id);
                }}
                onDragEnd={endDrag}
                onClick={() => onSelect(selected ? null : p.id)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(selected ? null : p.id);
                  }
                }}
              >
                <button
                  className="handle"
                  aria-label={`Move ${p.name}. Use arrow up and down keys.`}
                  title="Drag to reorder (or focus and use ↑/↓)"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      onMove(i, i - 1);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      onMove(i, i + 1);
                    }
                  }}
                >
                  ⠿
                </button>
                <span className="swatch" style={{ background: p.color }} />
                <span className="project-name">{p.name || 'Untitled'}</span>
                <span className="project-meta">{summary(p, months, currentKey)}</span>
                <input
                  type="checkbox"
                  role="switch"
                  className="switch"
                  checked={!p.hidden}
                  aria-label={`Show ${p.name || 'Untitled'} on the chart`}
                  title={p.hidden ? 'Off: not on the chart' : 'On: shown on the chart'}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onChange({ ...p, hidden: !e.target.checked })}
                />
              </div>
              {selected && (
                <ProjectEditor project={p} months={months} onChange={onChange} onDelete={() => onDelete(p.id)} />
              )}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

function summary(p: Project, months: Month[], currentKey: string): string {
  const values = months.map((m) => p.hours[m.key] ?? 0);
  if (values.every((v) => v === 0)) return 'no hours';
  if (months.some((m) => m.key === currentKey)) return `${p.hours[currentKey] ?? 0} h/wk now`;
  return `peak ${Math.max(...values)} h/wk`;
}
