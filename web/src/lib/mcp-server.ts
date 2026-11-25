import { AsyncLocalStorage } from "node:async_hooks";
import type { McpServer } from "@modelcontextprotocol/server";
import { isFarmAuthInfo, type FarmAuthInfo } from "./mcp-auth-core.ts";
import {
  callerIdentity,
  logToolCall,
  type McpLogEntry,
  type RateDecision,
} from "./mcp-ops.ts";
import {
  farmTools,
  MCP_DOCS_URL,
  toolAnnotations,
  type FarmToolName,
  type ToolClass,
} from "./mcp-tool-defs.ts";

/**
 * Registers the farm_* tools on an McpServer. Data access is injected
 * (FarmMcpDeps) so the same code runs against real catalog/DB functions in the
 * route and against fixtures in tests.
 */

export type ToolOutcome =
  | { ok: true; data: unknown; countable?: boolean }
  | { ok: false; status: number; error: string; data?: Record<string, unknown> };

export type CallContext = {
  request: Request;
  auth: FarmAuthInfo | null;
  /** user:<id> or ip:<addr>, used for rate limits and download dedup. */
  caller: string;
};

export type SearchArgs = {
  q?: string;
  kind?: "agent" | "team" | "world";
  sort?: "newest" | "name" | "price";
  limit?: number;
};

export type ListingArgs = Record<string, unknown> & { slug?: string };

export interface FarmMcpDeps {
  search(args: SearchArgs): Promise<ToolOutcome>;
  getStall(slug: string): Promise<ToolOutcome>;
  getPack(slug: string, ctx: CallContext): Promise<ToolOutcome>;
  listSkills(slug: string, ctx: CallContext): Promise<ToolOutcome>;
  getInstallPrompt(slug: string, short: boolean, ctx: CallContext): Promise<ToolOutcome>;
  getGrokTemplate(slug: string, ctx: CallContext): Promise<ToolOutcome>;
  listRevisions(slug: string): Promise<ToolOutcome>;
  plant(slug: string, ctx: CallContext): Promise<ToolOutcome>;
  postListing(args: ListingArgs, ctx: CallContext): Promise<ToolOutcome>;
  /** Returns true when a download was counted (false when deduped or unavailable). */
  countDownload(slug: string, caller: string): Promise<boolean>;
  rateLimit(toolClass: ToolClass, subject: string, request: Request): Promise<RateDecision>;
  log?(entry: McpLogEntry): void;
}

/** Carries the inbound HTTP request to tool handlers (the SDK context does not expose it). */
export const mcpRequestStore = new AsyncLocalStorage<Request>();

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function textResult(data: unknown, isError = false): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
    ...(isError ? { isError: true } : {}),
  };
}

function outcomeLabel(outcome: ToolOutcome): McpLogEntry["outcome"] {
  if (outcome.ok) return "ok";
  if (outcome.status === 401) return "unauthorized";
  if (outcome.status === 402) return "payment_required";
  if (outcome.status === 404) return "not_found";
  if (outcome.status === 429) return "rate_limited";
  return "error";
}

function newRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type Ctx = { http?: { authInfo?: unknown } } | undefined;

function resolveAuth(ctx: Ctx, request: Request): FarmAuthInfo | null {
  const fromCtx = ctx?.http?.authInfo;
  if (isFarmAuthInfo(fromCtx)) return fromCtx;
  const fromReq = (request as Request & { auth?: unknown }).auth;
  return isFarmAuthInfo(fromReq) ? fromReq : null;
}

