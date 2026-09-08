# SC-14 report

Status: awaiting-validation

## Delivered

- Replaced the unverified hand-written HTTP JSON-RPC draft with a stdio server
  using the official `@modelcontextprotocol/sdk` 1.30.0 dependency.
- Added `figma_get_design_tokens` with `fileUrl`/`fileKey`, optional `nodeId`,
  scope selection, timeout, and explicit Figma API errors.
- Added pure extraction for solid colors, opacity, typography, per-side
  padding, gap, per-corner radii, ignored unsupported fills, and node
  provenance without collapsing duplicate names.
- Added fixture extraction tests and a real SDK client test covering
  `initialize -> tools/list -> tools/call`, including a missing-node error.
- Added `.mcp.example.json`, registration instructions, supported subset and
  limitations to the README. Local `.env` and `node_modules` are gitignored.

## Verification

```text
npm install
added 1 package, and audited 96 packages
found 0 vulnerabilities

npm test
2 tests passed, 0 failed
```

The live Figma request was not run: no API key or target file was available in
the workspace. That validation remains explicitly `awaiting-validation`.
