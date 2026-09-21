# Instrument Identity Card Test Report

## Automated real-browser coverage

The Playwright test in `tests/instrument-identity.cjs` verifies:

- The default 24-student class renders as instrument and points panels.
- All 16 stable instrument IDs can be assigned and render as 16 separate SVG symbols.
- Instrument assignments persist after refresh.
- Changing an instrument preserves the student balance and event history.
- Keyboard selection, point awarding, and Undo work.
- Search and class switching work.
- A fictional class and student can be created with an instrument assignment.
- Backup export contains `instrumentId` values.
- Backup restore reproduces instrument assignments.
- A legacy free-text `Bass clarinet` value migrates to `bass-clarinet`.
- Point totals `0`, `9`, `25`, `100`, `999`, `1,250`, and `-5` fit their panels.
- The 1366 × 768 and 390 × 844 layouts have no horizontal page overflow.
- No application console errors, failed requests, or missing assets occur.

## Visual inspection

The retained screenshots in `proof/` were inspected for:

- Name, instrument, and point hierarchy across 24 cards.
- Instrument contrast against the cream badge area.
- Four-digit point readability.
- Selected-state visibility.
- Roster assignment controls and previews.
- Narrow-screen stacking.

## Known limitations

- At classroom-card size, related instruments rely on both silhouette and their visible text labels. The three saxophones intentionally use different proportions, but labels remain important from a distance.
- Previously uploaded avatar data remains preserved for compatibility but has no normal interface for viewing or editing.
- Data remains local to the current browser and device; regular backup exports are still required.
