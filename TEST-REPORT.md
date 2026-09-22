# Instrument PNG Library Test Report

## Automated real-browser coverage

Latest local run: Chromium at 1366 × 768 and 390 × 844. Result: 16 instruments, 24 classroom cards, zero unexpected console errors, zero failed requests, and successful checks for point totals `0`, `9`, `25`, `100`, `999`, `1,250`, and `-5`.

The Playwright test in `tests/instrument-identity.cjs` verifies:

- The default 24-student class renders as instrument and points panels.
- All 16 stable instrument IDs can be assigned and render as 16 separate 512 × 512 transparent PNG files.
- PNG dimensions and successful browser decoding are checked at runtime.
- Classroom, roster, dialog, and profile previews share the same centralized artwork paths.
- A deliberately missing image produces the neutral fallback without breaking the card.
- Instrument assignments persist after refresh.
- Changing an instrument preserves the student balance and event history.
- Keyboard selection, point awarding, and Undo work.
- Search and class switching work.
- A fictional class and student can be created with an instrument assignment.
- New students begin with zero points; editing a name or instrument preserves the stable ID and balance.
- Names containing apostrophes, hyphens, and accents render and persist safely.
- Pasted rosters ignore blank lines, preview additions, and flag both within-list and existing-roster duplicates.
- Students can be archived and restored without losing balances or instruments.
- Archived students disappear from classroom and reward-recipient views.
- Settings provides direct entry points to roster and reward management, with a clear return control.
- Unsaved and cancelled reward drafts do not alter the catalog.
- Blank, zero, negative, fractional, and nonnumeric reward costs are rejected.
- Reward add, edit, hide/show, and ordering preserve stable reward IDs.
- Hidden rewards are not redeemable, and an all-hidden catalog shows a safe empty state.
- Redemptions deduct the current cost once and record reward/student/class snapshots.
- Later reward edits do not rewrite historical redemption titles or costs.
- Backup export contains `instrumentId` values.
- Backup export/restore reproduces reward customization, order, availability, archive status, instrument assignments, balances, and history.
- Invalid backups leave current data unchanged.
- A legacy free-text `Bass clarinet` value migrates to `bass-clarinet`.
- Older students and rewards missing the new fields migrate safely with unique IDs and defaults.
- Point totals `0`, `9`, `25`, `100`, `999`, `1,250`, and `-5` fit their panels.
- The 1366 × 768 and 390 × 844 layouts have no horizontal page overflow.
- No application console errors, failed requests, or missing assets occur.

## Visual inspection

The retained screenshots in `proof/` were inspected for:

- Name, instrument, and point hierarchy across 24 cards.
- Instrument contrast against the cream badge area.
- Full-size artwork, a 4 × 4 contact sheet, and 96px and 64px derivatives.
- Distinction between clarinet and bass clarinet, the three saxophones, euphonium and tuba, electric bass and acoustic guitar, and percussion and mallets/bells.
- Four-digit point readability.
- Selected-state visibility.
- Roster assignment controls and previews.
- Settings management cards, reward rows, availability badges, and ordering controls.
- Narrow-screen stacking.

## Known limitations

- At classroom-card size, related instruments still rely on both silhouette and their visible text labels. The three saxophones intentionally use different proportions, but labels remain important from the front of the room.
- Previously uploaded avatar data remains preserved for compatibility but has no normal interface for viewing or editing.
- Data remains local to the current browser and device; regular backup exports are still required.
- The application intentionally has no permanent-delete flow for students; archiving is the safe roster-removal path.
