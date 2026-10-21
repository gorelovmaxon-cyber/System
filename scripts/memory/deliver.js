#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { resolvePaths } = require('./resolve-paths');

function endpoint() {
  if (process.env.MEMORY_DELIVERY_ENDPOINT) return process.env.MEMORY_DELIVERY_ENDPOINT;
  const paths = resolvePaths();
  return paths.config.delivery?.endpoint || '';
}

// Синхронный webhook Activepieces отвечает либо по завершении flow, либо по
// своему WEBHOOK_TIMEOUT_SECONDS (30 с в поставляемом значении) — и тогда
// отдаёт 408 без тела. Таймаут отправителя обязан быть больше: иначе он
// обрывает запрос раньше детерминированного ответа платформы, никогда не
// узнаёт исход длинного, но успешного run, и оставляет событие в очереди,
// породив повторный параллельный run (L04-00).
const DEFAULT_TIMEOUT_MS = 35000;

// Значение берётся из конфигурации: `delivery.timeout_ms` должно превышать
// WEBHOOK_TIMEOUT_SECONDS того инстанса, в который шлётся событие.
function timeoutMs(options) {
  if (options.timeout_ms) return options.timeout_ms;
  try {
    const configured = resolvePaths().config.delivery?.timeout_ms;
    if (configured) return configured;
  } catch {}
  return DEFAULT_TIMEOUT_MS;
}

// 408 — ответ sync webhook, когда run завершился без flow-response: платформа
// не отвергла событие, а не дождалась его обработки, поэтому попытка
// повторяема. Прочие 4xx (401, 404, 400) — отказ конфигурации, повтор без
// правки не поможет.
function retryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

// Терминальные статусы контракта подтверждения. `conflict` — повтор уже
// сохранённого события с другим содержимым: writer отказал, память не изменилась,
// и повторять это бессмысленно (AI недетерминирован, тот же event_id даст другие
// proposal'ы и снова отказ). Отдельный статус, а не `persisted`, чтобы расхождение
// оставалось видимым, а не выглядело подтверждённым успехом (L04-04, F-04-1).
const TERMINAL_CONFIRMATIONS = ['persisted', 'no-pattern', 'conflict'];

async function deliverEvent(event, options = {}) {
  const url = options.endpoint || endpoint();
  if (!url || url.includes('<')) return { ok: false, error: 'delivery endpoint is not configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs(options));
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    });
    const body = await response.text();
    if (response.ok) {
      let confirmation;
      try { confirmation = JSON.parse(body); } catch {}
      const correlated = confirmation?.event_id === event.event_id;
      const terminal = TERMINAL_CONFIRMATIONS.includes(confirmation?.status);
      if (correlated && terminal) {
        return { ok: true, status: response.status, outcome: confirmation.status };
      }
      return {
        ok: false,
        retryable: true,
        error: `HTTP ${response.status} accepted without correlated terminal confirmation`,
      };
    }
    const retryable = retryableStatus(response.status);
    return { ok: false, retryable, error: `HTTP ${response.status}: ${body.slice(0, 200)}` };
  } catch (error) {
    // fetch wraps socket failures in a generic TypeError. Preserve the bounded
    // transport code without logging request bodies, URLs or credential-bearing causes.
    const causeCode = error.cause?.code;
    const detail = typeof causeCode === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(causeCode)
      ? ` [${causeCode}]` : '';
    return { ok: false, retryable: true, error: error.name === 'AbortError' ? 'request timeout' : error.message + detail };
  } finally {
    clearTimeout(timer);
  }
}

if (require.main === module) {
  deliverEvent(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')))
    .then(result => {
      process.stdout.write(JSON.stringify(result) + '\n');
      process.exitCode = result.ok ? 0 : 1;
    })
    .catch(error => {
      process.stderr.write(error.message + '\n');
      process.exitCode = 1;
    });
}

module.exports = { deliverEvent, endpoint, DEFAULT_TIMEOUT_MS, TERMINAL_CONFIRMATIONS };

