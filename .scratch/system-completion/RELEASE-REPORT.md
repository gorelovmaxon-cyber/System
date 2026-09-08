# System2 v1 release acceptance

Date: 2026-09-08
Decision: **v1 NOT READY**

The independent acceptance pass verified the local contracts and negative
fallbacks, but the required end-to-end path cannot be accepted while Khoj and
Activepieces are not running. No mock/fixture is counted as live success.

## Requirement matrix

| Requirement | Evidence | Status | Owner / next fix |
|---|---|---|---|
| R01 workflow/roles/gates | SC-01 `e4fe4aa`, `docs/system-workflow.md` | done | — |
| R02 portable memory/registry | SC-02 `38ab421`, resolver checks | done | — |
| R03 quality/statuses/writer | SC-03 `f0a2628`, SC-08 `cee806e` | done | — |
| R04 Khoj/index/search | SC-04 `9aa3c14` | blocked | SC-04-fix: provide Python 3.12 or verified compatible release, install/index/health |
| R05 retrieval/fallback | SC-05 `124a50b`, local fallback check | awaiting-validation | SC-05-fix: repeat positive queries against live Khoj |
| R06 Activepieces/flow | SC-06 `8c5252d`, SC-09 `4525410` | blocked | SC-06-fix/SC-09-fix: Docker, UI, AI connection, live flow |
| R07 event→writer→Git | SC-07 `8cd0edd`, SC-08, SC-11 | awaiting-validation | SC-09/11 live delivery after Activepieces |
| R08 fresh index/no loop | SC-10 `ffb95e1`, local failed-queue check | blocked | SC-10-fix: configure Khoj reindex API and recovery test |
| R09 second device/recovery | SC-12/13, isolated clone | awaiting-validation | SC-13-fix: real second-PC drill and conflict/restore evidence |
| R10 Figma MCP | SC-14 `32604a6`, fixture + real SDK client | awaiting-validation | SC-14-fix: live file/key verification |
| R11 route workflows | SC-15 `f747837`, four dry-runs | done | — |
| R12 evidence/economics | SC-16 `867969d`, templates/SUMMARY | awaiting-validation | SC-16-fix: apply to a complete live cycle |
| R13 operations/recovery | SC-17 `bf070b4`, runbook/doctor | blocked | SC-17-fix: live service restore and index/flow recovery |

## Acceptance runs

- Figma fixture and real SDK MCP client: 2/2 tests passed.
- Retrieval with Khoj unavailable: `ok:false`, `fallback:local`; no-match query
  returned an empty local fallback.
- Portable hook: isolated clone installer ran twice; one empty commit produced
  exactly one pending event.
- Route selector: dev/sites/marketing and ambiguous dry-runs matched expected
  outcomes.
- Doctor/sync: commands run and report missing services/actionable instructions.
- Full SPEC cycle `event → Activepieces AI → bridge → index → search → sync →
  second device` was not passed: Docker, Khoj, AI connection, Figma live access
  and real second PC are unavailable.

## Blockers and safety

1. Install/validate a compatible Khoj runtime and record its actual reindex API.
2. Install Docker Desktop/WSL, start the pinned Activepieces stack, configure
   owner/AI connection and verify `host.docker.internal:8643`.
3. Run SC-09 positive/negative/retry scenarios, then SC-10 freshness recovery.
4. Repeat SC-13 on a real second PC and SC-14 against a permitted Figma file.

No real push was made. The remote profile is not deployed. Existing user
uncommitted files are preserved and are not release evidence.
