# Monthly planning

Plan weekly hours per project across a September → August year, shown as a stacked timeline
with dashed 50 h (weekdays) and 70 h (full week) capacity lines.

Projects belong to a single cycle (Sep → Aug). Each new cycle starts with an empty list, so
projects you dropped don't carry over. Data lives in `data/planning.json` (one project list per
cycle, keyed by its start year) and is saved automatically on every change.

## Use it (always-on, Docker)

```sh
docker compose up -d --build
```

Open http://localhost:3000. The `data/` folder is mounted into the container, so your file stays on disk.

## Develop

Open the folder in VS Code and choose **Reopen in Container** (Node is preinstalled there), then:

```sh
npm run dev      # API on :3000 + Vite on :5173 (open this one)
npm run build    # type-check + production build
npm start        # serve the built app and API on :3000
```

Environment variables: `PORT` (3000), `HOST` (127.0.0.1), `DATA_FILE` (`data/planning.json`).

## Layout

- `server/index.ts`: Express API (`GET`/`PUT /api/data`), atomic writes to the JSON file
- `shared/data.ts`: data types, defaults and validation used by both sides
- `src/components/Timeline.tsx`: the stacked SVG chart
- `src/components/ProjectPanel.tsx`, `ProjectEditor.tsx`: project list, reordering, editing
