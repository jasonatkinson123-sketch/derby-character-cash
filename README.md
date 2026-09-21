# Derby Character Cash

Static, browser-local classroom recognition application. GitHub Pages serves the files directly; no backend or student login is used.

## Instrument identity cards

Each classroom card contains three clearly separated pieces of information:

1. Student display name
2. Locally bundled instrument illustration and label
3. High-contrast point total

The instrument catalog lives in `app.js` and uses stable `instrumentId` values. Finished vector artwork is bundled in `assets/instruments.svg`. Replacing the artwork for a symbol ID does not require changing saved student records.

Teachers assign instruments from **Class Setup**. The roster table supports immediate assignment changes, and the Add/Edit Student dialog includes an instrument preview.

## Teacher management

**Settings** is the teacher control panel:

- **Manage Classes & Students** opens the shared Class Setup roster. Add one student, preview and import pasted names, edit names and instruments, archive students, or restore archived records. New students begin at zero points.
- **Customize Rewards** adds and edits rewards through explicit Save/Cancel forms. Rewards have stable IDs, locally bundled icons, positive whole-number costs, availability, and a saved display order.
- Hidden rewards remain editable but cannot be redeemed. If every reward is hidden, the Rewards screen shows a safe empty state.

Student IDs—not display names—connect balances and history. Renaming, reordering, and reward edits therefore do not rewrite existing transactions.

## Data compatibility

- Existing free-text `instrument` values are mapped to `instrumentId` when recognized.
- Existing students receive a safe `archived: false` default. Archiving is reversible and does not remove balances, history, instruments, or legacy fields.
- Existing rewards receive unique stable IDs, `available: true`, and deterministic display ordering without duplicating the catalog.
- New redemptions save a snapshot of reward ID, title, charged cost, student ID, class ID, and timestamp. Older transactions are preserved as recorded.
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

The test uses fictional data and covers the classroom workflow, all 16 instruments, editable rosters, bulk-name validation, archive/restore, reward validation and editing, redemption snapshots, persistence, current and legacy migration, backup/restore, points and undo, keyboard use, and responsive layouts.
