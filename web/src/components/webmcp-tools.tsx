"use client";

import { useEffect } from "react";
import { categories } from "@/lib/site";
import { packTools } from "@/lib/webmcp-catalog";

type ToolName = (typeof packTools)[number]["name"];

const CATEGORY_LABELS = categories.map((category) => category.label);

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

async function fetchJson(path: string, init?: RequestInit) {
  const response = await fetch(path, init);

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

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function postListingBody(args: Record<string, unknown>) {
  const priceValue = args.priceCents;
  const priceCents =
    typeof priceValue === "number"
      ? priceValue
      : typeof priceValue === "string" && priceValue.trim()
        ? Number(priceValue)
        : priceValue;

  return {
    kind: args.kind,
    name: args.name,
    title: args.title,
    description: args.description,
    category: args.category,
    priceCents,
    pack: args.pack,
    slug: args.slug,
    packVersion: args.packVersion,
  };
}

function inputSchemaFor(name: ToolName) {
  if (name === "search_stalls") {
    return {
      type: "object",
      properties: {
        q: {
          type: "string",
          description: "Optional search text",
        },
        kind: {
          type: "string",
          enum: ["agent", "team"],
          description: "Optional bot kind filter",
        },
      },
      required: [] as string[],
    };
  }

  if (name === "post_listing") {
    return {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["agent", "team"],
          description: 'Listing kind: "agent" or "team"',
        },
        name: {
          type: "string",
          description: "Non-empty display name",
        },
        title: {
          type: "string",
          description: "Non-empty title",
        },
        description: {
          type: "string",
          description: "Non-empty description",
        },
        category: {
          type: "string",
          enum: CATEGORY_LABELS,
          description: "Exact category label from the farm taxonomy",
        },
        priceCents: {
          type: "integer",
          description:
            "0 for a free listing, or integer cents from 200 to 999900 ($2–$9999)",
        },
        pack: {
          type: "object",
          description: "GAF JSON object (max ~500KB encoded)",
        },
        apiKey: {
          type: "string",
          description:
            "Seller API key (mbf_…). Sent as Authorization Bearer. Required for unattended/agent posts; omit when the seller is signed in in this browser.",
        },
        slug: {
          type: "string",
          description:
            "Existing stall slug to update in place. If omitted, derived from name.",
        },
        packVersion: {
          type: "integer",
          description:
            "Optional content revision. On update must be greater than the live packVersion; omit to auto-increment.",
        },
      },
      required: [
        "kind",
        "name",
        "title",
        "description",
        "category",
        "priceCents",
        "pack",
      ],
    };
  }

  return {
    type: "object",
    properties: {
      slug: {
        type: "string",
        description:
          "Bot slug such as gift-day, sprout-journal, patch, probe, grant-research, scout, finders, pitch, pair-bench, workbench, or road-crew",
      },
      ...(name === "get_install_prompt"
        ? {
            short: {
              type: "boolean",
              description: "If true, return the short prompt variant",
            },
          }
        : {}),
    },
    required: ["slug"],
  };
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
        return fetchJson(query ? `/api/stalls?${query}` : "/api/stalls");
      },
      get_stall: (args) => {
        const slug = slugFromArgs(args);
        if (!slug) {
          return Promise.resolve(toolResult({ error: "slug_required" }));
        }
        return fetchJson(`/api/stalls/${encodeURIComponent(slug)}`);
      },
      download_pack: (args) => {
        const slug = slugFromArgs(args);
        if (!slug) {
          return Promise.resolve(toolResult({ error: "slug_required" }));
        }
        return fetchJson(`/api/packs/${encodeURIComponent(slug)}`);
      },
      list_pack_skills: (args) => {
        const slug = slugFromArgs(args);
        if (!slug) {
          return Promise.resolve(toolResult({ error: "slug_required" }));
        }
        return fetchJson(`/api/packs/${encodeURIComponent(slug)}/skills`);
      },
      get_install_prompt: (args) => {
        const slug = slugFromArgs(args);
        if (!slug) {
          return Promise.resolve(toolResult({ error: "slug_required" }));
        }
        const path = `/api/install-prompt/${encodeURIComponent(slug)}`;
        return fetchJson(args.short === true ? `${path}?short=1` : path);
      },
      post_listing: (args) => {
        const apiKey = readString(args.apiKey);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (apiKey) {
          headers.Authorization = `Bearer ${apiKey}`;
        }

        return fetchJson("/api/listings", {
          method: "POST",
          headers,
          credentials: apiKey ? "omit" : "include",
          body: JSON.stringify(postListingBody(args)),
        });
      },
    };

    for (const catalogTool of packTools) {
      const writable = catalogTool.name === "post_listing";
      void Promise.resolve(
        context.registerTool(
          {
            name: catalogTool.name,
            title: catalogTool.title,
            description: catalogTool.description,
            annotations: {
              readOnlyHint: !writable,
              destructiveHint: false,
              openWorldHint: false,
            },
            inputSchema: inputSchemaFor(catalogTool.name),
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
