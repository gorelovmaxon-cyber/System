# Evidence report — DEMO-01

Status: awaiting-review
Date: 2026-10-12
Commit: `git log -1 --format=%H -- index.html` after the scoped DEMO-01 commit.
Requirement IDs: R1–R4; all 86 SITE IDs below.
Source brief/task: TASK.md, BRIEF.md, SPEC.md, issues/DEMO-01.md.

## Root QA update — 2026-10-12

After the executor's syntax/HTTP checks, root reported browser QA PASS at
320, 375, 639, 640, 768, 959, 960 and 1440px: one/two columns at the specified
breakpoint, aligned card descriptions, contrast >=4.5, Enter/Space opening,
Tab/Shift+Tab containment, Escape/close focus return, touch and reduced motion.
Root reported zero external requests and console errors and visually reviewed screenshots.
Root supplied a local copy: [ROOT-QA.json](ROOT-QA.json).
Screenshots: `E:/SystemTheBest/System/.scratch/site-build/evidence/demo-*.png`.
This is delegated root evidence, not an executor browser run.
The historical pending notes below describe the executor checks before that update;
browser acceptance now has the root report. Independent review and short-change session
are still pending. No independent done is claimed.

## Requirement coverage

| Requirement/criterion | Implemented behavior | Evidence | Result |
|---|---|---|---|
| R1: content and semantic structure | One main/h1, brand, introduction and two service articles; exact SPEC copy | index.html; delegated ROOT-QA.json | pass; independent review pending |
| R2: accessible notification | Native showModal, labelled/described dialog, close button, explicit single-control Tab loop, native Escape and close-event focus return | index.html/script.js; delegated ROOT-QA.json | pass; independent review pending |
| R3: calm responsive design | SPEC tokens, one/two-column grid at 640px, container and gutters, constrained dialog | styles.css; delegated ROOT-QA.json | pass; independent review pending |
| R4: local files and launch | HTML/CSS/JS without package/CDN dependencies, local favicon data URI; README launch command | HTTP 200 text/html; delegated ROOT-QA.json | pass; independent review pending |

## Checks and scenarios

Working directory for project commands: current checkout root (`git rev-parse --show-toplevel`).
Fixture author: `git config user.name` → Bot; `git config user.email` → bot@example.com.
Planning base: `e2550c4` (`DEMO-PLAN: prepare isolated site handoff`).

Actual commands on 2026-10-12:

```powershell
node --check script.js
python -m http.server 8765 --bind 127.0.0.1
$siteResponse = Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8765/
$siteResponse.StatusCode
$siteResponse.Headers['Content-Type']
git diff --check
git status --short
```

`node --check` exits 0, no output. Python is running locally at
<http://127.0.0.1:8765/>; HTTP returns `200`, `text/html`.
`git diff --check` produces no warnings. Initial Git status was clean.
The implementation is scoped to index.html, styles.css, script.js, README.md,
this evidence, DEMO-01 status and HANDOFF. No production/system source was changed.

- Positive: local HTML returned successfully. CTA click/Enter/Space opening remains for root browser QA.
- Negative: no forms, real contacts, fetch or external dependencies in source. Console/network and Escape/Tab boundary behavior remain for root browser QA.
- Regression: repeat dialog opening and focus restoration remain for root browser QA.

Browser QA is **not run by the executor**, per root's clarified delegation,
matching the existing SPEC/ticket ownership. No screenshots or browser-success
claims are supplied. Root must check 320/375/768/1440, open dialogs, keyboard,
touch, actual contrast, focus-visible, all button states, reduced motion,
layout stability, local resources, console errors and external requests.
Independent acceptance is also pending; the implementation author does not set done.

## Limitations

Syntax and HTTP checks do not establish accessible or visual browser behavior.
No publication, paid API, real application submission or external service was run.
The native dialog is the planned implementation; no browser failure has been observed
that would justify replacing it.

## Cost evidence

| Metric | Value | Source/method |
|---|---|---|
| wall-clock time | unknown | no complete task timer |
| retries/repeats | unknown | no aggregated task counter |
| context/input tokens | unknown | complete usage unavailable to executor |
| output tokens | unknown | complete usage unavailable to executor |
| monetary cost | unknown | provider billing unavailable |

## Reviewer conclusion

- [ ] Original TASK and all requirement IDs independently checked
- [ ] Browser positive/negative/regression scenarios run
- [ ] Diff and changed files independently reviewed
- [ ] No secret or unsupported claim independently checked
- [ ] Status and next action: root browser QA, concrete short change in a new session, independent acceptance

## Site rule coverage

Statuses describe actual checks, not ticket completion. “Неприменимо” follows
SPEC's function boundaries; the two future-short-change IDs remain “не проверено”.

