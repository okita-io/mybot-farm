/**
 * OpenClaw plugin: mybot-farm
 * Tools: farm_search, farm_get_pack, farm_plant, farm_post, farm_update
 *
 * Uses defineToolPlugin (OpenClaw 2026.9 tool-plugin SDK; wraps definePluginEntry).
 */

import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import {
  FarmError,
  getPack,
  packSummary,
  resolveFarmConfig,
  searchStalls,
  stallSummary,
} from "./src/farm-api.mjs";
import { plantPack } from "./src/plant.mjs";
import { postListing, updateListing } from "./src/post.mjs";

function textResult(text: string, details: unknown) {
  return {
    content: [{ type: "text" as const, text }],
    details,
  };
}

export default defineToolPlugin({
  id: "mybot-farm",
  name: "mybot.farm",
  description: "Search mybot.farm stalls, plant GAF packs into OpenClaw, and post listings.",
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
      apiKey: Type.Optional(
        Type.String({
          description:
            "Seller API key from https://mybot.farm/sell (prefer env MYBOT_FARM_API_KEY). Never commit the key.",
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
    tool({
      name: "farm_post",
      label: "Farm Post",
      description:
        "Publish a listing to mybot.farm (POST /api/listings) with a seller API key. " +
        "If you already own that slug, this updates the same stall (same URL) and bumps packVersion. " +
        "Omit packVersion to auto-increment; history appears on the stall and GET /api/stalls/{slug}/revisions. " +
        "Auth: env MYBOT_FARM_API_KEY, else plugin config apiKey (never a tool argument). " +
        "Create a key at https://mybot.farm/sell. Pack must be GAF JSON (object or packPath " +
        "to a .json file). OpenClaw already plants GAF; posting publishes GAF (no tarball translator). " +
        'kind "team" requires format mybot.farm/team-pack and members[] (at least two): each member ' +
        "needs role, summary, and pack (catalog path, slug, tarball URL, or nested agent-pack). " +
        'kind "agent" uses mybot.farm/agent-pack and cannot include members[]. ' +
        "category is an exact farm label (Lifestyle, Coding, Experimental, …). " +
        "priceCents is 0 (free) or 200–999900. Paid listings need Stripe Connect on the seller " +
        "(403 connect_required). Prefer dryRun to validate without posting. Does not email or spend money. " +
        "Catalog/agency slugs cannot be overwritten.",
      parameters: Type.Object({
        kind: Type.String({
          description:
            'Listing kind: "agent" or "team". Teams land on /teams/{slug} and need a team-pack with members[].',
        }),
        name: Type.String({ description: "Listing name. Used to derive the slug on first publish." }),
        title: Type.String({ description: "Short stall title shown on the farm." }),
        description: Type.String({ description: "Stall description (non-empty)." }),
        category: Type.String({
          description:
            "Exact farm category label: Lifestyle, Productivity, Coding, Writing, " +
            "Marketing, Sales, Research, Personal finance, Creative, Music, " +
            "Education, Ops / admin, Experimental.",
        }),
        priceCents: Type.Number({
          description: "0 for free, or integer cents in [200, 999900] ($2.00–$9,999.00).",
        }),
        pack: Type.Optional(
          Type.Unknown({
            description:
              "GAF JSON object. Agents: mybot.farm/agent-pack. Teams: mybot.farm/team-pack with members[] (role, summary, pack). OpenClaw plants GAF; this posts GAF.",
          }),
        ),
        packPath: Type.Optional(
          Type.String({
            description: "Path to a .json GAF file. Use pack or packPath, not both.",
          }),
        ),
        dryRun: Type.Optional(
          Type.Boolean({
            description: "Validate and show a payload summary without POSTing. Redacts any key.",
          }),
        ),
        slug: Type.Optional(
          Type.String({
            description:
              "Existing stall slug to update in place. If omitted, derived from name. Same seller + same slug replaces GAF (skills, soul/memory) and bumps packVersion.",
          }),
        ),
        packVersion: Type.Optional(
          Type.Number({
            description:
              "Optional content revision. On update must be greater than the live packVersion; omit to auto-increment. Distinct from GAF format version.",
          }),
        ),
      }),
      async execute(params, config) {
        const result = await postListing({
          args: params as Record<string, unknown>,
          pluginConfig: config as Record<string, unknown>,
        });
        if (!result.ok) {
          throw new FarmError(result.error, result.status);
        }
        return textResult(result.text, result);
      },
    }),
    tool({
      name: "farm_update",
      label: "Farm Update",
      description:
        "Update a seller-owned stall in place (same slug). Same fields as farm_post plus required slug. " +
        "Replaces GAF pack JSON (skills, soul/memory) and bumps packVersion (omit packVersion to auto-increment). " +
        "The farm publishes the pack to the catalog repo. Catalog slugs are reserved.",
      parameters: Type.Object({
        kind: Type.String({
          description:
            'Listing kind: "agent" or "team". Teams land on /teams/{slug} and need a team-pack with members[].',
        }),
        name: Type.String({ description: "Listing name." }),
        title: Type.String({ description: "Short stall title shown on the farm." }),
        description: Type.String({ description: "Stall description (non-empty)." }),
        category: Type.String({
          description:
            "Exact farm category label: Lifestyle, Productivity, Coding, Writing, " +
            "Marketing, Sales, Research, Personal finance, Creative, Music, " +
            "Education, Ops / admin, Experimental.",
        }),
        priceCents: Type.Number({
          description: "0 for free, or integer cents in [200, 999900] ($2.00–$9,999.00).",
        }),
        slug: Type.String({ description: "Existing stall slug to update." }),
        pack: Type.Optional(
          Type.Unknown({
            description:
              "GAF JSON object. Agents: mybot.farm/agent-pack. Teams: mybot.farm/team-pack with members[] (role, summary, pack). OpenClaw plants GAF; this posts GAF.",
          }),
        ),
        packPath: Type.Optional(
          Type.String({
            description: "Path to a .json GAF file. Use pack or packPath, not both.",
          }),
        ),
        packVersion: Type.Optional(
          Type.Number({
            description: "Optional content revision; omit to auto-increment.",
          }),
        ),
        dryRun: Type.Optional(
          Type.Boolean({
            description: "Validate without POSTing. Redacts any key.",
          }),
        ),
      }),
      async execute(params, config) {
        const result = await updateListing({
          args: params as Record<string, unknown>,
          pluginConfig: config as Record<string, unknown>,
        });
        if (!result.ok) {
          throw new FarmError(result.error, result.status);
        }
        return textResult(result.text, result);
      },
    }),
  ],
});
