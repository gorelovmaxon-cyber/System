# SC-04 report

Status: blocked

## Verification

- `khoj --version`: command unavailable.
- `py -0p`: only Python 3.14 is installed.
- PyPI metadata checked 2026-09-08: stable Khoj requires Python `<3.13`.
- A pre-release dry-run reached native `llama-cpp-python` resolution and was
  stopped; no system package or service was installed.
- Docker Desktop/WSL are also unavailable.

The service runbook now refuses to claim an unverified YAML/API contract and
describes the exact gate for a Python 3.12-enabled machine. No `config.local.yml`
or index data was created; both paths are gitignored. Live version, health,
initial index, search, restart persistence and secret-exclusion checks remain
blocked rather than replaced by a mock.
