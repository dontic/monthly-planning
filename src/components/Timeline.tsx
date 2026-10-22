import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Project, Settings } from '../../shared/data';
import type { Month } from '../months';
import { NumberInput } from './NumberInput';

type Props = {
  months: Month[];
  projects: Project[];
  settings: Settings;
  currentKey: string;
  onSettingsChange: (settings: Settings) => void;
};

type Series = { project: Project; values: number[]; y0: number[]; y1: number[] };

const HEIGHT = 440;
const M = { top: 20, right: 20, bottom: 48, left: 48 };

export function Timeline({ months, projects, settings, currentKey, onSettingsChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  // null until measured, so the bands don't animate in from a guessed width
  const [width, setWidth] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrapRef.current!;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stack from the bottom up, so the first project in the list ends up on top.
  // A project with 0 hours in a month has zero thickness there, so the bands
  // around it close the gap automatically.
  const { series, totals } = useMemo(() => {
    const base = months.map(() => 0);
    const series: Series[] = [...projects]
      .reverse()
      .map((project) => {
        const values = months.map((m) => project.hours[m.key] ?? 0);
        const y0 = [...base];
        values.forEach((v, i) => (base[i] += v));
        return { project, values, y0, y1: [...base] };
      })
      .reverse();
    return { series, totals: base };
  }, [projects, months]);

  const n = months.length;
  const innerW = Math.max((width ?? 0) - M.left - M.right, 120);
  const innerH = HEIGHT - M.top - M.bottom;
  const colW = innerW / n;

  const { weekdayCapacity, weekCapacity, showWeekday, showWeek } = settings;
  const peak = Math.max(10, ...totals, showWeekday ? weekdayCapacity : 0, showWeek ? weekCapacity : 0);
  const tickStep = peak > 120 ? 20 : 10;
  const yMax = Math.ceil((peak * 1.08) / tickStep) * tickStep;
  const ticks = Array.from({ length: yMax / tickStep + 1 }, (_, i) => i * tickStep);

  const x = (i: number) => M.left + i * colW;
  const y = (h: number) => M.top + innerH * (1 - h / yMax);

  // Each month is a flat step; neighbouring months are joined by a short slope.
  const ramp = Math.min(colW * 0.12, 10);
  const edge = (arr: number[]) =>
    arr.flatMap((v, i) => [
      [i === 0 ? x(0) : x(i) + ramp, y(v)],
      [i === n - 1 ? x(n) : x(i + 1) - ramp, y(v)],
    ]);
  const bandPath = (s: Series) =>
    'M' +
    [...edge(s.y1), ...edge(s.y0).reverse()].map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join('L') +
    'Z';

  const thresholds = [
    showWeekday && { value: weekdayCapacity, label: `${weekdayCapacity} h · weekdays`, cls: 'weekday' },
    showWeek && { value: weekCapacity, label: `${weekCapacity} h · full week`, cls: 'week' },
  ].filter((t): t is { value: number; label: string; cls: string } => !!t);

  const overClass = (total: number) =>
    total > weekCapacity ? 'over-week' : total > weekdayCapacity ? 'over-weekday' : '';

  const planned = totals.filter((t) => t > 0);
  const average = planned.length ? planned.reduce((a, b) => a + b, 0) / planned.length : 0;
  const overMonths = totals.filter((t) => t > weekdayCapacity).length;

  return (
    <section className="chart-card">
      <div className="chart-head">
        <h2>Weekly hours</h2>
        <div className="toggles">
          <div className="toggle">
            <label>
              <input
                type="checkbox"
                checked={showWeekday}
                onChange={(e) => onSettingsChange({ ...settings, showWeekday: e.target.checked })}
              />
              <span className="dash weekday" />
              Weekdays
            </label>
            <NumberInput
              className="cap"
              value={weekdayCapacity}
              onCommit={(v) => v > 0 && onSettingsChange({ ...settings, weekdayCapacity: v })}
              aria-label="Weekday capacity in hours"
            />
            <span>h</span>
          </div>
          <div className="toggle">
            <label>
              <input
                type="checkbox"
                checked={showWeek}
                onChange={(e) => onSettingsChange({ ...settings, showWeek: e.target.checked })}
              />
              <span className="dash week" />
              Full week
            </label>
            <NumberInput
              className="cap"
              value={weekCapacity}
              onCommit={(v) => v > 0 && onSettingsChange({ ...settings, weekCapacity: v })}
              aria-label="Full week capacity in hours"
            />
            <span>h</span>
          </div>
        </div>
      </div>

      <div className="chart-wrap" ref={wrapRef} style={{ height: HEIGHT }} onMouseLeave={() => setHover(null)}>
        {width !== null && (
        <svg width={width} height={HEIGHT} role="img" aria-label="Stacked weekly hours per project, by month">
          {/* month backgrounds: current month and over-capacity months */}
          {months.map((m, i) => (
            <rect
              key={m.key}
              className={['col-bg', m.key === currentKey && 'current', overClass(totals[i]), hover === i && 'hover']
                .filter(Boolean)
                .join(' ')}
              x={x(i)}
              y={M.top}
              width={colW}
              height={innerH}
            />
          ))}

          {ticks.map((t) => (
            <g key={t}>
              <line className="grid" x1={M.left} x2={x(n)} y1={y(t)} y2={y(t)} />
              <text className="tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                {t}
              </text>
            </g>
          ))}

          {series.map(
            (s) =>
              s.values.some((v) => v > 0) && (
                <path key={s.project.id} className="band" d={bandPath(s)} fill={s.project.color} />
              ),
          )}

          {series.map((s) => {
            const span = labelSpan(s.values.map((v) => (v / yMax) * innerH >= 18));
            if (!span) return null;
            const { mid, columns } = span;
            const maxChars = Math.floor((columns * colW - 12) / 7);
            if (maxChars < 4) return null;
            const name = s.project.name.length > maxChars ? s.project.name.slice(0, maxChars - 1) + '…' : s.project.name;
            return (
              <text
                key={s.project.id}
                className="band-label"
                x={x(mid) + colW / 2}
                y={y((s.y0[mid] + s.y1[mid]) / 2)}
                dy="0.32em"
                textAnchor="middle"
              >
                {name}
              </text>
            );
          })}

          {thresholds.map((t) => (
            <g key={t.cls} className={`threshold ${t.cls}`}>
              <line x1={M.left} x2={x(n)} y1={y(t.value)} y2={y(t.value)} />
              <text x={x(n) - 6} y={y(t.value) - 6} textAnchor="end">
                {t.label}
              </text>
            </g>
          ))}

          <line className="axis" x1={M.left} x2={x(n)} y1={y(0)} y2={y(0)} />
          {months.map((m, i) => (
            <g key={m.key} className={m.key === currentKey ? 'month current' : 'month'}>
              <text x={x(i) + colW / 2} y={HEIGHT - M.bottom + 20} textAnchor="middle">
                {m.label}
              </text>
              {(i === 0 || m.month === 0) && (
                <text className="year" x={x(i) + colW / 2} y={HEIGHT - M.bottom + 36} textAnchor="middle">
                  {m.year}
                </text>
              )}
            </g>
          ))}

          {/* hover targets on top of everything */}
          {months.map((m, i) => (
            <rect
              key={m.key}
              className="hit"
              x={x(i)}
              y={M.top}
              width={colW}
              height={innerH}
              onMouseEnter={() => setHover(i)}
              onClick={() => setHover(i)}
            />
          ))}
        </svg>
        )}

        {projects.length === 0 && <div className="chart-empty">Add a project, or switch one on, to start planning your year.</div>}

        {hover !== null && projects.length > 0 && (
          <Tooltip
            month={months[hover]}
            series={series}
            index={hover}
            total={totals[hover]}
            settings={settings}
            style={
              hover < n / 2
                ? { left: x(hover + 1) + 8, top: M.top }
                : { left: x(hover) - 8, top: M.top, transform: 'translateX(-100%)' }
            }
          />
        )}
      </div>

      <p className="chart-foot">
        Average planned: <strong>{average.toFixed(1)} h/wk</strong>
        {overMonths > 0 && (
          <>
            {' · '}
            <span className="warn">
              {overMonths} {overMonths === 1 ? 'month' : 'months'} over {weekdayCapacity} h
            </span>
          </>
        )}
      </p>
    </section>
  );
}

/**
 * Picks where to put a band's label: the middle of the longest run of months where
 * the band is thick enough, and how many columns of width it can use there.
 */
function labelSpan(fits: boolean[]): { mid: number; columns: number } | null {
  let [a, b] = [-1, -2];
  for (let i = 0, start = -1; i < fits.length; i++) {
    if (!fits[i]) continue;
    if (start < 0) start = i;
    if (i === fits.length - 1 || !fits[i + 1]) {
      if (i - start > b - a) [a, b] = [start, i];
      start = -1;
    }
  }
  if (a < 0) return null;
  const mid = Math.floor((a + b) / 2);
  return { mid, columns: Math.min(mid - a, b - mid) * 2 + 1 };
}

function Tooltip({
  month,
  series,
  index,
  total,
  settings,
  style,
}: {
  month: Month;
  series: Series[];
  index: number;
  total: number;
  settings: Settings;
  style: CSSProperties;
}) {
  const rows = series.filter((s) => s.values[index] > 0);
  const free = settings.weekdayCapacity - total;
  return (
    <div className="tooltip" style={style}>
      <div className="tooltip-title">
        {month.label} {month.year}
      </div>
      {rows.length === 0 ? (
        <div className="tooltip-empty">Nothing planned</div>
      ) : (
        <ul>
          {rows.map((s) => (
            <li key={s.project.id}>
              <span className="swatch" style={{ background: s.project.color }} />
              <span className="tooltip-name">{s.project.name || 'Untitled'}</span>
              <span className="tooltip-value">{s.values[index]} h</span>
            </li>
          ))}
        </ul>
      )}
      <div className="tooltip-total">
        <span>Total</span>
        <strong>{total} h/wk</strong>
      </div>
      <div className={free < 0 ? 'tooltip-free over' : 'tooltip-free'}>
        {free >= 0 ? `${free} h free on weekdays` : `${-free} h over weekday capacity`}
      </div>
    </div>
  );
}
