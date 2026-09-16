from __future__ import annotations

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stderr, redirect_stdout
from io import BytesIO
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from farm_api import (  # noqa: E402
    FarmError,
    build_listing_payload,
    create_listing,
    resolve_api_key,
)
from farm_tools import farm_post  # noqa: E402
from cli import main  # noqa: E402

SAMPLE_PACK = {
    "format": "mybot.farm/agent-pack",
    "version": "0.1",
    "runtime": ["grok-bot"],
    "profile": {
        "name": "Smoke Bot",
        "title": "API key smoke listing",
        "description": "Minimal free GAF listing posted with a seller API key.",
    },
    "skills": [],
    "memory": [],
}

LISTING_FIELDS = {
    "kind": "agent",
    "name": "Smoke Bot",
    "title": "API key smoke listing",
    "description": "Minimal free GAF listing posted with a seller API key.",
    "category": "Experimental",
    "priceCents": 0,
}

# Fake seller key for tests only — not a live credential.
TEST_KEY = "mbf_" + ("x" * 24)


def _listing_args(**extra: object) -> dict:
    args = dict(LISTING_FIELDS)
    args["pack"] = dict(SAMPLE_PACK)
    args.update(extra)
    return args


class _FakeResponse:
    def __init__(self, body: bytes, status: int = 201) -> None:
        self._body = body
        self.status = status

    def read(self) -> bytes:
        return self._body

    def __enter__(self) -> "_FakeResponse":
        return self

    def __exit__(self, *args: object) -> None:
        return None