| Rule ID | Status | Evidence / reason |
|---|---|---|
| SITE-01-01 | проверено | index.html: heading/intro answer the offer; service articles explain two distinct services; CTA opens notification. |
| SITE-01-02 | проверено | index.html: distinct service copy matches R1 without duplicate blocks. |
| SITE-01-03 | проверено | index.html: exact R1 heading and supporting description. |
| SITE-01-04 | проверено | index.html: services describe restoration and replacement outcomes using approved demo copy. |
| SITE-01-05 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-01-06 | проверено | index.html: CTA names opening the notification. |
| SITE-01-07 | проверено | TASK/README/meta/dialog disclose fictional test; no testimonials, figures or contacts. |
| SITE-02-01 | проверено | SPEC design system predates code; styles.css implements its typography, tokens, grid and components. |
| SITE-02-02 | проверено | styles.css: shared .service and .button rules apply to both respective elements; browser appearance pending. |
| SITE-02-03 | проверено | styles.css: named background, surface, text, accent and border tokens. |
| SITE-02-04 | проверено | DEMO-02: static consistency covers both buttons through the shared radius token; browser verification remains delegated to root. |
| SITE-03-01 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-03-02 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-03-03 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-03-04 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-03-05 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-03-06 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-03-07 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-04-01 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-04-02 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-04-03 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-04-04 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-04-05 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-04-06 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-04-07 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-05-01 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-05-02 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-05-03 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-05-04 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-05-05 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-05-06 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-05-07 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-06-01 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-06-02 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-06-03 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-06-04 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-06-05 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-06-06 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-06-07 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-06-08 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-06-09 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-07-01 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-07-02 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-07-03 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-07-04 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-07-05 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-08-01 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-08-02 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-08-03 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-08-04 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-08-05 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-08-06 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-09-01 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-09-02 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-09-03 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-09-04 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-09-05 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-09-06 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-01 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-02 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-03 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-04 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-05 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-06 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-07 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-08 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-09 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-10-10 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-11-01 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-11-02 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-11-03 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-11-04 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-12-01 | проверено | TASK explicitly authorizes demo implementation; no publishing or external step. |
| SITE-12-02 | проверено | Single DEMO-01 static implementation; syntax and local HTTP checked; browser QA delegated. |
| SITE-12-03 | проверено | Git planning base e2550c4 and scoped DEMO-01 commit provide rollback points. |
| SITE-12-04 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-12-05 | проверено | TASK authorization and root clarified QA delegation followed without another interview. |
| SITE-12-06 | проверено | Shared tokens/components apply to both cards/buttons; visual consistency awaiting root QA. |
| SITE-12-07 | проверено | Explicit scoped file list recorded above; isolated queue event only, no source system edits. |
| SITE-13-01 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-13-02 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-13-03 | проверено | Root reported PASS on 2026-10-12; see root browser evidence and Root QA update above. Executor did not run this check. |
| SITE-13-04 | неприменимо | SPEC boundary confirmed in source: no corresponding feature; not added for compliance. |
| SITE-13-05 | проверено | DEMO-02: both related buttons checked in HTML/CSS; root must verify their current browser appearance. |
| SITE-13-06 | проверено | This report separates node syntax, HTTP launch, pending browser QA and independent acceptance. |
| SITE-13-07 | проверено | awaiting-review; browser requirements explicitly unknown; author does not claim done. |

## DEMO-02 — короткая правка новой сессии

Date: 2026-10-12. Status: awaiting-review. Base: 6a1a731.
Source: переданное задание «Старт: продолжи по HANDOFF. Сделай все кнопки
круглее — радиус16px вместо12px». Requirement: R3; SITE-02-02/04,
SITE-05-01, SITE-13-05/06/07. Единственный продуктовый diff — значение
`--radius-button` 12px → 16px; SPEC обновлена с сохранением происхождения решения.

Из корня project выполнена короткая PowerShell-сверка: `[regex]::Matches`
в index.html находит ровно 2 button, оба с классом `.button`; в styles.css
общий токен равен 16px, список border-radius — panel/button/panel, других
переопределений нет; SPEC содержит «кнопки 16px».
Фактический вывод: `PASS: both buttons use shared .button radius 16px;
no overrides; SPEC matches; panels remain 20px.`
Это статическая проверка покрытия всех затронутых элементов, не browser QA.
`node --check script.js` — exit 0. Обычный `git diff --check` — exit 0.

Positive: обе кнопки получают общий новый токен в исходниках.
Negative: отсутствуют отдельные/inline переопределения радиуса.
Regression: index.html/script.js не менялись; панели сохраняют 20px,
синтаксис JS прошёл. Root явно подтвердил повтор browser QA для нового радиуса;
проверка вычисленного CSS, сценария диалога и визуального состояния ещё предстоит.
Предыдущий ROOT-QA относится к базе 6a1a731 и не выдан за проверку новой версии.

Один технический повтор: `node -e` потерял двойные кавычки при передаче
Windows PowerShell → Node; заменён непосредственной PowerShell-сверкой.
Попытка `git -c core.autocrlf=false diff --check` дала ложный шум CRLF;
обычная проверка с настройками проекта прошла. Ошибки не были дефектами сайта.
Wall-clock, context/tokens и стоимость unknown: полных метрик нет.
Публикации, платных API, реальных заявок и изменений исходной System2 нет.
Root передал текущую browser QA: [ROOT-QA-RESUME.json](ROOT-QA-RESUME.json),
PASS на 320/375/639/640/768/959/960/1440, computed radius 16px,
keyboardDialog pass, touch/reducedMotion pass, pageErrors/externalRequests пустые.
Исполнитель прочитал JSON, но browser QA не проводил.
Независимое done/READY автор не ставил. Следующий шаг — независимая приёмка блока.
