# SC-12 report

Status: awaiting-validation

- Added `scripts/memory/init-project.js` and the
  `project-memory-init` skill with stable project IDs, explicit registration
  for unknown projects, one shared memory root and marker-scoped updates.
- Initialized the current System2 project: `CLAUDE.md` and `HANDOFF.md` each
  contain exactly one `systemqwen:start/end` section; a second init remained
  idempotent.
- Updated auto-learn, autopilot, start, handoff and the memory contract so one
  session-summary is separate from confirmed-knowledge capture and HANDOFF
  records unfinished work/next step.
- Updated project registry facts with the actual System2 HANDOFF link; external
  projects were not touched.
- Checks passed: init twice, marker counts 1/1 in both files, no `.system-memory`
  created. Full temporary-project manual-edit case remains to be repeated in a
  clean clone; SC-13/second-PC validation remains separate.