class PostTests(unittest.TestCase):
    def tearDown(self) -> None:
        os.environ.pop("MYBOT_FARM_API_KEY", None)
        os.environ.pop("MYBOT_FARM_URL", None)

    def test_env_wins_over_config(self) -> None:
        os.environ["MYBOT_FARM_API_KEY"] = TEST_KEY
        resolved = resolve_api_key({"apiKey": "mbf_from_config_only"})
        self.assertTrue(resolved.startswith("mbf_"))
        self.assertEqual(len(resolved), len(TEST_KEY))
        self.assertNotEqual(resolved, "mbf_from_config_only")

    def test_override_wins_over_env(self) -> None:
        os.environ["MYBOT_FARM_API_KEY"] = "mbf_from_env_only________"
        resolved = resolve_api_key({"apiKey": "mbf_cfg"}, override=TEST_KEY)
        self.assertTrue(resolved.startswith("mbf_"))
        self.assertEqual(len(resolved), len(TEST_KEY))

    def test_missing_key_fails_before_network(self) -> None:
        called = {"n": 0}

        def boom(*_a, **_k):
            called["n"] += 1
            raise AssertionError("must not open a network connection")

        with patch("farm_api.urlopen", boom):
            payload = json.loads(farm_post(_listing_args()))
        self.assertFalse(payload["ok"])
        self.assertIn("seller API key required", payload["error"])
        self.assertIn("MYBOT_FARM_API_KEY", payload["error"])
        self.assertEqual(called["n"], 0)

    def test_invalid_price_fails_before_network(self) -> None:
        called = {"n": 0}

        def boom(*_a, **_k):
            called["n"] += 1
            raise AssertionError("must not open a network connection")

        with patch("farm_api.urlopen", boom):
            payload = json.loads(farm_post(_listing_args(priceCents=199, apiKey=TEST_KEY)))
        self.assertFalse(payload["ok"])
        self.assertIn("$2.00", payload["error"])
        self.assertEqual(called["n"], 0)

    def test_invalid_category_fails_before_network(self) -> None:
        called = {"n": 0}

        def boom(*_a, **_k):
            called["n"] += 1
            raise AssertionError("must not open a network connection")

        with patch("farm_api.urlopen", boom):
            payload = json.loads(
                farm_post(_listing_args(category="coding", apiKey=TEST_KEY))
            )
        self.assertFalse(payload["ok"])
        self.assertIn("exact farm label", payload["error"])
        self.assertIn("Experimental", payload["error"])
        self.assertEqual(called["n"], 0)

    def test_free_listing_201_sends_bearer_without_asserting_full_key(self) -> None:
        captured: dict[str, object] = {}
        body = json.dumps(
            {
                "ok": True,
                "slug": "smoke-bot",
                "kind": "agent",
                "pagePath": "/agents/smoke-bot",
                "hasReadme": False,
            }
        ).encode("utf-8")

        def fake_urlopen(req: Request, timeout=None):
            captured["url"] = req.full_url
            captured["method"] = req.get_method()
            captured["auth"] = req.get_header("Authorization") or ""
            captured["body"] = req.data
            captured["timeout"] = timeout
            return _FakeResponse(body)

        os.environ["MYBOT_FARM_API_KEY"] = TEST_KEY
        with patch("farm_api.urlopen", fake_urlopen):
            payload = json.loads(farm_post(_listing_args()))

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["slug"], "smoke-bot")
        self.assertIn("https://mybot.farm/agents/smoke-bot", payload["text"])
        self.assertEqual(payload["pageUrl"], "https://mybot.farm/agents/smoke-bot")
        self.assertEqual(captured["method"], "POST")
        url = str(captured["url"])
        self.assertTrue(url.endswith("/api/listings"))

        auth = str(captured["auth"])
        self.assertTrue(auth.startswith("Bearer mbf_"))
        # Do not assertEqual the full secret (failure traces would print it).
        self.assertGreater(len(auth), len("Bearer mbf_"))

        posted = json.loads(captured["body"] or b"{}")
        self.assertEqual(posted["priceCents"], 0)
        self.assertEqual(posted["category"], "Experimental")
        self.assertEqual(posted["pack"]["format"], "mybot.farm/agent-pack")

    def test_http_error_surfaces_status_and_short_message(self) -> None:
        err_body = b'{"error":"connect_required","message":"Finish Stripe payouts before listing a paid bot."}'

        def fake_urlopen(req: Request, timeout=None):
            raise HTTPError(
                req.full_url,
                403,
                "Forbidden",
                None,
                BytesIO(err_body),
            )

        with patch("farm_api.urlopen", fake_urlopen):
            with self.assertRaises(FarmError) as ctx:
                create_listing(
                    "https://mybot.farm",
                    build_listing_payload(
                        kind="agent",
                        name="Paid",
                        title="Paid",
                        description="Paid listing",
                        category="Experimental",
                        price_cents=500,
                        pack=SAMPLE_PACK,
                    ),
                    TEST_KEY,
                )
        self.assertEqual(ctx.exception.status, 403)
        message = str(ctx.exception)
        self.assertIn("403", message)
        self.assertIn("connect_required", message)
        self.assertIn("Stripe", message)
        self.assertNotIn(TEST_KEY, message)

    def test_dry_run_redacts_key_and_skips_post(self) -> None:
        called = {"n": 0}

        def boom(*_a, **_k):
            called["n"] += 1
            raise AssertionError("dry-run must not POST")

        with patch("farm_api.urlopen", boom):
            payload = json.loads(farm_post(_listing_args(apiKey=TEST_KEY, dryRun=True)))
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["dryRun"])
        self.assertIn("not posted", payload["text"])
        self.assertIn("redacted", payload["apiKey"])
        self.assertNotIn(TEST_KEY, payload["text"])
        self.assertNotIn(TEST_KEY, json.dumps(payload))
        self.assertEqual(called["n"], 0)

    def test_cli_post_gaf_file_free_listing(self) -> None:
        captured: dict[str, object] = {}
        body = json.dumps(
            {
                "ok": True,
                "slug": "smoke-bot",
                "kind": "agent",
                "pagePath": "/agents/smoke-bot",
                "hasReadme": False,
            }
        ).encode("utf-8")

        def fake_urlopen(req: Request, timeout=None):
            captured["auth"] = req.get_header("Authorization") or ""
            captured["posted"] = json.loads(req.data or b"{}")
            return _FakeResponse(body)

        with tempfile.TemporaryDirectory() as raw:
            pack_path = Path(raw) / "smoke.json"
            pack_path.write_text(json.dumps(SAMPLE_PACK), encoding="utf-8")
            os.environ["MYBOT_FARM_API_KEY"] = TEST_KEY
            buf = io.StringIO()
            err = io.StringIO()
            with patch("farm_api.urlopen", fake_urlopen):
                with redirect_stdout(buf), redirect_stderr(err):
                    code = main(
                        [
                            "post",
                            "--kind",
                            "agent",
                            "--name",
                            "Smoke Bot",
                            "--title",
                            "API key smoke listing",
                            "--description",
                            "Minimal free GAF listing posted with a seller API key.",
                            "--category",
                            "Experimental",
                            "--price-cents",
                            "0",
                            "--pack",
                            str(pack_path),
                        ]
                    )
        self.assertEqual(code, 0, err.getvalue())
        out = buf.getvalue()
        self.assertIn("smoke-bot", out)
        self.assertIn("https://mybot.farm/agents/smoke-bot", out)
        self.assertTrue(str(captured.get("auth", "")).startswith("Bearer mbf_"))
        posted = captured.get("posted") or {}
        self.assertEqual(posted.get("priceCents"), 0)
        self.assertEqual(posted.get("kind"), "agent")

    def test_cli_post_json_flag(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            pack_path = Path(raw) / "smoke.json"
            pack_path.write_text(json.dumps(SAMPLE_PACK), encoding="utf-8")
            buf = io.StringIO()
            with redirect_stdout(buf), redirect_stderr(io.StringIO()):
                code = main(
                    [
                        "post",
                        "--kind",
                        "agent",
                        "--name",
                        "Smoke Bot",
                        "--title",
                        "API key smoke listing",
                        "--description",
                        "Minimal free GAF listing.",
                        "--category",
                        "Experimental",
                        "--price-cents",
                        "0",
                        "--pack",
                        str(pack_path),
                        "--dry-run",
                        "--json",
                    ]
                )
        self.assertEqual(code, 0)
        data = json.loads(buf.getvalue())
        self.assertTrue(data["ok"])
        self.assertTrue(data["dryRun"])
        self.assertEqual(data["payload"]["priceCents"], 0)


if __name__ == "__main__":
    unittest.main()
