'use strict';
// Приёмочная проба Фазы 1. Закрывает открытые наблюдения пакета 2026-09-12:
//   G15  — завершающаяся положительная проверка вместо harness_error;
//   G08  — корректный отказ без побочных записей (не сам факт отказа);
//   G09  — то же для поиска, до HTTP;
//   LOCK — интеграция примитива блокировки с writer, очередью и журналами.
// Проба не переписывает сохранённые доказательства: пишет только в свой outDir.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

const repo = process.cwd();
const outDir = process.argv[2] || __dirname;
const { fixture, proposal } = require(path.join(repo, 'scripts/memory/tests/helpers'));
const { appendJsonl, readJsonl } = require(path.join(repo, 'scripts/memory/jsonl'));
const { acquireProcessLock, lockStatePath, lockStateDir } = require(path.join(repo, 'scripts/memory/ipc-lock'));
const { resolvePaths } = require(path.join(repo, 'scripts/memory/resolve-paths'));

const results = [];
const sharedLockDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acc-p1-locks-'));
process.env.SYSTEM2_LOCK_DIR = sharedLockDir;

function pause() {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
}
function waitFor(fn, ms = 20000, what = 'condition') {
  const deadline = Date.now() + ms;
  while (!fn()) {
    if (Date.now() > deadline) throw new Error(`timeout waiting for ${what}`);
    pause();
  }
}
async function test(id, fn) {
  const root = fixture('acc-' + id);
  const originalFetch = global.fetch;
  try {
    results.push({ id, root, ...(await fn(root)) });
  } catch (error) {
    results.push({ id, root, harness_error: error.stack });
  } finally {
    global.fetch = originalFetch;
  }
  console.log(id, JSON.stringify(results.at(-1)));
}

