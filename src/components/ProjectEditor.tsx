import type { Project } from '../../shared/data';
import { PALETTE } from '../colors';
import type { Month } from '../months';
import { NumberInput } from './NumberInput';

type Props = {
  project: Project;
  months: Month[];
  onChange: (project: Project) => void;
  onDelete: () => void;
};

export function ProjectEditor({ project, months, onChange, onDelete }: Props) {
  const setHours = (key: string, value: number) => {
    const hours = { ...project.hours };
    if (value > 0) hours[key] = value;
    else delete hours[key];
    onChange({ ...project, hours });
  };

  return (
    <div className="editor">
      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={project.name}
          autoFocus={project.name === 'New project'}
          onFocus={(e) => project.name === 'New project' && e.target.select()}
          onChange={(e) => onChange({ ...project, name: e.target.value })}
        />
      </label>

      <div className="field">
        <span>Color</span>
        <div className="colors">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`color-chip${c === project.color.toLowerCase() ? ' active' : ''}`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
              onClick={() => onChange({ ...project, color: c })}
            />
          ))}
          <input
            type="color"
            value={project.color}
            aria-label="Custom color"
            onChange={(e) => onChange({ ...project, color: e.target.value })}
          />
        </div>
      </div>

      <div className="field">
        <span>Weekly hours per month</span>
        <div className="hours-grid">
          {months.map((m) => (
            <label key={m.key} className="hours-cell">
              <span>
                {m.label}
                {(m.month === 0 || m.month === 8) && <small> {String(m.year).slice(2)}</small>}
              </span>
              <NumberInput
                value={project.hours[m.key]}
                onCommit={(v) => setHours(m.key, v)}
                placeholder="0"
                aria-label={`${m.label} ${m.year} hours per week`}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="editor-actions">
        <button
          className="btn danger"
          onClick={() => {
            if (confirm(`Delete "${project.name || 'Untitled'}"? This can't be undone.`)) onDelete();
          }}
        >
          Delete project
        </button>
      </div>
    </div>
  );
}
