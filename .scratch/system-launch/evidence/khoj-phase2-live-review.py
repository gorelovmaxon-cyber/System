"""Live L02 acceptance against the installed local Khoj (explicit manual run).

Uses a disposable authenticated Khoj user and an isolated System2 root. No test
facts or source configuration are written to the default user's memory/index.
The temporary token is passed to Node on stdin and deleted with the user.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import tempfile
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location("khoj_launcher", ROOT / "services/khoj/run-local.py")
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)
os.environ.update(launcher.load_env_file(launcher.DEFAULT_ENV_FILE))
os.environ["USE_EMBEDDED_DB"] = "false"
os.environ["DJANGO_SETTINGS_MODULE"] = "khoj.app.settings"
os.environ["PYTHONUTF8"] = "1"
pgdata = Path(os.environ["PGSERVER_DATA_DIR"])
base = "http://127.0.0.1:" + os.environ.get("KHOJ_PORT", "42110")
run_dir = Path(tempfile.mkdtemp(prefix="s2-khoj-live-review-"))
result = {"date": time.strftime("%Y-%m-%d"), "runtime": str(run_dir), "checks": {}}


def connect():
    from pgserver.utils import PostmasterInfo
    info = PostmasterInfo.read_from_pgdata(pgdata)
    assert info and info.is_running(), "Khoj PostgreSQL is not running"
    os.environ["POSTGRES_HOST"] = info.hostname or "127.0.0.1"
    os.environ["POSTGRES_PORT"] = str(info.port)
    os.environ.setdefault("POSTGRES_USER", "postgres")
    os.environ.setdefault("POSTGRES_DB", "khoj")


connect()
import django
django.setup()
from django.db import connections
from khoj.database import models


def memory_hashes():
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in (ROOT / ".claude/memory").rglob("*.md")}


def default_snapshot():
    user = models.KhojUser.objects.get(username="default")
    files = dict(models.FileObject.objects.filter(user=user).values_list("file_name", "raw_text"))
    sources = list(models.LocalMarkdownConfig.objects.filter(user=user).values("input_files", "input_filter"))
    return files, sources


def request(route, token=None, timeout=60):
    headers = {"Authorization": "Bearer " + token} if token else {}
    with urllib.request.urlopen(urllib.request.Request(base + route, headers=headers), timeout=timeout) as response:
        return json.load(response)


NODE = r'''
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const input = JSON.parse(fs.readFileSync(0, 'utf8'));
process.env.SYSTEM2_ROOT = input.fixture;
process.env.SYSTEM2_LOCK_DIR = path.join(input.fixture, '.locks');
const nativeFetch = global.fetch;
// Authentication only: every request still reaches the real service.
global.fetch = (url, init = {}) => nativeFetch(url, {
  ...init, headers: { ...init.headers, Authorization: 'Bearer ' + input.token }
});
const mod = name => require(path.join(input.repo, 'scripts/memory', name));
const indexer = mod('indexer');
const writer = mod('writer');
const writerLog = mod('writer-log');
const search = mod('search');
(async () => {
  let output;
  if (input.action === 'write') {
    output = writer.writeProposal(input.event, {
      category: 'facts', status: 'observation', scope: 'review',
      statement: input.marker + ' is an isolated live Khoj acceptance fixture.',
      evidence: 'temporary acceptance source', source: 'L02 review'
    });
    assert.equal(output.status, 'persisted');
  } else if (input.action === 'index') {
    if (input.requeue) indexer.requeueFailed();
    output = await indexer.run();
    assert.ok(output.length > 0);
    assert.ok(output.every(task => task.status === input.expected), JSON.stringify(output));
  } else if (input.action === 'search') {
    output = await search.searchKhoj(input.marker, 'review');
    assert.equal(output.ok, input.available);
    const items = input.available ? output.results : output.fallback_results;
    assert.ok(items.some(item => item.scope === 'review' && item.snippet.includes(input.marker)));
    if (!input.available) assert.equal(output.fallback, 'local');
  } else if (input.action === 'state') {
    output = writerLog.get(input.event);
    assert.equal(output.status, 'persisted');
    assert.equal(output.indexed, input.indexed);
  }
  console.log(JSON.stringify({ action: input.action, passed: true, output }));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
'''


def node(action, **kwargs):
    payload = dict(repo=str(ROOT), fixture=str(run_dir / "system"), token=token, action=action, **kwargs)
    completed = subprocess.run(["node", "-e", NODE], input=json.dumps(payload),
                               capture_output=True, text=True, encoding="utf-8", timeout=120)
    assert completed.returncode == 0, completed.stderr
    return json.loads(completed.stdout)


def raw_contains(marker):
    from urllib.parse import urlencode
    hits = request("/api/search?" + urlencode({"q": marker, "n": 10}), token)
    return any(marker in hit.get("entry", "") for hit in hits)


def start_service():
    # A slow start is not permission to launch a second service in cleanup.
    if launcher.running_service_pid(launcher.service_pid_file(pgdata)) is None:
        if os.name == "nt":
            # Start-Process uses the normal Windows service launch recipe. A
            # direct Popen remains in the tool's process tree and can disappear
            # when the acceptance command finishes.
            env = dict(os.environ, S2_REVIEW_PY=sys.executable, S2_REVIEW_ROOT=str(ROOT),
                       S2_REVIEW_SCRIPT=str(ROOT / "services/khoj/run-local.py"), S2_REVIEW_LOG=str(run_dir))
            subprocess.run(["powershell.exe", "-NoProfile", "-Command", r'''
                Start-Process -FilePath $env:S2_REVIEW_PY `
                  -ArgumentList ('"' + $env:S2_REVIEW_SCRIPT + '"') `
                  -WorkingDirectory $env:S2_REVIEW_ROOT -WindowStyle Hidden `
                  -RedirectStandardOutput (Join-Path $env:S2_REVIEW_LOG 'restart.stdout.log') `
                  -RedirectStandardError (Join-Path $env:S2_REVIEW_LOG 'restart.stderr.log')
            '''], env=env, check=True, timeout=20)
        else:
            with (run_dir / "restart.stdout.log").open("ab") as out, (run_dir / "restart.stderr.log").open("ab") as err:
                subprocess.Popen([sys.executable, str(ROOT / "services/khoj/run-local.py")],
                                 cwd=ROOT, stdout=out, stderr=err, start_new_session=True)
    for _ in range(90):
        try:
            request("/api/health", timeout=3)
            return
        except Exception:
            time.sleep(1)
    raise RuntimeError("Khoj did not become healthy after restart")


before_memory = memory_hashes()
before_default = default_snapshot()
user_id = None
stopped = False
try:
    assert request("/api/health")["email"] == "default@example.com"
    indexed_files = {Path(name).resolve() for name in before_default[0]}
    assert indexed_files == {(ROOT / name).resolve() for name in before_memory}
    assert len(before_default[1]) == 1
    assert before_default[1][0] == {"input_files": [], "input_filter": [(ROOT / '.claude/memory').as_posix() + '/**/*.md']}
    result["checks"]["canonical_inventory"] = len(indexed_files)
    for model in models.SearchModelConfig.objects.all():
        assert model.embeddings_inference_endpoint_type == 'local'
        assert not any([model.embeddings_inference_endpoint, model.embeddings_inference_endpoint_api_key,
                        model.cross_encoder_inference_endpoint, model.cross_encoder_inference_endpoint_api_key])
    result["checks"]["models_local"] = True
    fixture = run_dir / "system"
    for directory in ("config", ".git", ".claude/memory"):
        (fixture / directory).mkdir(parents=True, exist_ok=True)
    config = {"registry": [{"project_id": "review"}], "memory_root": ".claude/memory", "data_dir": ".local",
              "integrations": {"khoj": {"enabled": True, "base_url": base}},
              "search": {"timeout_ms": 15000},
              "indexer": {"reindex_url": base + "/api/update", "timeout_ms": 60000}}
    (fixture / "config/system.example.json").write_text(json.dumps(config), encoding="utf-8")
    name = "l02-review-" + secrets.token_hex(6)
    user = models.KhojUser.objects.create_user(username=name, email=name + "@example.invalid")
    user_id = user.pk
    token = secrets.token_urlsafe(30)
    models.KhojApiUser.objects.create(user=user, token=token, name="temporary L02 acceptance")
    models.LocalMarkdownConfig.objects.create(user=user, input_files=[],
        input_filter=[(fixture / ".claude/memory").as_posix() + "/**/*.md"])
    for number in (1, 2):
        marker = f"l02fresh{number}" + secrets.token_hex(8)
        event = f"evt_l02_review_{number}"
        node("write", marker=marker, event=event)
        assert not raw_contains(marker), "new marker already in raw Khoj results before update"
        node("index", expected="indexed")
        assert raw_contains(marker), "new marker absent from actual Khoj index after update"
        node("search", marker=marker, available=True)
        node("state", event=event, indexed=True)
        result["checks"][f"new_revision_{number}"] = "absent -> update -> raw index + adapter present"

    # New pending revision across a real service outage, with default data untouched.
    marker = "l02restart" + secrets.token_hex(8)
    event = "evt_l02_review_restart"
    node("write", marker=marker, event=event)
    connections.close_all()
    stopped = True
    stop = subprocess.run([sys.executable, str(ROOT / "services/khoj/run-local.py"), "--stop"],
                          capture_output=True, text=True, encoding="utf-8", timeout=45)
    assert stop.returncode == 0, stop.stderr
    node("index", expected="failed")
    node("search", marker=marker, available=False)
    node("state", event=event, indexed=False)
    result["checks"]["outage"] = "failed + local fallback; persisted remains"
    start_service()
    stopped = False
    # Raw old content must survive before running any update.
    assert not raw_contains(marker)
    assert request("/api/search?q=isolated&n=10", token)
    node("index", expected="indexed", requeue=True)
    assert raw_contains(marker)
    node("search", marker=marker, available=True)
    node("state", event=event, indexed=True)
    result["checks"]["restart_recovery"] = "index persisted; failed -> requeue -> indexed; new raw content found"
finally:
    if stopped:
        start_service()
    connections.close_all()
    connect()
    connections['default'].settings_dict['PORT'] = os.environ['POSTGRES_PORT']
    connections['default'].settings_dict['HOST'] = os.environ['POSTGRES_HOST']
    if user_id is not None:
        models.KhojUser.objects.filter(pk=user_id).delete()
        assert not models.Entry.objects.filter(user_id=user_id).exists()
        assert not models.KhojApiUser.objects.filter(user_id=user_id).exists()
    assert memory_hashes() == before_memory, "canonical memory changed"
    assert default_snapshot() == before_default, "default user's index or sources changed"
    result['checks']['cleanup'] = 'temporary user/token/index removed; canonical files and default index unchanged'
    connections.close_all()
    (run_dir / "result.json").write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False), flush=True)
