"""Load the plugin as package hermes_mybot_farm without putting plant/cli on sys.path."""

from __future__ import annotations

import importlib.util
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location(
    "hermes_mybot_farm_plugin_loader",
    _ROOT / "plugin_loader.py",
)
assert _spec and _spec.loader
_loader = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_loader)
_loader.ensure_plugin_package()
