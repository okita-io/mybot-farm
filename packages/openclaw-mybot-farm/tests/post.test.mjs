import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const api = await import(pathToFileURL(path.join(root, "src/farm-api.mjs")).href);
const { postListing, updateListing } = await import(pathToFileURL(path.join(root, "src/post.mjs")).href);
const { run } = await import(pathToFileURL(path.join(root, "bin/farm-plant.mjs")).href);

const SAMPLE_PACK = {
  format: "mybot.farm/agent-pack",
  version: "0.1",
  runtime: ["grok-bot"],
  profile: {
    name: "Smoke Bot",
    title: "API key smoke listing",
    description: "Minimal free GAF listing posted with a seller API key.",
  },
  skills: [],
  memory: [],
};

const SAMPLE_TEAM_PACK = {
  format: "mybot.farm/team-pack",
  version: "0.1",
  runtime: ["hermes"],
  profile: {
    name: "Smoke Crew",
    title: "Two-agent smoke team",
    description: "Minimal free team listing posted with a seller API key.",
  },
  members: [
    {
      role: "programmer",
      summary: "Implements small diffs.",
      pack: "agents/patch.json",
    },
    {
      role: "debugger",
      summary: "Reproduces and verifies.",
      pack: "agents/probe.json",
    },
  ],
  shared: {
    gettingStarted: "Install Patch and Probe, then follow the handoffs.",
  },
};

const LISTING_FIELDS = {
  kind: "agent",
  name: "Smoke Bot",
  title: "API key smoke listing",
  description: "Minimal free GAF listing posted with a seller API key.",
  category: "Experimental",
  priceCents: 0,
};

// Fake seller key for tests only — not a live credential.
const TEST_KEY = "mbf_" + "x".repeat(24);

function listingArgs(extra = {}) {
  return { ...LISTING_FIELDS, pack: { ...SAMPLE_PACK }, ...extra };
}

function jsonResponse(body, status = 201) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  delete process.env.MYBOT_FARM_API_KEY;
  delete process.env.MYBOT_FARM_URL;
});

test("env wins over config", () => {
  process.env.MYBOT_FARM_API_KEY = TEST_KEY;
  const resolved = api.resolveApiKey({ apiKey: "mbf_from_config_only" });
  assert.equal(resolved.startsWith("mbf_"), true);
  assert.equal(resolved.length, TEST_KEY.length);
  assert.notEqual(resolved, "mbf_from_config_only");
});

test("override wins over env", () => {
  process.env.MYBOT_FARM_API_KEY = "mbf_from_env_only________";
  const resolved = api.resolveApiKey({ apiKey: "mbf_cfg" }, TEST_KEY);
  assert.equal(resolved.startsWith("mbf_"), true);
  assert.equal(resolved.length, TEST_KEY.length);
});

test("missing key fails before network", async () => {
  let called = 0;
  const prev = globalThis.fetch;
  globalThis.fetch = async () => {
    called += 1;
    throw new Error("must not open a network connection");
  };
  try {
    const payload = await postListing({ args: listingArgs() });
    assert.equal(payload.ok, false);
    assert.match(payload.error, /seller API key required/);
    assert.match(payload.error, /MYBOT_FARM_API_KEY/);
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = prev;
  }
});

test("invalid price fails before network", async () => {
  let called = 0;
  const prev = globalThis.fetch;
  globalThis.fetch = async () => {
    called += 1;
    throw new Error("must not open a network connection");
  };
  try {
    const payload = await postListing({ args: listingArgs({ priceCents: 199, apiKey: TEST_KEY }) });
    assert.equal(payload.ok, false);
    assert.match(payload.error, /\$2\.00/);
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = prev;
  }
});

test("invalid category fails before network", async () => {
  let called = 0;
  const prev = globalThis.fetch;
  globalThis.fetch = async () => {
    called += 1;
    throw new Error("must not open a network connection");
  };
  try {
    const payload = await postListing({
      args: listingArgs({ category: "coding", apiKey: TEST_KEY }),
    });
    assert.equal(payload.ok, false);
    assert.match(payload.error, /exact farm label/);
    assert.match(payload.error, /Experimental/);
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = prev;
  }
});