export function registerFarmTools(server: McpServer, deps: FarmMcpDeps) {
  const log = deps.log ?? logToolCall;

  const run = async (
    name: FarmToolName,
    toolClass: ToolClass,
    args: Record<string, unknown>,
    ctx: Ctx,
    exec: (call: CallContext) => Promise<ToolOutcome>,
  ): Promise<ToolResult> => {
    const started = Date.now();
    const request = mcpRequestStore.getStore() ?? new Request("http://localhost/mcp");
    const auth = resolveAuth(ctx, request);
    const caller = callerIdentity(request.headers, auth?.extra.userId);
    const slug = typeof args.slug === "string" ? args.slug : undefined;
    const entryBase = {
      event: "mcp_tool_call" as const,
      requestId: newRequestId(),
      tool: name,
      authType: auth ? ("api_key" as const) : ("anon" as const),
      ...(auth ? { userId: auth.extra.userId } : {}),
      ...(slug ? { slug } : {}),
      ...(typeof args.kind === "string" ? { kind: args.kind } : {}),
      protocolVersion: request.headers.get("mcp-protocol-version") ?? undefined,
    };

    let outcome: ToolOutcome;
    let counted: boolean | undefined;

    try {
      if (toolClass === "write" && !auth) {
        // Normally the HTTP wrapper already answered 401; this is defense in depth.
        outcome = {
          ok: false,
          status: 401,
          error: "unauthorized",
          data: {
            message:
              "Publishing needs a seller API key: Authorization: Bearer mbf_… or X-Api-Key: mbf_… (create one at https://mybot.farm/sell).",
            docs: MCP_DOCS_URL,
          },
        };
      } else {
        const decision = await deps.rateLimit(toolClass, caller, request);
        if (decision.limited) {
          outcome = {
            ok: false,
            status: 429,
            error: "rate_limited",
            data: { retryAfter: decision.retryAfter, message: "Too many requests. Retry later." },
          };
        } else {
          outcome = await exec({ request, auth, caller });
          if (outcome.ok && outcome.countable && slug) {
            counted = await deps.countDownload(slug, caller).catch((error: unknown) => {
              console.error("mcp countDownload failed:", error);
              return false;
            });
          }
        }
      }
    } catch (error) {
      console.error(`mcp tool ${name} failed:`, error);
      outcome = { ok: false, status: 500, error: "internal_error" };
    }

    log({
      ...entryBase,
      outcome: outcomeLabel(outcome),
      ...(outcome.ok ? {} : { status: outcome.status, errorCode: outcome.error }),
      durationMs: Date.now() - started,
      ...(counted !== undefined ? { counted } : {}),
    });

    if (outcome.ok) {
      return textResult(outcome.data);
    }
    return textResult({ error: outcome.error, status: outcome.status, ...(outcome.data ?? {}) }, true);
  };

  const handlers: Record<FarmToolName, (args: Record<string, unknown>, call: CallContext) => Promise<ToolOutcome>> = {
    farm_search: (args) =>
      deps.search({
        q: (args.q as string | undefined) ?? (args.query as string | undefined),
        kind: args.kind as SearchArgs["kind"],
        sort: args.sort as SearchArgs["sort"],
        limit: args.limit as number | undefined,
      }),
    farm_list_teams: (args) =>
      deps.search({
        q: args.q as string | undefined,
        kind: "team",
        sort: args.sort as SearchArgs["sort"],
        limit: args.limit as number | undefined,
      }),
    farm_get_stall: (args) => deps.getStall(args.slug as string),
    farm_get_pack: (args, call) => deps.getPack(args.slug as string, call),
    farm_list_skills: (args, call) => deps.listSkills(args.slug as string, call),
    farm_get_install_prompt: (args, call) =>
      deps.getInstallPrompt(args.slug as string, args.short === true, call),
    farm_get_grok_template: (args, call) => deps.getGrokTemplate(args.slug as string, call),
    farm_list_revisions: (args) => deps.listRevisions(args.slug as string),
    farm_plant: (args, call) => deps.plant(args.slug as string, call),
    farm_post: (args, call) => deps.postListing(args, call),
    farm_update: (args, call) => deps.postListing(args, call),
  };

  for (const tool of farmTools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { title: tool.title, ...toolAnnotations(tool.toolClass) },
      },
      // Typed loosely here: args are already validated by the tool's Zod inputSchema.
      (async (args: Record<string, unknown>, ctx: Ctx) =>
        run(tool.name, tool.toolClass, args ?? {}, ctx, (call) => handlers[tool.name](args ?? {}, call))) as never,
    );
  }
}
