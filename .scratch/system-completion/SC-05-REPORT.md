# SC-05 report

Status: awaiting-validation

## Delivered

- Added `scripts/memory/search.js` as the single CLI/module adapter for query,
  project scope, limits, budgets, timeout, health and Khoj result normalization.
- Added path traversal protection, project registry validation, frontmatter
  status/scope mapping and a bounded local Markdown fallback.
- Added explicit error classes: `khoj-unavailable`, `timeout`,
  `unauthorized`, and `invalid-response`; failure remains fail-open with
  `fallback_results`.
- Replaced direct curl instructions in autopilot Phase 0.5 and added the same
  mandatory-files-before-retrieval rule to `start`.
- Updated search configuration, memory contract, scripts README and Khoj
  integration documentation.

## Verification

- Local query with Khoj unavailable returned `ok:false`,
  `error:khoj-unavailable`, `fallback:local` and bounded in-root results.
- A query with no matching knowledge returned `fallback_results:[]`.
- Unknown `project_id` returned a clear `unknown project_id` request error.
- `node --check scripts/memory/search.js` passed.

> Уточнение 2026-09-11: `node --check` подтверждает только синтаксис и не является
> функциональной проверкой. Функциональное evidence теперь дают регрессии
> project isolation, custom memory root, config merge и allowed-before-forbidden;
> положительный live Khoj всё ещё `awaiting-validation`.

Khoj itself is not installed/running on this machine, so positive live search,
health and API error simulation against the real service remain
`awaiting-validation`; SC-04 is the external prerequisite.