test("free listing 201 sends Bearer without asserting full key", async () => {
  const captured = {};
  const prev = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    captured.url = String(url);
    captured.method = opts.method;
    captured.auth = opts.headers?.Authorization || opts.headers?.authorization || "";
    captured.body = opts.body;
    return jsonResponse({
      ok: true,
      id: "11111111-1111-4111-8111-111111111111",
      stallId: "11111111-1111-4111-8111-111111111111",
      slug: "smoke-bot",
      kind: "agent",
      pagePath: "/agents/smoke-bot",
      packVersion: 1,
      created: true,
      updated: false,
      hasReadme: false,
    });
  };
  process.env.MYBOT_FARM_API_KEY = TEST_KEY;
  try {
    const payload = await postListing({ args: listingArgs() });
    assert.equal(payload.ok, true);
    assert.equal(payload.slug, "smoke-bot");
    assert.equal(payload.id, "11111111-1111-4111-8111-111111111111");
    assert.equal(payload.packVersion, 1);
    assert.equal(payload.updated, false);
    assert.match(payload.text, /https:\/\/mybot\.farm\/agents\/smoke-bot/);
    assert.equal(payload.pageUrl, "https://mybot.farm/agents/smoke-bot");
    assert.equal(captured.method, "POST");
    assert.equal(String(captured.url).endsWith("/api/listings"), true);

    const auth = String(captured.auth);
    assert.equal(auth.startsWith("Bearer mbf_"), true);
    // Do not assertEqual the full secret (failure traces would print it).
    assert.equal(auth.length > "Bearer mbf_".length, true);

    const posted = JSON.parse(captured.body || "{}");
    assert.equal(posted.priceCents, 0);
    assert.equal(posted.category, "Experimental");
    assert.equal(posted.pack.format, "mybot.farm/agent-pack");
  } finally {
    globalThis.fetch = prev;
  }
});

test("http error surfaces status and short message", async () => {
  const prev = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: "connect_required",
        message: "Finish Stripe payouts before listing a paid bot.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  try {
    await assert.rejects(
      () =>
        api.createListing(
          "https://mybot.farm",
          api.buildListingPayload({
            kind: "agent",
            name: "Paid",
            title: "Paid",
            description: "Paid listing",
            category: "Experimental",
            priceCents: 500,
            pack: SAMPLE_PACK,
          }),
          TEST_KEY,
        ),
      (err) => {
        assert.equal(err instanceof api.FarmError, true);
        assert.equal(err.status, 403);
        const message = String(err.message);
        assert.match(message, /403/);
        assert.match(message, /connect_required/);
        assert.match(message, /Stripe/);
        assert.equal(message.includes(TEST_KEY), false);
        return true;
      },
    );
  } finally {
    globalThis.fetch = prev;
  }
});

test("dry-run redacts key and skips post", async () => {
  let called = 0;
  const prev = globalThis.fetch;
  globalThis.fetch = async () => {
    called += 1;
    throw new Error("dry-run must not POST");
  };
  try {
    const payload = await postListing({ args: listingArgs({ apiKey: TEST_KEY, dryRun: true }) });
    assert.equal(payload.ok, true);
    assert.equal(payload.dryRun, true);
    assert.match(payload.text, /not posted/);
    assert.match(payload.apiKey, /redacted/);
    assert.equal(payload.text.includes(TEST_KEY), false);
    assert.equal(JSON.stringify(payload).includes(TEST_KEY), false);
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = prev;
  }
});

