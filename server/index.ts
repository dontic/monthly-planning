import express from 'express';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defaultData, isPlanningData, migrate, type PlanningData } from '../shared/data';
import { planningYearStart } from '../shared/cycle';

const PORT = Number(process.env.PORT ?? 4817);
const HOST = process.env.HOST ?? '127.0.0.1';
const DATA_FILE = path.resolve(process.env.DATA_FILE ?? 'data/planning.json');
const DIST_DIR = path.resolve('dist');

async function readData(): Promise<PlanningData> {
  let raw: string;
  try {
    raw = await readFile(DATA_FILE, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return defaultData();
    throw err;
  }
  const data = migrate(JSON.parse(raw), planningYearStart());
  if (!data) throw new Error('file does not contain valid planning data');
  return data;
}

// Writes are serialized and atomic: write a temp file, then rename it over the real one,
// so a crash mid-write never leaves a half-written planning.json behind.
let queue: Promise<unknown> = Promise.resolve();
function writeData(data: PlanningData): Promise<void> {
  const job = queue.then(async () => {
    await mkdir(path.dirname(DATA_FILE), { recursive: true });
    const tmp = `${DATA_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2) + '\n');
    await rename(tmp, DATA_FILE);
  });
  queue = job.catch(() => {});
  return job;
}

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/data', async (_req, res) => {
  try {
    res.json(await readData());
  } catch (err) {
    console.error(err);
    res.status(500).send(`Could not read ${DATA_FILE}: ${(err as Error).message}`);
  }
});

app.put('/api/data', async (req, res) => {
  if (!isPlanningData(req.body)) {
    res.status(400).send('Invalid planning data');
    return;
  }
  try {
    await writeData(req.body);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).send(`Could not write ${DATA_FILE}: ${(err as Error).message}`);
  }
});

// In production the built client is served from the same port.
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
}

app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST}:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
