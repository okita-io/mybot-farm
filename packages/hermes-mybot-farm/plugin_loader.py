"""Register this hyphenated directory as importable package `hermes_mybot_farm`.

The plugin folder is `hermes-mybot-farm` (invalid as a Python package name).
Hermes loads `__init__.py` as a package via importlib. CLI, scripts, and tests
call `ensure_plugin_package()` so relative imports resolve without putting
`plant` / `schemas` / `cli` on `sys.path` (those names collide with other
plugins and site-packages).
"""

from __future__ import annotations

import sys
import types
from pathlib import Path

PACKAGE_NAME = "hermes_mybot_farm"
PLUGIN_ROOT = Path(__file__).resolve().parent


def ensure_plugin_package() -> str:
    existing = sys.modules.get(PACKAGE_NAME)
    if existing is not None and getattr(existing, "__path__", None) == [str(PLUGIN_ROOT)]:
        return PACKAGE_NAME
    pkg = types.ModuleType(PACKAGE_NAME)
    pkg.__path__ = [str(PLUGIN_ROOT)]
    pkg.__package__ = PACKAGE_NAME
    pkg.__file__ = str(PLUGIN_ROOT / "__init__.py")
    sys.modules[PACKAGE_NAME] = pkg
    return PACKAGE_NAME