test("CLI post GAF file free listing", async () => {
  const captured = {};
  const prev = globalThis.fetch;
  globalThis.fetch = async (_url, opts = {}) => {
    captured.auth = opts.headers?.Authorization || "";
    captured.posted = JSON.parse(opts.body || "{}");
    return jsonResponse({
      ok: true,
      slug: "smoke-bot",
      kind: "agent",
      pagePath: "/agents/smoke-bot",
      hasReadme: false,
    });
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "farm-post-"));
  const packPath = path.join(dir, "smoke.json");
  fs.writeFileSync(packPath, JSON.stringify(SAMPLE_PACK), "utf8");
  process.env.MYBOT_FARM_API_KEY = TEST_KEY;
  const lines = [];
  const errLines = [];
  try {
    const code = await run(
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
        packPath,
      ],
      { stdout: (s) => lines.push(String(s)), stderr: (s) => errLines.push(String(s)) },
    );
    assert.equal(code, 0, errLines.join("\n"));
    const out = lines.join("\n");
    assert.match(out, /smoke-bot/);
    assert.match(out, /https:\/\/mybot\.farm\/agents\/smoke-bot/);
    assert.equal(String(captured.auth).startsWith("Bearer mbf_"), true);
    assert.equal(captured.posted.priceCents, 0);
    assert.equal(captured.posted.kind, "agent");
  } finally {
    globalThis.fetch = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("CLI post --json dry-run", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "farm-post-"));
  const packPath = path.join(dir, "smoke.json");
  fs.writeFileSync(packPath, JSON.stringify(SAMPLE_PACK), "utf8");
  const lines = [];
  try {
    const code = await run(
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
        packPath,
        "--dry-run",
        "--json",
      ],
      { stdout: (s) => lines.push(String(s)), stderr: () => {} },
    );
    assert.equal(code, 0);
    const data = JSON.parse(lines.join("\n"));
    assert.equal(data.ok, true);
    assert.equal(data.dryRun, true);
    assert.equal(data.payload.priceCents, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("farm_update requires slug", async () => {
  const payload = await updateListing({ args: listingArgs({ apiKey: TEST_KEY }) });
  assert.equal(payload.ok, false);
  assert.match(payload.error, /slug required/);
});

test("owned slug upsert forwards id and pack version", async () => {
  const captured = {};
  const prev = globalThis.fetch;
  globalThis.fetch = async (_url, opts = {}) => {
    captured.body = opts.body;
    return jsonResponse(
      {
        ok: true,
        id: "22222222-2222-4222-8222-222222222222",
        stallId: "22222222-2222-4222-8222-222222222222",
        slug: "smoke-bot",
        kind: "agent",
        pagePath: "/agents/smoke-bot",
        packVersion: 2,
        created: false,
        updated: true,
        hasReadme: false,
      },
      200,
    );
  };
  process.env.MYBOT_FARM_API_KEY = TEST_KEY;
  try {
    const payload = await updateListing({
      args: listingArgs({ slug: "smoke-bot", packVersion: 2 }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.updated, true);
    assert.equal(payload.packVersion, 2);
    assert.equal(payload.id, "22222222-2222-4222-8222-222222222222");
    assert.match(payload.text, /Updated/);
    const posted = JSON.parse(captured.body || "{}");
    assert.equal(posted.slug, "smoke-bot");
    assert.equal(posted.packVersion, 2);
  } finally {
    globalThis.fetch = prev;
  }
});

test("team pack dry-run", async () => {
  let called = 0;
  const prev = globalThis.fetch;
  globalThis.fetch = async () => {
    called += 1;
    throw new Error("dry-run must not POST");
  };
  try {
    const payload = await postListing({
      args: listingArgs({
        kind: "team",
        name: "Smoke Crew",
        title: "Two-agent smoke team",
        description: "Minimal free team listing posted with a seller API key.",
        pack: { ...SAMPLE_TEAM_PACK },
        apiKey: TEST_KEY,
        dryRun: true,
      }),
    });
    assert.equal(payload.ok, true);
    assert.equal(payload.dryRun, true);
    assert.equal(payload.payload.kind, "team");
    assert.equal(payload.payload.pack.format, "mybot.farm/team-pack");
    assert.equal(payload.payload.pack.memberCount, 2);
    assert.equal(called, 0);
  } finally {
    globalThis.fetch = prev;
  }
});

test("kind team rejects agent-pack", async () => {
  const payload = await postListing({
    args: listingArgs({ kind: "team", apiKey: TEST_KEY, dryRun: true }),
  });
  assert.equal(payload.ok, false);
  assert.match(payload.error, /team-pack/);
});
