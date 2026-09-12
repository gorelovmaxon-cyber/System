#!/usr/bin/env node
'use strict';

// Процессная взаимная блокировка по эксклюзивному OS-endpoint ресурса
// (named pipe в Windows, loopback-порт в POSIX).
//
// Право входа устанавливает ОДИН атомарный факт: эксклюзивный bind endpoint,
// удерживаемый сторожевым процессом (keeper). Два процесса не могут держать
// один endpoint одновременно, и ОС освобождает его при завершении сторожа.
//
// Запись владения публикует ТОЛЬКО текущий держатель bind и только под своим
// bind'ом (см. lock-keeper.cjs). Это и есть исправление V1: публикация не
// может быть основана на bind'е, который уже утрачен, потому что между
// «прочитать запись → решить → опубликовать» держатель bind не меняется —
// он один и тот же процесс, и его смерть отменяет публикацию целиком, а не
// заменяет чужую.
//
// Запись владения нужна для U1: bind освобождается ОС и тогда, когда сторож
// убит, а владелец жив и секцию не завершил. Тогда претендент получает bind,
// но видит запись живого владельца и отказывается (`live-owner`), не публикуя
// поверх неё. Владелец не теряет authority от смерти сторожа: authority — это
// запись, удерживаемая живым процессом, и она исчезает только при release,
// смерти владельца или (для своего же осиротевшего попытки) takeover.
//
// Идентичность ресурса — канонический путь (junction/symlink и регистр
// Windows разворачиваются), поэтому один и тот же ресурс, названный разными
// конфигурациями (два data_dir, custom root, вторая копия), даёт один endpoint
// и один общий файл владения (G15).
//
// pidAlive: ESRCH — единственное доказательство смерти. EPERM и любая другая
// ошибка означают «жив»: снимать владение у процесса, который не проверяется,
// нельзя. Переиспользование pid остаётся документированным ограничением.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const KEEPER_SCRIPT = path.join(__dirname, 'lock-keeper.cjs');

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Канонический путь ресурса. Несуществующий хвост разрешается от ближайшего
// существующего предка: иначе запись владения для ещё не созданного журнала
// отличалась бы от записи для созданного.
function canonicalPath(target) {
  let current = path.resolve(String(target));
  const missing = [];
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    missing.unshift(path.basename(current));
    current = parent;
  }
  let resolved = current;
  try { resolved = fs.realpathSync.native(current); } catch { resolved = current; }
  const joined = missing.length ? path.join(resolved, ...missing) : resolved;
  return process.platform === 'win32' ? joined.toLowerCase() : joined;
}

// Каталог состояния блокировок, общий для всех конфигураций этого ПК и
// пользователя: он выводится из канонического пути ресурса, а не из data_dir.
function lockStateDir() {
  return path.resolve(process.env.SYSTEM2_LOCK_DIR || path.join(os.tmpdir(), 'system2-locks'));
}

// Путь общего файла владения для ресурса (например, memory_root).
function lockStatePath(identity) {
  const dir = lockStateDir();
  fs.mkdirSync(dir, { recursive: true });
  const id = crypto.createHash('sha256').update(canonicalPath(identity)).digest('hex').slice(0, 32);
  return path.join(dir, id + '.lock');
}

function endpointFor(resource) {
  const id = crypto.createHash('sha256').update(canonicalPath(resource)).digest('hex').slice(0, 32);
  if (process.platform === 'win32') return `\\\\.\\pipe\\system2-lock-${id}`;
  return { host: '127.0.0.1', port: 20000 + (Number.parseInt(id.slice(0, 8), 16) % 30000) };
}

function ownerFrom(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8').trim());
    return Number.isInteger(value.pid) ? value : null;
  } catch { return null; }
}

