/**
 * OpenClaw plugin: mybot-farm
 * Tools: farm_search, farm_get_pack, farm_plant
 *
 * Uses defineToolPlugin (OpenClaw 2026.9 tool-plugin SDK; wraps definePluginEntry).
 */

import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import {
  getPack,
  packSummary,
  resolveFarmConfig,
  searchStalls,
  stallSummary,
} from "./src/farm-api.mjs";
import { plantPack } from "./src/plant.mjs";

function textResult(text: string, details: unknown) {
  return {
    content: [{ type: "text" as const, text }],
    details,
  };
}

export default defineToolPlugin({
  id: "mybot-farm",
  name: "mybot.farm",
  description: "Search mybot.farm stalls and plant GAF agent packs into OpenClaw.",
  configSchema: Type.Object(
    {
      baseUrl: Type.Optional(
        Type.String({
          default: "https://mybot.farm",
          description: "mybot.farm API origin (env MYBOT_FARM_URL overrides).",
        }),
      ),
      workspaceRoot: Type.Optional(
        Type.String({
          default: "~/.openclaw/farm",
          description: "Default parent dir for planted workspaces.",
        }),
      ),
    },
    { additionalProperties: false },
  ),
  tools: (tool) => [
    tool({
      name: "farm_search",
      label: "Farm Search",
      description:
        "Search mybot.farm agent stalls by query. Returns slug, name, title, pageUrl, packUrl.",
      parameters: Type.Object({
        query: Type.String({ description: "Search query (e.g. frontend, music, legal)." }),
        limit: Type.Optional(Type.Number({ description: "Max stalls to return (optional)." })),
      }),
      async execute(params, config) {
        const farm = resolveFarmConfig(config as Record<string, unknown>);
        const query = String(params.query ?? "").trim();
        if (!query) throw new Error("query required");
        const limit =
          typeof params.limit === "number" && Number.isFinite(params.limit) ? params.limit : undefined;
        const { stalls, count } = await searchStalls(farm.baseUrl, query, limit);
        const list = stalls.map(stallSummary);
        const lines = [
          `mybot.farm search "${query}" — ${list.length} of ${count} stall(s)`,
          "",
          ...list.map(
            (s: { name: string; slug: string; title: string; pageUrl: string }, i: number) =>
              `${i + 1}. ${s.name} (\`${s.slug}\`)\n   ${s.title}\n   ${s.pageUrl}`,
          ),
        ];
        return textResult(lines.join("\n"), { query, count, stalls: list, baseUrl: farm.baseUrl });
      },
    }),
    tool({
      name: "farm_get_pack",
      label: "Farm Get Pack",
      description:
        "Download a mybot.farm GAF agent pack by slug and return profile, skill names, attribution.",
      parameters: Type.Object({
        slug: Type.String({ description: "Pack / stall slug (e.g. frontend-developer)." }),
      }),
      async execute(params, config) {
        const farm = resolveFarmConfig(config as Record<string, unknown>);
        const slug = String(params.slug ?? "").trim();
        if (!slug) throw new Error("slug required");
        const pack = await getPack(farm.baseUrl, slug);
        const summary = packSummary(pack);
        const skillBodies = (pack.skills ?? []).map((s: { name: string; description?: string; content?: string }) => ({
          name: s.name,
          description: s.description ?? "",
          contentPreview: (s.content ?? "").slice(0, 280),
          contentLength: (s.content ?? "").length,
        }));
        const lines = [
          `Pack: ${summary.profile?.name ?? summary.slug} (\`${summary.slug}\`)`,
          `Title: ${summary.profile?.title ?? ""}`,
          `Skills (${summary.skillCount}): ${summary.skillNames.join(", ") || "(none)"}`,
          `Attribution: ${summary.attribution || "(none)"}`,
          `Source: ${summary.homepage}`,
        ];
        return textResult(lines.join("\n"), {
          summary,
          skillBodies,
          memory: pack.memory ?? [],
          manifest: pack.manifest ?? {},
          profile: pack.profile ?? {},
        });
      },
    }),
    tool({
      name: "farm_plant",
      label: "Farm Plant",
      description:
        "Fetch a mybot.farm GAF pack and plant it into OpenClaw (agents add + IDENTITY/SOUL/MEMORY/skills).",
      parameters: Type.Object({
        slug: Type.String({ description: "Pack slug to plant (e.g. frontend-developer)." }),
        agentId: Type.Optional(
          Type.String({ description: "Override agent id (default: slugified pack.slug)." }),
        ),
        workspace: Type.Optional(
          Type.String({
            description: "Override workspace path (default: ~/.openclaw/farm/<agentId>).",
          }),
        ),
        force: Type.Optional(
          Type.Boolean({
            description: "Overwrite workspace files if agent already exists (default false).",
          }),
        ),
      }),
      async execute(params, config) {
        const farm = resolveFarmConfig(config as Record<string, unknown>);
        const slug = String(params.slug ?? "").trim();
        if (!slug) throw new Error("slug required");
        const result = await plantPack({
          slug,
          agentId: typeof params.agentId === "string" ? params.agentId : undefined,
          workspace: typeof params.workspace === "string" ? params.workspace : undefined,
          force: Boolean(params.force),
          config: farm,
        });
        const lines = [
          `Planted \`${result.packSlug}\` as agent \`${result.agentId}\``,
          `Workspace: ${result.workspace}`,
          `Skills: ${result.skillsInstalled.join(", ") || "(none)"}`,
          result.attribution ? `Attribution: ${result.attribution}` : "",
        ].filter(Boolean);
        return textResult(lines.join("\n"), result);
      },
    }),
  ],
});
