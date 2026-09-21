# Derby Character Cash

Static, browser-local classroom recognition application. GitHub Pages serves the files directly; no backend or student login is used.

## Instrument identity cards

Each classroom card contains three clearly separated pieces of information:

1. Student display name
2. Locally bundled instrument illustration and label
3. High-contrast point total

The instrument catalog lives in `app.js` and uses stable `instrumentId` values. Finished vector artwork is bundled in `assets/instruments.svg`. Replacing the artwork for a symbol ID does not require changing saved student records.

Teachers assign instruments from **Class Setup**. The roster table supports immediate assignment changes, and the Add/Edit Student dialog includes an instrument preview.

## Data compatibility

- Existing free-text `instrument` values are mapped to `instrumentId` when recognized.
- Unknown or missing values become the safe unassigned state.
- Student names, balances, history, classes, and settings are not changed by migration.
- Previously uploaded avatar blobs remain in IndexedDB and in exported/restored backups, but avatars are no longer shown in the normal interface.
- Backups continue to use the existing version-1 envelope and now include `instrumentId` inside each student record.

## Local preview

From the project directory:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Do not open `index.html` directly from the filesystem; serve it so the external SVG sprite behaves the same way it does on GitHub Pages.

## Browser tests

```bash
npm install
npx playwright install chromium
npm run test:browser
```

The test uses fictional data and covers the classroom workflow, all 16 instruments, persistence, migration, backup/restore, points and undo, keyboard use, and responsive layouts.