(async () => {
  // ---------------------------------------------------------------- G15
  // Две конфигурации на одном ПК, разные data_dir, один канонический memory_root.
  // A входит в секцию записи и замирает непосредственно перед публикацией файла
  // памяти (держа блокировку). B должен быть не допущен, а не затереть A молча.
  // Прежняя идентичность (data_dir) допускала B, и публикация A теряла запись B.
  await test('G15', async root => {
    const other = fixture('acc-G15-other');
    const memory = fs.mkdtempSync(path.join(os.tmpdir(), 'acc-shared-memory-'));
    for (const r of [root, other]) {
      const cfg = path.join(r, 'config', 'system.example.json');
      const data = JSON.parse(fs.readFileSync(cfg, 'utf8'));
      data.memory_root = memory;
      fs.writeFileSync(cfg, JSON.stringify(data));
    }
    const ready = path.join(root, 'ready');
    const resume = path.join(root, 'resume');
    const done = path.join(root, 'done');
    const target = path.join(memory, 'facts', 'writer-entries.md');
    const childCode = `
      const fs=require('node:fs');
      const rename=fs.renameSync;
      fs.renameSync=function(a,b){
        if(String(b)===${JSON.stringify(target)}){
          fs.writeFileSync(${JSON.stringify(ready)},'1');
          const end=Date.now()+20000;
          while(!fs.existsSync(${JSON.stringify(resume)})){ if(Date.now()>end) throw Error('child timeout'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10); }
        }
        return rename.call(fs,a,b);
      };
      const w=require(${JSON.stringify(path.join(repo, 'scripts/memory/writer.js'))});
      const r=w.writeProposal('shared-A', ${JSON.stringify(proposal('RECORD_A'))});
      fs.writeFileSync(${JSON.stringify(done)}, JSON.stringify(r));
    `;
    const child = cp.spawn(process.execPath, ['-e', childCode], {
      env: { ...process.env, SYSTEM2_ROOT: root, SYSTEM2_LOCK_DIR: sharedLockDir },
      stdio: 'ignore', windowsHide: true,
    });
    let blocked = null, duringSection = null, afterPublish = null, finalContent = null;
    try {
      waitFor(() => fs.existsSync(ready), 20000, 'child to enter its section');
      process.env.SYSTEM2_ROOT = other;
      const started = Date.now();
      try {
        require(path.join(repo, 'scripts/memory/writer.js')).writeProposal('shared-B', proposal('RECORD_B'));
      } catch (error) {
        blocked = { code: error.code, reason: error.reason, message: error.message, elapsedMs: Date.now() - started };
      }
      // Содержимое в момент, когда A ещё держит секцию и не опубликовал своё.
      duringSection = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
      fs.writeFileSync(resume, '1');
      waitFor(() => fs.existsSync(done), 20000, 'child to publish');
      const a = JSON.parse(fs.readFileSync(done, 'utf8'));
      // Содержимое сразу после публикации A, до повторной попытки B.
      afterPublish = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
      // После освобождения A запись B обязана пройти: отказ не должен быть вечным.
      const writer = require(path.join(repo, 'scripts/memory/writer.js'));
      const b = writer.writeProposal('shared-B', proposal('RECORD_B'));
      finalContent = fs.readFileSync(target, 'utf8');
      return {
        childA: a.status,
        blockedWhileHeld: blocked,
        bWroteWhileHeld: duringSection.includes('RECORD_B'),
        // Молчаливая потеря: запись B легла в файл, а публикация A её затёрла.
        silentLossOfB: duringSection.includes('RECORD_B') && !afterPublish.includes('RECORD_B'),
        retryAfterRelease: b.status,
        containsA: finalContent.includes('RECORD_A'),
        containsB: finalContent.includes('RECORD_B'),
        verdict: blocked?.code === 'LOCK_TIMEOUT' && !duringSection.includes('RECORD_B')
          && a.status === 'persisted' && b.status === 'persisted'
          && finalContent.includes('RECORD_A') && finalContent.includes('RECORD_B'),
      };
    } finally {
      try { fs.writeFileSync(resume, '1'); } catch {}
      try { child.kill(); } catch {}
    }
  });

  // ---------------------------------------------------------------- G08
  // Корректный отказ: неверный тип отклонён на границе И не осталось следов —
  // ни события в очереди, ни записи в памяти.
  await test('G08', async root => {
    const { createEvent } = require(path.join(repo, 'scripts/memory/events.js'));
    const { DurableQueue } = require(path.join(repo, 'scripts/memory/queue.js'));
    const queueFile = path.join(root, '.local', 'queue', 'events.jsonl');
    const memoryBefore = fs.existsSync(path.join(root, '.claude', 'memory', 'facts')) ? 'present' : 'absent';

    let apiError = null;
    try {
      createEvent({ kind: 'session-summary', project_id: 'A', session_id: 's1', revision: 1, summary: 'x', decisions: 'KEEP_THIS_DECISION' });
    } catch (error) { apiError = error.message; }

    // Путь --file: тип приходит из JSON, а не от CLI-разбора.
    const badInput = path.join(root, 'bad-input.json');
    fs.mkdirSync(path.dirname(badInput), { recursive: true });
    fs.writeFileSync(badInput, JSON.stringify({ kind: 'session-summary', project_id: 'A', session_id: 's2', revision: 1, summary: 'y', decisions: 'LEAK_ME' }));
    const cli = cp.spawnSync(process.execPath, [
      path.join(repo, 'scripts/memory/capture.js'), 'session-summary',
      '--project', 'A', '--session', 's2', '--revision', '1', '--file', badInput,
    ], { env: { ...process.env, SYSTEM2_ROOT: root, SYSTEM2_LOCK_DIR: sharedLockDir }, encoding: 'utf8', windowsHide: true });

    // Ни одного события в очереди и ни одной строки памяти с отвергнутым содержимым.
    const queued = fs.existsSync(queueFile) ? readJsonl(queueFile) : [];
    const memoryText = (() => {
      const dir = path.join(root, '.claude', 'memory');
      const out = [];
      const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (e.isFile()) out.push(fs.readFileSync(f, 'utf8')); } };
      walk(dir);
      return out.join('\n');
    })();
    return {
      apiError,
      cliExit: cli.status,
      cliStderr: cli.stderr.trim().split('\n')[0] || null,
      queuedCount: queued.length,
      leakedDecisionInQueue: JSON.stringify(queued).includes('KEEP_THIS_DECISION') || JSON.stringify(queued).includes('LEAK_ME'),
      leakedDecisionInMemory: memoryText.includes('KEEP_THIS_DECISION') || memoryText.includes('LEAK_ME'),
      memoryBefore,
      verdict: Boolean(apiError) && cli.status !== 0 && queued.length === 0
        && !JSON.stringify(queued).includes('KEEP_THIS_DECISION') && !memoryText.includes('KEEP_THIS_DECISION'),
    };
  });

  // ---------------------------------------------------------------- G09
  // Неизвестный project_id недопустим независимо от доступности Khoj: отказ
  // наступает до HTTP и не оставляет побочных записей. Положительный контроль —
  // известный проект до сервиса доходит.
  await test('G09', async root => {
    const search = require(path.join(repo, 'scripts/memory/search.js'));
    const seen = [];
    global.fetch = async (url, init) => {
      seen.push({ url: String(url), body: init?.body });
      return { ok: true, text: async () => JSON.stringify({ results: [] }) };
    };
    let remoteError = null, remoteCalls = 0;
    try { await search.searchKhoj('MARKER', 'ghost-project', { force: true }); }
    catch (error) { remoteError = { code: error.code, message: error.message }; }
    remoteCalls = seen.length;
    let localError = null;
    try { search.localResults('MARKER', 'ghost-project'); } catch (error) { localError = error.code; }
    const filesAfterRefusal = (() => {
      const dir = path.join(root, '.claude', 'memory');
      const names = [];
      const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (e.isDirectory()) walk(path.join(d, e.name)); else names.push(path.relative(dir, path.join(d, e.name))); } };
      walk(dir);
      return names;
    })();
    // Положительный контроль: известный проект доходит до сервиса.
    const known = await search.searchKhoj('MARKER', 'A', { force: true });
    return {
      remoteError, remoteCalls, localError,
      knownProjectReachedService: seen.length > remoteCalls,
      knownOk: known.ok,
      memoryFilesAfterRefusal: filesAfterRefusal,
      verdict: remoteError?.code === 'unknown-project' && remoteCalls === 0
        && localError === 'unknown-project' && filesAfterRefusal.length === 0
        && seen.length > 0,
    };
  });

  // ---------------------------------------------------------------- LOCK
  // Примитив обслуживает не только writer: журналы очереди, writer и индексатора
  // используют его же. Область влияния шире writer, поэтому проверяется отдельно:
  // (1) идентичности writer/очереди/журнала различны — нет ложного исключения;
  // (2) второй процесс не входит под живым владельцем;
  // (3) параллельная дозапись одного журнала не теряет и не рвёт записи.
  await test('LOCK', async root => {
    const paths = resolvePaths();
    const queueDir = path.join(paths.data_dir, 'queue');
    const writerId = lockStatePath(paths.memory_root);
    const queueId = lockStatePath(queueDir);
    const journal = path.join(paths.data_dir, 'journal.jsonl');
    const journalId = lockStatePath(journal + '.journal-authority');

    const identities = { writerId: path.basename(writerId), queueId: path.basename(queueId), journalId: path.basename(journalId) };
    const distinct = new Set(Object.values(identities)).size === 3;

    // (2) второй процесс не входит под живым владельцем
    const hold = acquireProcessLock(paths.memory_root, { metadataFile: writerId, attempts: 5 });
    let second = null;
    try { acquireProcessLock(paths.memory_root, { metadataFile: writerId, attempts: 5 }); }
    catch (error) { second = { code: error.code, reason: error.reason }; }
    hold();

    // (2b) fail-closed: потеря владения наблюдаема
    const hold2 = acquireProcessLock(paths.memory_root, { metadataFile: writerId, attempts: 5 });
    let authorityLost = null;
    try { fs.unlinkSync(writerId); hold2.assertHeld(); }
    catch (error) { authorityLost = error.code; }
    hold2();

    // (3) параллельная дозапись одного журнала из нескольких процессов
    const writers = 4, each = 5;
    const children = [];
    for (let index = 0; index < writers; index += 1) {
      const code = `
        const {appendJsonl}=require(${JSON.stringify(path.join(repo, 'scripts/memory/jsonl.js'))});
        for(let i=0;i<${each};i++) appendJsonl(${JSON.stringify(journal)}, {who:${index}, i});
      `;
      children.push(cp.spawn(process.execPath, ['-e', code], {
        env: { ...process.env, SYSTEM2_ROOT: root, SYSTEM2_LOCK_DIR: sharedLockDir },
        stdio: 'ignore', windowsHide: true,
      }));
    }
    await Promise.all(children.map(child => new Promise(resolve => child.on('exit', resolve))));
    const records = fs.existsSync(journal) ? readJsonl(journal) : [];
    const expected = writers * each;
    const pairs = new Set(records.map(r => `${r.who}:${r.i}`));
    return {
      identities: { ...identities, distinct },
      secondContender: second,
      authorityLostOnForeignRemoval: authorityLost,
      journalRecords: records.length,
      journalExpected: expected,
      uniqueRecords: pairs.size,
      tornOrLost: records.length !== expected || pairs.size !== expected,
      verdict: distinct && second?.code === 'LOCK_TIMEOUT' && authorityLost === 'LOCK_AUTHORITY_LOST'
        && records.length === expected && pairs.size === expected,
    };
  });

  const output = {
    date: new Date().toISOString().slice(0, 10),
    head: cp.spawnSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(),
    sharedLockDir,
    results,
  };
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'acceptance-p1-probe-results.json'), JSON.stringify(output, null, 2) + '\n');
  process.exitCode = results.some(r => r.harness_error || r.verdict === false) ? 1 : 0;
})().catch(error => { console.error(error); process.exitCode = 2; });
