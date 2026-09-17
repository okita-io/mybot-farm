import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  catalogPackPath,
  getCatalogFileSha,
  putCatalogPack,
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

  it("returns undefined sha for a missing file", async () => {
    process.env.CATALOG_GITHUB_TOKEN = "test-token";
    globalThis.fetch = (async () => new Response("Not Found", { status: 404 })) as typeof fetch;
    assert.equal(await getCatalogFileSha("agents/missing.json"), undefined);
  });
});
