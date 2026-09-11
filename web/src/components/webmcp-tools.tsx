"use client";

import { useEffect } from "react";
import { packTools } from "@/lib/webmcp-catalog";

type ToolName = (typeof packTools)[number]["name"];

function getModelContext() {
  if (typeof document !== "undefined" && document.modelContext) {
    return document.modelContext;
  }

  if (typeof navigator !== "undefined" && navigator.modelContext) {
    return navigator.modelContext;
  }

  return undefined;
}

function toolResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

async function fetchTool(path: string) {
  const response = await fetch(path);

  try {
    const data: unknown = await response.json();
    return toolResult(data);
  } catch {
    return toolResult({
      error: "invalid_json",
      status: response.status,
      path,
    });
  }
}

function slugFromArgs(args: Record<string, unknown>): string | undefined {
  const slug = args.slug;
  return typeof slug === "string" && slug.trim() ? slug.trim() : undefined;
}

export function WebmcpTools() {
  useEffect(() => {
    const context = getModelContext();

    if (!context) {
      return;
    }

    const controller = new AbortController();

    const tools: Record<
      ToolName,
      (args: Record<string, unknown>) => Promise<ReturnType<typeof toolResult>>
    > = {
      search_stalls: (args) => {
        const params = new URLSearchParams();
        if (typeof args.q === "string" && args.q.trim()) {
          params.set("q", args.q.trim());
        }
        if (args.kind === "agent" || args.kind === "team") {
          params.set("kind", args.kind);
        }
        const query = params.toString();
        return fetchTool(query ? `/api/stalls?${query}` : "/api/stalls");
      },
      get_stall: (args) => {
        const slug = slugFromArgs(args);
        if (!slug) {
          return Promise.resolve(toolResult({ error: "slug_required" }));
        }
        return fetchTool(`/api/stalls/${encodeURIComponent(slug)}`);
      },
      download_pack: (args) => {
        const slug = slugFromArgs(args);
        if (!slug) {
          return Promise.resolve(toolResult({ error: "slug_required" }));
        }
        return fetchTool(`/api/packs/${encodeURIComponent(slug)}`);
      },
      list_pack_skills: (args) => {
        const slug = slugFromArgs(args);
        if (!slug) {
          return Promise.resolve(toolResult({ error: "slug_required" }));
        }
        return fetchTool(`/api/packs/${encodeURIComponent(slug)}/skills`);
      },
      get_install_prompt: (args) => {
        const slug = slugFromArgs(args);
        if (!slug) {
          return Promise.resolve(toolResult({ error: "slug_required" }));
        }
        const path = `/api/install-prompt/${encodeURIComponent(slug)}`;
        return fetchTool(args.short === true ? `${path}?short=1` : path);
      },
    };

    for (const catalogTool of packTools) {
      void Promise.resolve(
        context.registerTool(
          {
            name: catalogTool.name,
            title: catalogTool.title,
            description: catalogTool.description,
            annotations: {
              readOnlyHint: true,
              destructiveHint: false,
              openWorldHint: false,
            },
            inputSchema: {
              type: "object",
              properties: {
                ...(catalogTool.name === "search_stalls"
                  ? {
                      q: {
                        type: "string",
                        description: "Optional search text",
                      },
                      kind: {
                        type: "string",
                        enum: ["agent", "team"],
                        description: "Optional stall kind filter",
                      },
                    }
                  : {
                      slug: {
                        type: "string",
                        description:
                          "Stall slug such as gift-day, sprout-journal, patch, probe, grant-research, or pair-bench",
                      },
                    }),
                ...(catalogTool.name === "get_install_prompt"
                  ? {
                      short: {
                        type: "boolean",
                        description: "If true, return the short prompt variant",
                      },
                    }
                  : {}),
              },
              required:
                catalogTool.name === "search_stalls" ? [] : ["slug"],
            },
            execute: tools[catalogTool.name],
          },
          { signal: controller.signal },
        ),
      ).catch(() => {
        // Already registered, or the browser rejected an unsupported shape.
      });
    }

    return () => controller.abort();
  }, []);

  return null;
}
