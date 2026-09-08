# SC-16 report

Status: awaiting-review

- Added `templates/evidence-report.md` as the required per-ticket evidence
  format and rewrote `templates/review-template.md` around requirement coverage,
  positive/negative/regression scenarios, limitations and status.
- Updated evidence-check, QA, ticket template and system workflow. The rules now
  explicitly reject “file exists”/`node --check` as functional evidence and
  require unknown reasons for unavailable cost metrics.
- Updated the package SUMMARY with factual commit/timing observations and
  `unknown` for unavailable retries/token/billing data; no unsupported savings
  claim was added.
- Defect-injection dry run: a synthetic report with one missing requirement is
  rejected by the reviewer checklist's mandatory Requirement coverage row; no
  accepted ticket was modified.
- Available tests remain ticket-specific; live SC-04/06/09/10 checks are still
  blocked and remain visible in their reports.
