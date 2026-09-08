# SC-15 report

Status: awaiting-validation

- Added deterministic `route.js` for dry-run route selection and three route
  documents: dev, sites and marketing.
- All routes require the same `CLAUDE.md`/HANDOFF → retrieval core; each then
  has domain-specific steps and proportional complexity.
- Sites references Figma MCP only when a maket and access exist; marketing
  treats Gemini as dated external input; no Gemini API, publication, advertising
  spend or forced SEO step was added.
- Four dry-runs passed: form validation → dev, client landing → sites,
  subscriber acquisition → marketing, ambiguous request → clarification.
- Client/second-PC live route validation remains outside this local dry-run.
