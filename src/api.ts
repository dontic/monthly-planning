import type { PlanningData } from '../shared/data';

export async function loadData(): Promise<PlanningData> {
  const res = await fetch('/api/data');
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  return res.json();
}

export async function saveData(data: PlanningData, keepalive = false): Promise<void> {
  const res = await fetch('/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive,
  });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
}
