import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  asciiHeaderText,
  calledToolNames,
  callsWriteTool,
  readPresentedCredential,
  unauthorizedResponse,
} from "./mcp-auth-core.ts";
import { createFarmMcpHttpHandler, mcpCorsHeaders } from "./mcp-http.ts";
import {
  callerIdentity,
  createBackstopLimiter,
  formatLogLine,
  hashCaller,
  type McpLogEntry,
} from "./mcp-ops.ts";
import type { CallContext, FarmMcpDeps, ToolOutcome } from "./mcp-server.ts";
import { mcpServerJson } from "./mcp-server-json.ts";
import { FARM_TOOL_NAMES, WRITE_TOOL_NAMES, farmTools } from "./mcp-tool-defs.ts";

const GOOD_KEY = `mbf_${"a".repeat(43)}`;
const REVOKED_KEY = `mbf_${"b".repeat(43)}`;
const PROTOCOL = "2025-06-18";

type Call = { method: string; args: unknown[] };

function makeDeps(overrides: Partial<FarmMcpDeps> = {}) {
  const calls: Call[] = [];
  const logs: McpLogEntry[] = [];
  const counted: { slug: string; caller: string }[] = [];
  const record =
    (method: string, outcome: ToolOutcome) =>
    async (...args: unknown[]) => {
      calls.push({ method, args });
      return outcome;
    };
  const deps: FarmMcpDeps = {
    search: record("search", { ok: true, data: { stalls: [{ slug: "gift-day" }] } }),
    getStall: record("getStall", { ok: true, data: { slug: "gift-day" } }),
    getPack: record("getPack", { ok: true, countable: true, data: { pack: { format: "mybot.farm/agent-pack" } } }),
    listSkills: record("listSkills", { ok: true, data: { skills: [] } }),
    getInstallPrompt: record("getInstallPrompt", { ok: true, data: { prompt: "p" } }),
    getGrokTemplate: record("getGrokTemplate", { ok: true, data: { recipe: {} } }),
    listRevisions: record("listRevisions", { ok: true, data: { revisions: [] } }),
    plant: record("plant", { ok: true, countable: true, data: { installed: false } }),
    postListing: record("postListing", { ok: true, data: { slug: "smoke-bot" } }),
    async countDownload(slug, caller) {
      counted.push({ slug, caller });
      return true;
    },
    async rateLimit() {
      return { limited: false };
    },
    log: (entry) => logs.push(entry),
    ...overrides,
  };
  return { deps, calls, logs, counted };
}

function makeHandler(deps: FarmMcpDeps) {
  return createFarmMcpHttpHandler(deps, async (key) =>
    key === GOOD_KEY ? { id: "user-1", clerkUserId: "clerk_1", keyPrefix: key.slice(0, 12) } : null,
  );
}

