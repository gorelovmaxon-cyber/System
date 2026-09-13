# Flow blueprint: event → analysis → writer

`memory-event-to-writer.json` is a secret-free, portable blueprint for the
Activepieces flow required by SC-09. It deliberately contains placeholders for
the webhook ID, AI connection/model and bridge URL/token; these are local
Activepieces values, not repository configuration.

## Build/import

The blueprint is not the export format, so it is not importable as-is. A real
export of the same flow, taken from the pinned `0.86.3` instance and with its
`token` fields redacted, lives next to it as
`memory-event-to-writer.export.json` (`type=SHARED`). That file was verified by
round-tripping it back into the instance:

```
POST /api/v1/templates                  -> 201 (server validates with IMPORT_FLOW)
POST /api/v1/flows                      -> 201 (empty flow; templateId alone transfers nothing)
POST /api/v1/flows/:id  IMPORT_FLOW     -> 200, valid=true
compare trigger/actions/settings.input  -> identical
```

There is no server-side `/import` route in this release: content moves through
the template plus the client `IMPORT_FLOW` operation. After import, re-point the
local values the export carries: the webhook trigger, the `analyze` endpoint
(the export names this instance's gateway) and the bridge URL/token. Only the
`token` fields were redacted, so nothing else in it is a secret — but it is one
machine's runtime configuration, not portable configuration.

Note that `POST /api/v1/templates` leaves a `type=SHARED` template behind and
this release refuses to delete those (`AUTHORIZATION`, thrown in
`template.controller` for both `OFFICIAL` and `SHARED`), so each round-trip
check adds one undeletable entry to the local instance. Expect the leftovers.

The bridge URL from the compose environment is
`http://host.docker.internal:8643`; inside a container `localhost` is wrong.
Use the local bridge token as a secret connection/header and never commit it.

## Required scenarios

1. Valid commit/session-summary event with `has_pattern=true` → validate →
   `POST /write` → 200 `persisted`.
2. `has_pattern=false` → successful run with no writer call.
3. Invalid AI JSON/category/statement → visible validation error and no write.
4. Bridge stopped or unauthorized → visible execution error; source event stays
   in the SC-07 queue for retry.
5. Repeat the same `event_id` → writer idempotency, no duplicate entry.

## Delivery acknowledgement contract (checked 2026-09-11)

Capture is durable in the local SC-07 queue before webhook delivery starts.
The configured endpoint must be the synchronous webhook URL ending in `/sync`
and the flow must finish with Return Response. A generic 2xx is only acceptance;
the sender acknowledges the queue item only after a correlated response:
`{event_id,status:"persisted"}` or `{event_id,status:"no-pattern"}`. Missing,
uncorrelated or malformed terminal output is retryable. At-least-once retries
are safe because writer is idempotent by `event_id`.

This contract follows the official Activepieces documentation for
[synchronous webhook limits](https://www.activepieces.com/docs/install/reference/limits)
and [returning a flow response](https://www.activepieces.com/docs/build-pieces/piece-reference/flow-control).
The repository pins 0.86.3 (release `8bfbb2f`). At runtime, a failed run produces
no flow response at all, so the caller waits out `WEBHOOK_TIMEOUT_SECONDS` (30 s
in the shipped default) and then gets `408` with an empty body — the sender must
treat that as retryable, never as acceptance.
