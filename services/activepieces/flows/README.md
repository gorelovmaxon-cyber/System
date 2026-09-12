# Flow blueprint: event → analysis → writer

`memory-event-to-writer.json` is a secret-free, portable blueprint for the
Activepieces flow required by SC-09. It deliberately contains placeholders for
the webhook ID, AI connection/model and bridge URL/token; these are local
Activepieces values, not repository configuration.

## Build/import

The current machine cannot run Activepieces (Docker Desktop/WSL are absent), so
the blueprint has not been exported from or imported into a live UI. On a
Docker-enabled machine, create a Webhook flow, reproduce the listed steps, or
map the blueprint into the exact export format of the pinned Activepieces
release, then record the generated connection/webhook IDs only in the local UI.

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
The repository pins 0.86.3 (release `8bfbb2f`); a real imported flow remains
`awaiting-validation` until Docker, worker persistence and the bridge are live.
