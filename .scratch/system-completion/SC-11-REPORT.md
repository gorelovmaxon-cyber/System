# SC-11 report

Status: awaiting-validation

- Added repository-managed `.git-hooks-templates/post-commit` and an installer
  that configures relative `core.hooksPath`, refuses an existing user hook
  without `--force`, and makes a timestamped backup when forced.
- Hook captures non-service commits into the SC-07 queue, is fail-open, and
  never pushes; `auto-learn:` and `system2-index:` commits are excluded.
- Added `scripts/memory/project-id.js` and explicit `sync.js --status` /
  `sync.js --push [--branch]`; divergence/offline errors are visible and no
  force/reset operation is used.
- Local status check passed: branch `master`, no upstream, no memory/config
  changes. Current machine hook was not switched because it is a pre-existing
  user hook; installer correctly refused without `--force`.
- Isolated clone smoke test passed: installer ran twice (second run was
  idempotent), an empty commit created exactly one pending SC-07 commit event,
  and no real push was made.