async function rpc(
  handler: (request: Request) => Promise<Response>,
  body: unknown,
  headers: Record<string, string> = {},
) {
  const response = await handler(
    new Request("http://localhost/mcp", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
        "mcp-protocol-version": PROTOCOL,
        "x-forwarded-for": "203.0.113.7",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
  const text = await response.text();
  let json: Record<string, unknown> | undefined;
  const dataLine = text.split("\n").find((line) => line.startsWith("data: "));
  try {
    json = JSON.parse(dataLine ? dataLine.slice(6) : text);
  } catch {
    json = undefined;
  }
  return { response, json };
}

function callTool(name: string, args: Record<string, unknown> = {}, id = 3) {
  return { jsonrpc: "2.0", id, method: "tools/call", params: { name, arguments: args } };
}

function toolPayload(json: Record<string, unknown> | undefined) {
  const result = json?.result as { content: { text: string }[]; isError?: boolean };
  return { isError: result.isError === true, data: JSON.parse(result.content[0]!.text) };
}

describe("mcp tool catalog", () => {
  it("exposes the v1 farm_* tools", () => {
    assert.deepEqual([...FARM_TOOL_NAMES].sort(), [
      "farm_get_grok_template",
      "farm_get_install_prompt",
      "farm_get_pack",
      "farm_get_stall",
      "farm_list_revisions",
      "farm_list_skills",
      "farm_list_teams",
      "farm_plant",
      "farm_post",
      "farm_search",
      "farm_update",
    ]);
    assert.deepEqual([...WRITE_TOOL_NAMES].sort(), ["farm_post", "farm_update"]);
  });

  it("rejects bad search and missing slug input", () => {
    const search = farmTools.find((tool) => tool.name === "farm_search")!.inputSchema;
    assert.equal(search.safeParse({ kind: "robot" }).success, false);
    assert.equal(search.safeParse({ sort: "random" }).success, false);
    assert.equal(search.safeParse({ limit: 500 }).success, false);
    assert.equal(search.safeParse({ q: "gift", kind: "team", sort: "name", limit: 5 }).success, true);
    const stall = farmTools.find((tool) => tool.name === "farm_get_stall")!.inputSchema;
    assert.equal(stall.safeParse({}).success, false);
    assert.equal(stall.safeParse({ slug: "  " }).success, false);
    const update = farmTools.find((tool) => tool.name === "farm_update")!.inputSchema;
    assert.equal(
      update.safeParse({ kind: "agent", name: "a", title: "t", description: "d", category: "Experimental", priceCents: 0, pack: {} }).success,
      false,
      "farm_update requires slug",
    );
  });
});

describe("mcp auth core", () => {
  it("classifies presented credentials", () => {
    const h = (init: Record<string, string>) => new Headers(init);
    assert.deepEqual(readPresentedCredential(h({})), { kind: "none" });
    assert.deepEqual(readPresentedCredential(h({ authorization: `Bearer ${GOOD_KEY}` })), { kind: "api_key", key: GOOD_KEY });
    assert.deepEqual(readPresentedCredential(h({ "x-api-key": GOOD_KEY })), { kind: "api_key", key: GOOD_KEY });
    assert.deepEqual(readPresentedCredential(h({ authorization: "Bearer mbf_short" })), { kind: "malformed_api_key" });
    assert.deepEqual(readPresentedCredential(h({ authorization: "Bearer eyJhbGciOi.jwt.token" })), { kind: "other_bearer" });
    assert.deepEqual(readPresentedCredential(h({ "x-api-key": "nope" })), { kind: "malformed_api_key" });
  });

  it("finds write tool calls, including in batches", () => {
    assert.deepEqual(calledToolNames(callTool("farm_search")), ["farm_search"]);
    assert.equal(callsWriteTool(callTool("farm_search")), false);
    assert.equal(callsWriteTool(callTool("farm_post")), true);
    assert.equal(callsWriteTool([callTool("farm_search", {}, 1), callTool("farm_update", {}, 2)]), true);
    assert.equal(callsWriteTool({ jsonrpc: "2.0", id: 1, method: "tools/list" }), false);
    assert.equal(callsWriteTool(null), false);
  });

  it("builds an ASCII-only 401 challenge", async () => {
    const response = unauthorizedResponse("missing");
    assert.equal(response.status, 401);
    const challenge = response.headers.get("www-authenticate") ?? "";
    assert.match(challenge, /^Bearer realm="mybot.farm"/);
    assert.match(challenge, /^[\x20-\x7e]+$/);
    assert.equal(asciiHeaderText('a "b" … c'), "a 'b' ... c");
    const body = (await response.json()) as { error: string; docs: string };
    assert.equal(body.error, "unauthorized");
    assert.equal(body.docs, "https://mybot.farm/install/mcp");
  });
});

describe("mcp endpoint (in-process client)", () => {
  let ctx: ReturnType<typeof makeDeps>;
  let handler: ReturnType<typeof makeHandler>;

  beforeEach(() => {
    ctx = makeDeps();
    handler = makeHandler(ctx.deps);
  });

  it("initializes and lists tools anonymously", async () => {
    const init = await rpc(handler, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: PROTOCOL, capabilities: {}, clientInfo: { name: "test", version: "1" } },
    });
    assert.equal(init.response.status, 200);
    const info = (init.json?.result as { serverInfo: { name: string } }).serverInfo;
    assert.equal(info.name, "mybot-farm");
    assert.equal(init.response.headers.get("access-control-allow-origin"), "*");

    const list = await rpc(handler, { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    const tools = (list.json?.result as { tools: { name: string; annotations?: { readOnlyHint?: boolean } }[] }).tools;
    assert.deepEqual(tools.map((tool) => tool.name).sort(), [...FARM_TOOL_NAMES].sort());
    assert.equal(tools.find((tool) => tool.name === "farm_post")?.annotations?.readOnlyHint, false);
    assert.equal(tools.find((tool) => tool.name === "farm_search")?.annotations?.readOnlyHint, true);
  });

  it("runs farm_search with the plugin query alias and logs the call", async () => {
    const { response, json } = await rpc(handler, callTool("farm_search", { query: "gift", kind: "agent" }));
    assert.equal(response.status, 200);
    const payload = toolPayload(json);
    assert.equal(payload.isError, false);
    assert.equal(ctx.calls[0]?.method, "search");
    assert.deepEqual(ctx.calls[0]?.args[0], { q: "gift", kind: "agent", sort: undefined, limit: undefined });
    assert.equal(ctx.logs[0]?.tool, "farm_search");
    assert.equal(ctx.logs[0]?.authType, "anon");
    assert.equal(ctx.logs[0]?.outcome, "ok");
  });

  it("farm_list_teams forces kind=team", async () => {
    await rpc(handler, callTool("farm_list_teams", { q: "desk" }));
    assert.deepEqual(ctx.calls[0]?.args[0], { q: "desk", kind: "team", sort: undefined, limit: undefined });
  });

  it("rejects a write without a key with HTTP 401 before any tool runs", async () => {
    const { response } = await rpc(
      handler,
      callTool("farm_post", { kind: "agent", name: "x", title: "x", description: "x", category: "Experimental", priceCents: 0, pack: {} }),
    );
    assert.equal(response.status, 401);
    assert.match(response.headers.get("www-authenticate") ?? "", /Bearer/);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(ctx.calls.length, 0);
  });

  it("rejects revoked keys and non-farm bearer tokens on every request", async () => {
    const revoked = await rpc(handler, callTool("farm_search"), { authorization: `Bearer ${REVOKED_KEY}` });
    assert.equal(revoked.response.status, 401);
    const jwt = await rpc(handler, callTool("farm_search"), { authorization: "Bearer eyJ.some.jwt" });
    assert.equal(jwt.response.status, 401);
    assert.equal(ctx.calls.length, 0);
  });

  it("accepts a seller key (Bearer or X-Api-Key) for writes and passes auth to deps", async () => {
    const args = { kind: "agent", name: "Smoke", title: "t", description: "d", category: "Experimental", priceCents: 0, pack: { format: "mybot.farm/agent-pack" } };
    const viaBearer = await rpc(handler, callTool("farm_post", args), { authorization: `Bearer ${GOOD_KEY}` });
    assert.equal(viaBearer.response.status, 200);
    assert.equal(toolPayload(viaBearer.json).isError, false);
    const call = ctx.calls.find((c) => c.method === "postListing")!;
    const callCtx = call.args[1] as CallContext;
    assert.equal(callCtx.auth?.extra.userId, "user-1");
    assert.equal(callCtx.caller, "user:user-1");
    assert.equal(callCtx.auth?.token.includes(GOOD_KEY), false, "raw key never stored in authInfo");

    const viaHeader = await rpc(handler, callTool("farm_update", { ...args, slug: "smoke" }), { "x-api-key": GOOD_KEY });
    assert.equal(viaHeader.response.status, 200);
    assert.equal(ctx.logs.at(-1)?.authType, "api_key");
    for (const entry of ctx.logs) {
      assert.equal(formatLogLine(entry).includes(GOOD_KEY), false);
    }
  });

  it("counts a successful pack download once and not for metadata tools", async () => {
    await rpc(handler, callTool("farm_get_stall", { slug: "gift-day" }));
    assert.equal(ctx.counted.length, 0);
    await rpc(handler, callTool("farm_get_pack", { slug: "gift-day" }));
    await rpc(handler, callTool("farm_plant", { slug: "gift-day" }));
    assert.deepEqual(ctx.counted, [
      { slug: "gift-day", caller: "ip:203.0.113.7" },
      { slug: "gift-day", caller: "ip:203.0.113.7" },
    ]);
    assert.equal(ctx.logs.find((entry) => entry.tool === "farm_get_pack")?.counted, true);
  });

  it("does not count a paid pack that returns purchase_required", async () => {
    const paid = makeDeps({
      async getPack() {
        return { ok: false, status: 402, error: "purchase_required", data: { priceCents: 500 } };
      },
    });
    const h = makeHandler(paid.deps);
    const { response, json } = await rpc(h, callTool("farm_get_pack", { slug: "paid-bot" }));
    assert.equal(response.status, 200);
    const payload = toolPayload(json);
    assert.equal(payload.isError, true);
    assert.equal(payload.data.error, "purchase_required");
    assert.equal(payload.data.status, 402);
    assert.equal(paid.counted.length, 0);
    assert.equal(paid.logs[0]?.outcome, "payment_required");
  });

  it("reports dedup (counted=false) without failing the tool", async () => {
    const deduped = makeDeps({ countDownload: async () => false });
    const { json } = await rpc(makeHandler(deduped.deps), callTool("farm_get_pack", { slug: "gift-day" }));
    assert.equal(toolPayload(json).isError, false);
    assert.equal(deduped.logs[0]?.counted, false);
  });

  it("returns rate_limited without calling the data layer", async () => {
    const limited = makeDeps({ rateLimit: async () => ({ limited: true, retryAfter: 42 }) });
    const { json } = await rpc(makeHandler(limited.deps), callTool("farm_search"));
    const payload = toolPayload(json);
    assert.equal(payload.isError, true);
    assert.equal(payload.data.error, "rate_limited");
    assert.equal(payload.data.retryAfter, 42);
    assert.equal(limited.calls.length, 0);
  });

  it("answers OPTIONS preflight with MCP headers and GET with 405", async () => {
    const preflight = await handler(new Request("http://localhost/mcp", { method: "OPTIONS" }));
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get("access-control-allow-headers") ?? "", /MCP-Protocol-Version/);
    assert.equal(mcpCorsHeaders["Access-Control-Allow-Origin"], "*");
    const get = await handler(
      new Request("http://localhost/mcp", { method: "GET", headers: { accept: "text/event-stream" } }),
    );
    assert.equal(get.status, 405);
  });
});

describe("mcp ops helpers", () => {
  it("hashes callers without exposing the raw IP", () => {
    const identity = callerIdentity(new Headers({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" }));
    assert.equal(identity, "ip:198.51.100.4");
    assert.equal(callerIdentity(new Headers(), "u1"), "user:u1");
    const hash = hashCaller(identity, "salt");
    assert.equal(hash, hashCaller(identity, "salt"));
    assert.notEqual(hash, hashCaller(identity, "other"));
    assert.equal(hash.includes("198.51.100.4"), false);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it("backstop limiter blocks after the per-window max", () => {
    const check = createBackstopLimiter({
      read: { max: 2, windowMs: 1000 },
      pack: { max: 1, windowMs: 1000 },
      write: { max: 1, windowMs: 1000 },
    });
    assert.equal(check("read", "ip:a", 0).limited, false);
    assert.equal(check("read", "ip:a", 10).limited, false);
    const third = check("read", "ip:a", 20);
    assert.equal(third.limited, true);
    assert.equal(check("read", "ip:b", 20).limited, false);
    assert.equal(check("read", "ip:a", 1500).limited, false);
  });

  it("redacts anything key-shaped in log lines", () => {
    const line = formatLogLine({
      event: "mcp_tool_call",
      requestId: "r",
      tool: "farm_post",
      authType: "api_key",
      outcome: "error",
      errorCode: `bad ${GOOD_KEY}`,
      durationMs: 1,
    });
    assert.equal(line.includes(GOOD_KEY), false);
    assert.match(line, /mbf_\[redacted\]/);
  });
});

describe("/.well-known/mcp.json server.json", () => {
  it("matches the registry schema basics", () => {
    assert.equal(mcpServerJson.$schema, "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json");
    assert.match(mcpServerJson.name, /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
    assert.ok(mcpServerJson.description.length <= 100);
    assert.match(mcpServerJson.version, /^\d+\.\d+\.\d+$/);
    assert.equal(mcpServerJson.remotes[0].type, "streamable-http");
    assert.equal(mcpServerJson.remotes[0].url, "https://mybot.farm/mcp");
    assert.equal(mcpServerJson.remotes[0].headers[0].isRequired, false);
  });
});
