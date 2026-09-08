# Evidence report — SC-XX

Status: awaiting-review | awaiting-validation | blocked | done
Date: YYYY-MM-DD
Commit: `<hash>`
Requirement IDs: Rxx
Source brief/task: `<path or user request>`

## Requirement coverage

| Requirement/criterion | Implemented behavior | Evidence | Result |
|---|---|---|---|
| Rxx / criterion | ... | command + relevant output + date | pass/fail/unknown |

## Checks and scenarios

Record exact command, working directory, date, concise actual output, and whether
the check is functional rather than merely syntactic. Include one positive,
negative/error and regression scenario from the ticket. A file existing,
`node --check`, or a green linter is not functional evidence by itself.

## Limitations

List every unrun live check, external dependency, missing access and manual step.
Use `awaiting-validation` for an unavailable validation and `blocked` when work
cannot continue. Never convert a mock or fixture into live-success evidence.

## Cost evidence

| Metric | Value | Source/method |
|---|---:|---|
| wall-clock time | ... or `unknown` | timer/log/recorded interval |
| retries/repeats | ... or `unknown` | command/log |
| context/input tokens | ... or `unknown` | tool metric/source |
| output tokens | ... or `unknown` | tool metric/source |
| monetary cost | ... or `unknown` | provider billing/`unknown: unavailable` |

Unknown is valid and must include the reason. Do not infer savings or prices
from estimates, model names or file size.

## Reviewer conclusion

- [ ] Original brief and all Requirement IDs checked
- [ ] Positive/negative/regression scenarios rerun or explicitly limited
- [ ] Dependencies and changed files reviewed
- [ ] No secret or unsupported claim
- [ ] Status and next action: ...
