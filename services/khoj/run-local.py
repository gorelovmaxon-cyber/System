"""Локальный Khoj 1.42.10: запуск сервиса и настройка источника памяти.

Штатный путь Khoj `USE_EMBEDDED_DB=true` рассчитан на Unix-сокеты: он
безусловно подставляет в `DB_HOST` каталог pgdata, а в `DB_PORT` — пустую
строку. На Windows pgserver поднимает сервер по TCP на 127.0.0.1 со свободным
портом (`socket.AF_UNIX` там отсутствует), поэтому подключиться по этому пути
нельзя. Скрипт сам стартует pgserver и передаёт Khoj фактические host/port.

Запуск сервиса:   <venv>/Scripts/python.exe services/khoj/run-local.py
Источник памяти:  ... run-local.py --set-memory-source
Состояние:        ... run-local.py --status
Остановка:        ... run-local.py --stop

`--stop` останавливает сначала PostgreSQL штатным `pg_ctl -m fast` (checkpoint),
и только потом процесс сервиса: обратный порядок оборвал бы postmaster жёстко и
потребовал восстановления при следующем запуске. При штатном выходе (Ctrl+C)
pgserver останавливает сервер сам через собственный atexit-обработчик.
"""

from __future__ import annotations

import argparse
import atexit
import glob
import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_ENV_FILE = SCRIPT_DIR / "config.local.env"
PG_START_TIMEOUT = 120


def ensure_pg_timezone() -> str | None:
    """Восстановить TZif-данные, которых нет в Windows-поставке pgserver.

    Официальные сборки PostgreSQL кладут их в `<sharedir>/timezone`; в колесе
    pgserver 0.1.4 для Windows каталог отсутствует, из-за чего Django падает на
    `SET TimeZone='UTC'` ещё до первой миграции. Источник — пакет `tzdata`
    (те же TZif-файлы, что генерирует zic для PostgreSQL).
    """
    import pgserver
    import tzdata

    timezone_dir = Path(pgserver.__file__).parent / "pginstall" / "share" / "postgresql" / "timezone"
    if (timezone_dir / "UTC").exists():
        return None

    source = Path(tzdata.__file__).parent / "zoneinfo"
    shutil.copytree(source, timezone_dir, dirs_exist_ok=True)
    return str(timezone_dir)


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def service_pid_file(pgdata: Path) -> Path:
    """PID-файл сервиса — рядом с данными, чтобы не заводить отдельную настройку."""
    return pgdata.parent / "khoj-service.pid"


def running_service_pid(pid_file: Path) -> int | None:
    import psutil

    try:
        pid = int(pid_file.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        return None
    try:
        process = psutil.Process(pid)
    except psutil.NoSuchProcess:
        return None
    return pid if process.is_running() else None


def describe_status(pgdata: Path) -> int:
    from pgserver.utils import PostmasterInfo

    pid = running_service_pid(service_pid_file(pgdata))
    print(f"сервис: {'работает, pid ' + str(pid) if pid else 'остановлен'}")
    info = PostmasterInfo.read_from_pgdata(pgdata)
    if info is None:
        print("postgres: не запускался (нет postmaster.pid)")
    elif info.is_running():
        print(f"postgres: работает, pid {info.pid}, {info.hostname or '127.0.0.1'}:{info.port}, статус {info.status}")
    else:
        print(f"postgres: процесс pid {info.pid} не найден, остался устаревший postmaster.pid")
    return 0


def stop_local(pgdata: Path) -> int:
    import pgserver
    from pgserver.utils import PostmasterInfo

    info = PostmasterInfo.read_from_pgdata(pgdata)
    if info is not None and info.is_running():
        pgserver.pg_ctl(["-w", "-m", "fast", "stop"], pgdata=pgdata)
        print(f"postgres остановлен: pid {info.pid}, порт {info.port}")
    else:
        print("postgres уже остановлен")

    pid_file = service_pid_file(pgdata)
    pid = running_service_pid(pid_file)
    if pid is None:
        print("сервис уже остановлен")
        pid_file.unlink(missing_ok=True)
        return 0

    if sys.platform == "win32":
        # /T — вместе с потомками: postmaster уже остановлен выше, поэтому
        # жёсткое завершение дерева данных не затрагивает.
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, check=False)
    else:
        os.kill(pid, signal.SIGTERM)

    for _ in range(60):
        if running_service_pid(pid_file) is None:
            break
        time.sleep(0.25)
    remaining = running_service_pid(pid_file)
    print(f"сервис остановлен: pid {pid}" if remaining is None else f"сервис не остановился: pid {remaining}")
    pid_file.unlink(missing_ok=True)
    return 0 if remaining is None else 1