function sameOwner(a, b) {
  return a !== null && a.pid === b.pid && a.nonce === b.nonce;
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

// Запись чужого ПК: живой владелец на другой машине не наблюдается этим
// хостом, поэтому общий memory_root между машинами явно отклоняется, а не
// разделяется молча (одна запись на каждом ПК — модель контракта).
function foreignOwner(record) {
  return Boolean(record) && record.hostname !== os.hostname();
}

// Осиротевшая публикация собственной попытки: тот же pid и другой nonce.
// Такой записи предшествовал отказ acquire (сторож успел опубликовать запись,
// но не успел сообщить результат), поэтому владельцем она не является.
function ownOrphan(record, pid, nonce) {
  return Boolean(record) && record.pid === pid && record.nonce !== nonce;
}

function readStatus(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function authorityLost(message) {
  const error = new Error(message);
  error.code = 'LOCK_AUTHORITY_LOST';
  return error;
}

function acquireProcessLock(resource, options = {}) {
  const metadataFile = options.metadataFile || resource + '.lock';
  const keeperScript = options.keeperScript || KEEPER_SCRIPT;
  const attempts = options.attempts ?? 100;
  fs.mkdirSync(path.dirname(metadataFile), { recursive: true });
  // Проверяется синхронно: без сторожа право входа недостижимо, и это должно
  // быть видно вызывающему как ошибка, а не как таймаут через attempts попыток.
  if (!fs.existsSync(keeperScript)) throw new Error(`lock keeper script is missing: ${keeperScript}`);
  const owner = {
    pid: process.pid,
    hostname: os.hostname(),
    created: new Date().toISOString(),
    nonce: crypto.randomBytes(8).toString('hex'),
  };
  // Причина последнего отказа: отличает «живой владелец» от «endpoint занят»
  // в ошибке таймаута (диагностика и аварийные регрессии).
  let refusal = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    // Дешёвая предпроверка до spawn: живой владелец не требует сторожа, а
    // ожидание под ним не должно стоить процесса на каждую попытку. Она не
    // является решением — решение принимает держатель bind'а (keeper).
    const recorded = ownerFrom(metadataFile);
    if (foreignOwner(recorded)) {
      refusal = 'foreign-owner';
      pause(10);
      continue;
    }
    if (recorded && pidAlive(recorded.pid) && !ownOrphan(recorded, owner.pid, owner.nonce)) {
      refusal = 'live-owner';
      pause(10);
      continue;
    }
    const base = metadataFile + `.keeper-${process.pid}-${owner.nonce}-${attempt}`;
    const statusFile = base + '.json';
    const releaseRequest = base + '.release';
    const releaseAck = base + '.released';
    const keeper = spawn(process.execPath, [
      keeperScript, JSON.stringify(endpointFor(resource)),
      String(process.pid), statusFile, releaseRequest, releaseAck,
      metadataFile, JSON.stringify(owner),
    ], { stdio: 'ignore', windowsHide: true });
    // Без обработчика ошибка spawn осталась бы необработанным событием и уронила
    // бы процесс позже; право входа при этом не выдаётся.
    keeper.on('error', () => {});
    if (!Number.isInteger(keeper.pid)) throw new Error('lock keeper failed to start');
    const deadline = Date.now() + 1000;
    let status;
    while (Date.now() < deadline && !(status = readStatus(statusFile))) {
      pause(5);
    }
    try { fs.unlinkSync(statusFile); } catch {}
    if (!status) {
      // Сторож умер, не сообщив результат. Публикации могло не быть вовсе
      // либо осталась осиротевшая запись нашей же попытки — её снимет
      // следующая попытка этого acquire (ownOrphan), чужая запись не тронется.
      refusal = 'no-status';
      pause(10);
      continue;
    }
    if (status.status !== 'acquired') {
      try { keeper.kill(); } catch {}
      if (status.status === 'error') throw new Error(`lock keeper failed: ${status.message}`);
      refusal = status.reason || status.status;
      pause(10);
      continue;
    }
    // exitCode/signalCode обновляются обработчиком события, поэтому в
    // синхронном вызывающем они отстают; pidAlive проверяет ОС немедленно.
    const keeperGone = () => keeper.exitCode !== null || keeper.signalCode !== null || !pidAlive(keeper.pid);
    const hold = () => {
      // Освобождение: сторож снимает свою запись и закрывает endpoint. Если
      // сторожа уже нет, запись снимает сам владелец — это безопасно, потому
      // что, пока запись называла живого владельца, ни один претендент не
      // опубликовал поверх неё, а сам владелец работу закончил.
      if (!keeperGone()) {
        try { fs.writeFileSync(releaseRequest, 'release', { flag: 'wx' }); } catch {}
        const releaseDeadline = Date.now() + 1000;
        while (Date.now() < releaseDeadline && !fs.existsSync(releaseAck)) {
          pause(5);
        }
      }
      if (sameOwner(ownerFrom(metadataFile), owner)) {
        try { fs.unlinkSync(metadataFile); } catch {}
      }
      try { fs.unlinkSync(releaseRequest); } catch {}
      try { fs.unlinkSync(releaseAck); } catch {}
      try { fs.unlinkSync(metadataFile + '.publish-' + keeper.pid); } catch {}
    };
    // Проверка инварианта владения для владельца, который хочет падать
    // fail-closed вместо записи по authority, которого у него больше нет.
    // Смерть сторожа authority не отзывает (U1): пока запись называет живой
    // процесс, претендент отказывается, и владелец вправе продолжить.
    hold.assertHeld = () => {
      if (!sameOwner(ownerFrom(metadataFile), owner)) {
        throw authorityLost('lock authority lost: the ownership record no longer names this generation');
      }
    };
    hold.owner = owner;
    return hold;
  }
  const error = new Error(options.timeoutMessage || 'lock timeout');
  error.code = 'LOCK_TIMEOUT';
  error.reason = refusal;
  throw error;
}

module.exports = { acquireProcessLock, canonicalPath, endpointFor, lockStateDir, lockStatePath };
