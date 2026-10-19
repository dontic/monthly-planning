export type Project = {
  id: string;
  name: string;
  color: string;
  /** Weekly hours per month, keyed by "YYYY-MM". Months without hours are omitted. */
  hours: Record<string, number>;
};

export type Settings = {
  weekdayCapacity: number;
  weekCapacity: number;
  showWeekday: boolean;
  showWeek: boolean;
};

export type PlanningData = {
  version: 2;
  settings: Settings;
  /**
   * Projects per planning cycle, keyed by the year the cycle starts in (Sep YYYY → Aug YYYY+1).
   * Each cycle starts empty, so projects don't pile up across years. Within a cycle, projects
   * are in display order: the first one sits on top of the stack.
   */
  years: Record<string, Project[]>;
};

export function defaultData(): PlanningData {
  return {
    version: 2,
    settings: { weekdayCapacity: 50, weekCapacity: 70, showWeekday: true, showWeek: true },
    years: {},
  };
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isSettings = (s: unknown): s is Settings =>
  isObject(s) &&
  isNumber(s.weekdayCapacity) &&
  isNumber(s.weekCapacity) &&
  typeof s.showWeekday === 'boolean' &&
  typeof s.showWeek === 'boolean';

const isProjectList = (v: unknown): v is Project[] =>
  Array.isArray(v) &&
  v.every(
    (p) =>
      isObject(p) &&
      typeof p.id === 'string' &&
      typeof p.name === 'string' &&
      typeof p.color === 'string' &&
      isObject(p.hours) &&
      Object.values(p.hours).every((h) => isNumber(h) && h >= 0),
  );

export function isPlanningData(v: unknown): v is PlanningData {
  return (
    isObject(v) &&
    v.version === 2 &&
    isSettings(v.settings) &&
    isObject(v.years) &&
    Object.entries(v.years).every(([year, projects]) => /^\d{4}$/.test(year) && isProjectList(projects))
  );
}

/**
 * Upgrades older files: version 1 kept a single project list, which becomes the list of
 * the cycle given by `currentCycle`. Returns null if the data isn't recognised.
 */
export function migrate(v: unknown, currentCycle: number): PlanningData | null {
  if (isPlanningData(v)) return v;
  if (isObject(v) && v.version === 1 && isSettings(v.settings) && isProjectList(v.projects)) {
    return { version: 2, settings: v.settings, years: v.projects.length ? { [currentCycle]: v.projects } : {} };
  }
  return null;
}
