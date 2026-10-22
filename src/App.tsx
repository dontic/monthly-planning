import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlanningData, Project, Settings } from '../shared/data';
import { loadData, saveData } from './api';
import { nextColor } from './colors';
import { currentMonthKey, planningMonths, planningYearStart } from './months';
import { ProjectPanel } from './components/ProjectPanel';
import { Timeline } from './components/Timeline';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DELAY_MS = 400;

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export default function App() {
  const [data, setData] = useState<PlanningData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [startYear, setStartYear] = useState(planningYearStart);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Latest unsaved snapshot, and a chain that keeps saves in order.
  const pending = useRef<PlanningData | null>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const flush = useCallback(() => {
    const snapshot = pending.current;
    if (!snapshot) return;
    pending.current = null;
    setStatus('saving');
    saveChain.current = saveChain.current
      .then(() => saveData(snapshot))
      .then(() => {
        if (!pending.current) setStatus('saved');
      })
      .catch(() => {
        pending.current ??= snapshot;
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    if (!pending.current) return;
    setStatus('saving');
    const timer = setTimeout(flush, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data, flush]);

  // Don't lose the last edit if the tab is closed during the save delay.
  useEffect(() => {
    const onHide = () => {
      if (pending.current) saveData(pending.current, true).catch(() => {});
    };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, []);

  const update = useCallback((fn: (d: PlanningData) => PlanningData) => {
    setData((d) => {
      if (!d) return d;
      const next = fn(d);
      pending.current = next;
      return next;
    });
  }, []);

  const months = useMemo(() => planningMonths(startYear), [startYear]);
  const currentKey = currentMonthKey();
  const thisYear = planningYearStart();

  if (loadError) {
    return (
      <div className="fatal">
        <h1>Couldn't load your data</h1>
        <p>{loadError}</p>
        <p>Is the server running? Start it with <code>npm run dev</code>.</p>
      </div>
    );
  }
  if (!data) return <div className="fatal">Loading…</div>;

  const projects = data.years[startYear] ?? [];
  // Applies a change to the visible cycle's project list; empty cycles are dropped from the file.
  const updateProjects = (fn: (projects: Project[]) => Project[]) =>
    update((d) => {
      const next = fn(d.years[startYear] ?? []);
      const years: PlanningData['years'] = { ...d.years, [startYear]: next };
      if (next.length === 0) delete years[startYear];
      return { ...d, years };
    });

  const addProject = () => {
    const project: Project = { id: newId(), name: 'New project', color: nextColor(projects), hours: {} };
    updateProjects((ps) => [project, ...ps]);
    setSelectedId(project.id);
  };
  const changeProject = (project: Project) =>
    updateProjects((ps) => ps.map((p) => (p.id === project.id ? project : p)));
  const deleteProject = (id: string) => {
    updateProjects((ps) => ps.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const moveProject = (from: number, to: number) =>
    updateProjects((ps) => {
      if (to < 0 || to >= ps.length || from === to) return ps;
      const next = [...ps];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  const changeSettings = (settings: Settings) => update((d) => ({ ...d, settings }));

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Monthly planning</h1>
          <SaveIndicator status={status} onRetry={flush} />
        </div>
        <div className="year-nav">
          <button className="btn icon" onClick={() => setStartYear((y) => y - 1)} aria-label="Previous year">
            ‹
          </button>
          <span className="year-label">
            Sep {startYear} – Aug {startYear + 1}
          </span>
          <button className="btn icon" onClick={() => setStartYear((y) => y + 1)} aria-label="Next year">
            ›
          </button>
          {startYear !== thisYear && (
            <button className="btn ghost" onClick={() => setStartYear(thisYear)}>
              This year
            </button>
          )}
        </div>
      </header>

      <main className="layout">
        <ProjectPanel
          projects={projects}
          months={months}
          currentKey={currentKey}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={addProject}
          onChange={changeProject}
          onDelete={deleteProject}
          onMove={moveProject}
        />
        <Timeline
          months={months}
          projects={projects.filter((p) => !p.hidden)}
          settings={data.settings}
          currentKey={currentKey}
          onSettingsChange={changeSettings}
        />
      </main>
    </div>
  );
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'idle') return null;
  if (status === 'error') {
    return (
      <span className="save-status error">
        Save failed{' '}
        <button className="link" onClick={onRetry}>
          Retry
        </button>
      </span>
    );
  }
  return <span className={`save-status ${status}`}>{status === 'saving' ? 'Saving…' : 'Saved'}</span>;
}
