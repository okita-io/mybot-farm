import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  catalogPackPath,
  getCatalogFileSha,
  putCatalogPack,
  revertCatalogPack,
} from "./catalog-github.ts";

const originalFetch = globalThis.fetch;
const originalToken = process.env.CATALOG_GITHUB_TOKEN;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) {
    delete process.env.CATALOG_GITHUB_TOKEN;
  } else {
    process.env.CATALOG_GITHUB_TOKEN = originalToken;
  }
});

describe("catalog github", () => {
  it("builds agent and team pack paths", () => {
    assert.equal(catalogPackPath("agent", "smoke-bot"), "agents/smoke-bot.json");
    assert.equal(catalogPackPath("team", "road-crew"), "teams/road-crew.json");
  });

  it("creates a file when GitHub has no existing blob", async () => {
    process.env.CATALOG_GITHUB_TOKEN = "test-token";
    const calls: { url: string; method?: string; body?: string }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({
        url,
        method: init?.method,
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      if (url.includes("/contents/") && (!init?.method || init.method === "GET")) {
        return new Response("Not Found", { status: 404 });
      }
      return Response.json({
        content: { sha: "content-sha" },
        commit: { sha: "commit-sha" },
      });
    }) as typeof fetch;

    const result = await putCatalogPack({
      kind: "agent",
      slug: "smoke-bot",
      pack: { format: "mybot.farm/agent-pack", packVersion: 1 },
      message: "v1: Published",
    });

    assert.equal(result.commitSha, "commit-sha");
    assert.equal(result.path, "agents/smoke-bot.json");
    assert.equal(calls[0]?.url.includes("ref=main"), true);
    assert.equal(JSON.parse(calls[1]?.body ?? "{}").sha, undefined);
    assert.equal(JSON.parse(calls[1]?.body ?? "{}").branch, "main");
  });

  it("deletes a new file when reverting a create", async () => {
    process.env.CATALOG_GITHUB_TOKEN = "test-token";
    const calls: { method?: string; body?: string }[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({
        method: init?.method,
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      if (!init?.method || init.method === "GET") {
        return Response.json({ sha: "blob-sha" });
      }
      return Response.json({ commit: { sha: "revert-commit" } });
    }) as typeof fetch;

    const result = await revertCatalogPack({
      kind: "agent",
      slug: "smoke-bot",
      previousPack: null,
    });

    assert.equal(result.commitSha, "revert-commit");
    assert.equal(calls.some((call) => call.method === "DELETE"), true);
  });

  it("restores the previous pack when reverting an update", async () => {
    process.env.CATALOG_GITHUB_TOKEN = "test-token";
    let putBody: string | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method || init.method === "GET") {
        return Response.json({ sha: "blob-sha" });
      }
      putBody = typeof init?.body === "string" ? init.body : undefined;
      return Response.json({ commit: { sha: "restore-commit" } });
    }) as typeof fetch;

    const previous = { format: "mybot.farm/agent-pack", packVersion: 1 };
    const result = await revertCatalogPack({
      kind: "agent",
      slug: "smoke-bot",
      previousPack: previous,
    });

    assert.equal(result.commitSha, "restore-commit");
    const parsed = JSON.parse(putBody ?? "{}");
    assert.equal(parsed.sha, "blob-sha");
    const restored = JSON.parse(
      Buffer.from(parsed.content, "base64").toString("utf8"),
    );
    assert.equal(restored.packVersion, 1);
  });
});
