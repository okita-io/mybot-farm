from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _load_plugin_yaml() -> dict:
    data: dict = {}
    current_list: list[str] | None = None
    in_config = False
    for raw in (ROOT / "plugin.yaml").read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line.strip():
            continue
        if not line.startswith(" ") and line.endswith(":"):
            key = line[:-1].strip()
            in_config = key == "config_schema"
            current_list = [] if key == "provides_tools" else None
            if key != "config_schema":
                data[key] = current_list if current_list is not None else ""
            continue
        if current_list is not None and line.strip().startswith("- "):
            current_list.append(line.strip()[2:].strip())
            continue
        if in_config:
            continue
        if ":" in line and not line.startswith(" "):
            key, _, val = line.partition(":")
            data[key.strip()] = val.strip()
    return data


class RegisterTests(unittest.TestCase):
    def test_plugin_yaml_and_register(self) -> None:
        manifest = _load_plugin_yaml()
        self.assertEqual(manifest["name"], "mybot-farm")
        self.assertTrue(manifest["version"])
        self.assertTrue(manifest["description"])
        declared = set(manifest["provides_tools"])

        recorded = {"tools": [], "hooks": [], "commands": []}

        class Ctx:
            plugin_config = {}

            def register_tool(self, name, *args, **kwargs):
                recorded["tools"].append(name)

            def register_hook(self, hook_name, callback):
                recorded["hooks"].append(hook_name)

            def register_cli_command(self, name, *args, **kwargs):
                recorded["commands"].append(name)

            def register_command(self, name, *args, **kwargs):
                recorded["commands"].append(name)

        spec = importlib.util.spec_from_file_location(
            "hermes_validate_probe_plugin",
            str(ROOT / "__init__.py"),
            submodule_search_locations=[str(ROOT)],
        )
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        module.__path__ = [str(ROOT)]
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        module.register(Ctx())

        actual = set(recorded["tools"])
        self.assertEqual(actual, declared)
        self.assertIn("farm", recorded["commands"])
        self.assertFalse(recorded["hooks"])

    def test_search_tool_json(self) -> None:
        from farm_tools import farm_search

        payload = json.loads(farm_search({"query": ""}))
        self.assertFalse(payload["ok"])
        self.assertIn("query required", payload["error"])

    def test_register_survives_host_tools_module(self) -> None:
        """Hermes ships a top-level `tools` package. Plugin load must not bind it."""
        import types

        fake = types.ModuleType("tools")
        sys.modules["tools"] = fake
        self.test_plugin_yaml_and_register()


if __name__ == "__main__":
    unittest.main()