def get_pgserver(pgdata: Path):
    """Allow crash recovery to finish before pgserver's fixed 10s timeout.

    pgserver 0.1.4 hardcodes subprocess timeout=10 for pg_ctl start. On Windows
    recovery can take longer (observed 38s). Adjust only this invocation; retain
    pgserver's locking, process ownership and cleanup, without editing the wheel.
    """
    import pgserver
    import pgserver.postgres_server as implementation

    original = implementation.pg_ctl

    def recovery_aware_ctl(args, **kwargs):
        if args and args[-1] == "start":
            args = ["-t", str(PG_START_TIMEOUT), *args]
            kwargs["timeout"] = PG_START_TIMEOUT + 5
        return original(args, **kwargs)

    implementation.pg_ctl = recovery_aware_ctl
    try:
        return pgserver.get_server(pgdata)
    finally:
        implementation.pg_ctl = original


def start_pgserver(pgdata: Path):
    """Поднять встроенный PostgreSQL и вернуть (instance, host, port, db_name)."""
    import pgserver

    restored = ensure_pg_timezone()
    if restored:
        print(f"восстановлены TZif-данные PostgreSQL: {restored}")

    pgdata.mkdir(parents=True, exist_ok=True)

    server = get_pgserver(pgdata)
    postmaster = server.get_postmaster_info()

    db_name = os.environ.get("POSTGRES_DB", "khoj")
    server.psql("CREATE EXTENSION IF NOT EXISTS vector;")
    if "(1 row)" not in server.psql(f"SELECT 1 FROM pg_database WHERE datname = '{db_name}';"):
        server.psql(f'CREATE DATABASE "{db_name}";')

    return server, postmaster.hostname or "127.0.0.1", str(postmaster.port), db_name


def set_memory_source(memory_root: Path, index_headings: bool) -> int:
    """Прописать источник индекса: только Markdown внутри каталога памяти."""
    import django

    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "khoj.app.settings")
    django.setup()

    from khoj.database.models import KhojUser, LocalMarkdownConfig

    user = KhojUser.objects.filter(username="default").first()
    if user is None:
        print("пользователь default ещё не создан — сначала запустите сервис", file=sys.stderr)
        return 3

    if not memory_root.is_dir():
        print(f"нет каталога памяти: {memory_root}", file=sys.stderr)
        return 4

    pattern = memory_root.as_posix().rstrip("/") + "/**/*.md"
    matched = sorted(glob.glob(pattern, recursive=True))

    LocalMarkdownConfig.objects.filter(user=user).delete()
    LocalMarkdownConfig.objects.create(
        input_files=[],
        input_filter=[pattern],
        index_heading_entries=index_headings,
        user=user,
    )

    print(f"источник: {pattern}")
    print(f"совпавших файлов: {len(matched)}")
    for path in matched[:10]:
        print(f"  {path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Локальный Khoj с embedded PostgreSQL")
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE)
    parser.add_argument("--pgdata", type=Path, help="переопределить каталог pgdata")
    parser.add_argument(
        "--set-memory-source",
        action="store_true",
        help="прописать источник индекса и выйти, не запуская сервер",
    )
    parser.add_argument(
        "--heading-entries",
        action="store_true",
        help="индексировать также заголовки Markdown",
    )
    parser.add_argument("--status", action="store_true", help="показать состояние сервиса и БД и выйти")
    parser.add_argument("--stop", action="store_true", help="остановить сервис и встроенную БД")
    parsed, extra_args = parser.parse_known_args()

    if not parsed.env_file.exists():
        print(f"нет файла конфигурации: {parsed.env_file}", file=sys.stderr)
        return 2

    os.environ.update(load_env_file(parsed.env_file))
    pgdata = parsed.pgdata or Path(os.environ["PGSERVER_DATA_DIR"])

    if parsed.status:
        return describe_status(pgdata)
    if parsed.stop:
        return stop_local(pgdata)

    _, pg_host, pg_port, db_name = start_pgserver(pgdata)

    # Эти переменные Khoj читает только при выключенном USE_EMBEDDED_DB.
    os.environ["USE_EMBEDDED_DB"] = "false"
    os.environ["POSTGRES_HOST"] = pg_host
    os.environ["POSTGRES_PORT"] = pg_port
    os.environ.setdefault("POSTGRES_USER", "postgres")
    os.environ.setdefault("POSTGRES_DB", db_name)

    if parsed.set_memory_source:
        return set_memory_source(Path(os.environ["KHOJ_MEMORY_ROOT"]), parsed.heading_entries)

    sys.argv = [
        "khoj",
        "--anonymous-mode",
        "--non-interactive",
        "--host",
        os.environ.get("KHOJ_HOST", "127.0.0.1"),
        "--port",
        os.environ.get("KHOJ_PORT", "42110"),
        "--config-file",
        str(SCRIPT_DIR / "data" / "khoj.yml"),
        *extra_args,
    ]

    pid_file = service_pid_file(pgdata)
    pid_file.write_text(str(os.getpid()), encoding="utf-8")
    atexit.register(pid_file.unlink, missing_ok=True)

    from khoj.main import run

    run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
