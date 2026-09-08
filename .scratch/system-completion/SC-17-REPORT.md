# SC-17 report

Status: blocked

- Rewrote `docs/system-operations.md` with ordered startup, health/diagnosis,
  queue/index recovery, rollback, backup/restore, manual secret handling and
  future remote-profile boundaries.
- Added links from QUICKSTART/usage and recorded operational ports/status in
  ENVIRONMENT; corrected the historical GitHub memory rule to explicit sync.
- `node scripts/memory/doctor.js --json` and `node scripts/memory/sync.js --status`
  run locally and report the expected unavailable-service conditions without
  hiding them.
- Backup contents and same/new-device procedure are documented; no real keys or
  personal external-project data were copied.
- Live flow restore, Khoj index rebuild and full service runbook pass remain
  blocked by SC-04/SC-06 infrastructure; remote profile is explicitly not
  deployed.
