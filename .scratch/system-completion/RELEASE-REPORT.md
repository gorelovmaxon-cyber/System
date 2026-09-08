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

## Publication status (2026-09-08)

All local work is now pushed to `github.com/gorelovmaxon-cyber/System` (branch
`master`): the full SC-01…SC-18 package (SPEC/PLAN/SONNET_PROMPT, tickets,
SUMMARY), every ticket report, this release report, and all code/docs the
executor produced. Commit series `e4fe4aa` (SC-01) and `38ab421…a45b515`
(SC-02…SC-18).

What is honest to claim: SC-01 is accepted by the planner (its report records
the verdict). Everything else is executor-verified locally only — summary
statuses in `issues/SUMMARY.md` reflect the executor's own checks, NOT an
independent acceptance pass. Live items (Khoj on a compatible Python,
Docker/Activepieces stack, AI connection, real Figma file, second PC) were
never exercised and stay `blocked`/`awaiting-validation`.

What to check next (each needs external access or a manual step — see the
blocker list above and ticket reports):
1. Khoj: install on Python 3.12, run health/index/search, record real reindex API (SC-04/SC-05/SC-10).
2. Activepieces: Docker Desktop/WSL, pinned 0.86.3 stack, owner + AI key, live flow event→writer (SC-06/SC-09/SC-11).
3. Figma MCP against a permitted file/API key (SC-14), then route workflows (SC-15).
4. Second-PC recovery drill incl. conflict/restore evidence (SC-13/SC-17).
5. Independent acceptance review by the planner of SC-02…SC-18 diffs against tickets.

Where to move next: perform the independent acceptance review first (item 5,
no code writing), then resolve blockers 1–4 in order; each fix gets its own
ticket and commit. Do not mark v1 ready until the full event→…→second-device
cycle runs against live services.
