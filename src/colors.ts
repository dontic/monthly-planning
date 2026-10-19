import type { Project } from '../shared/data';

export const PALETTE = [
  '#4f7cff', '#f2994a', '#27ae60', '#eb5757', '#9b51e0',
  '#2d9cdb', '#e2b33c', '#e056a0', '#00a896', '#8d6e63',
];

export function nextColor(projects: Project[]): string {
  const used = new Set(projects.map((p) => p.color.toLowerCase()));
  return PALETTE.find((c) => !used.has(c)) ?? PALETTE[projects.length % PALETTE.length];
}
