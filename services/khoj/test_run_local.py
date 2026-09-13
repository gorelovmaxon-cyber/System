"""Launcher regressions; no service, database or package changes."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import types
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("run_local", Path(__file__).with_name("run-local.py"))
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class RecoveryTimeoutTests(unittest.TestCase):
    def fake_package(self, command):
        implementation = types.ModuleType("pgserver.postgres_server")
        implementation.pg_ctl = command
        package = types.ModuleType("pgserver")
        package.postgres_server = implementation
        return package, implementation

    def test_recovery_longer_than_ten_seconds_can_complete(self):
        def command(args, **kwargs):
            # Reproduce the observed 38s recovery without delaying the test.
            if kwargs.get("timeout", 0) < 38:
                raise subprocess.TimeoutExpired("pg_ctl start", kwargs["timeout"])
            self.assertEqual(args[:2], ["-t", "120"])
            self.assertEqual(kwargs["pgdata"], Path("fixture"))
            return "ready"

        package, implementation = self.fake_package(command)
        package.get_server = lambda pgdata: implementation.pg_ctl(
            ["-w", "start"], pgdata=pgdata, timeout=10)
        with patch.dict(sys.modules, {"pgserver": package, "pgserver.postgres_server": implementation}):
            with self.assertRaises(subprocess.TimeoutExpired):
                package.get_server(Path("fixture"))
            self.assertEqual(launcher.get_pgserver(Path("fixture")), "ready")
        self.assertIs(implementation.pg_ctl, command)

    def test_failure_still_propagates_and_restores_command(self):
        def command(args, **kwargs):
            raise subprocess.CalledProcessError(1, "pg_ctl")
        package, implementation = self.fake_package(command)
        package.get_server = lambda pgdata: implementation.pg_ctl(["start"], pgdata=pgdata)
        with patch.dict(sys.modules, {"pgserver": package, "pgserver.postgres_server": implementation}):
            with self.assertRaises(subprocess.CalledProcessError):
                launcher.get_pgserver(Path("fixture"))
        self.assertIs(implementation.pg_ctl, command)

    def test_stop_options_are_not_changed(self):
        def command(args, **kwargs):
            self.assertEqual(args, ["-w", "stop"])
            self.assertEqual(kwargs, {"timeout": 10})
            return "stopped"
        package, implementation = self.fake_package(command)
        package.get_server = lambda pgdata: implementation.pg_ctl(["-w", "stop"], timeout=10)
        with patch.dict(sys.modules, {"pgserver": package, "pgserver.postgres_server": implementation}):
            self.assertEqual(launcher.get_pgserver(Path("fixture")), "stopped")


if __name__ == "__main__":
    unittest.main()
