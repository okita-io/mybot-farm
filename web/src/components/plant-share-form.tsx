"use client";

import Link from "next/link";
import { useState } from "react";
import { CopyInstallPrompt } from "@/components/copy-install-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type ResolveShareFailure,
  type ResolveShareResult,
  type ResolveShareSuccess,
} from "@/lib/resolve-share";
import { stallToneClasses } from "@/lib/packs";
import { cn } from "@/lib/utils";

type PlantState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "preview"; result: ResolveShareSuccess }
  | { status: "error"; result: ResolveShareFailure | { message: string } }
  | { status: "planted-blocked"; result: ResolveShareSuccess; message: string };

function errorText(result: ResolveShareFailure | { message: string }): string {
  if ("message" in result && result.message) {
    return result.message;
  }

  if (!("error" in result)) {
    return "Could not resolve that link.";
  }

  switch (result.error) {
    case "url_required":
      return "Paste a mybot.farm stall, pack, or API URL.";
    case "url_too_long":
      return "That URL is too long (max 2048 characters).";
    case "invalid_url":
      return "That does not look like a URL or stall slug.";
    case "host_not_allowed":
      return "v1 only resolves mybot.farm share links.";
    case "raw_gaf_not_supported":
      return "Raw GAF JSON on other hosts is v2. Paste a mybot.farm URL for now.";
    case "unsupported_path":
      return "That mybot.farm path is not a stall, pack, or API share link.";
    case "stall_not_found":
      return result.slug
        ? `No stall named “${result.slug}”.`
        : "No stall matches that link.";
    default:
      return "Could not resolve that link.";
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isSuccess(value: unknown): value is ResolveShareSuccess {
  return Boolean(value && typeof value === "object" && "ok" in value && value.ok === true);
}

function isFailure(value: unknown): value is ResolveShareFailure {
  return Boolean(
    value && typeof value === "object" && "ok" in value && value.ok === false && "error" in value,
  );
}

function stateFromResult(result: ResolveShareResult | undefined): PlantState {
  if (!result) {
    return { status: "idle" };
  }

  if (result.ok) {
    return { status: "preview", result };
  }

  return { status: "error", result };
}

export function PlantShareForm({
  initialUrl = "",
  initialResult,
}: {
  initialUrl?: string;
  initialResult?: ResolveShareResult;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [state, setState] = useState<PlantState>(() => stateFromResult(initialResult));

  async function resolve(nextUrl = url) {
    const trimmed = nextUrl.trim();

    if (!trimmed) {
      setState({
        status: "error",
        result: { ok: false, error: "url_required", warnings: [] },
      });
      return;
    }

    setState({ status: "loading" });

    try {
      const response = await fetch("/api/resolve-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data: unknown = await readJson(response);

      if (isSuccess(data)) {
        setState({ status: "preview", result: data });
        return;
      }

      if (isFailure(data)) {
        setState({ status: "error", result: data });
        return;
      }

      setState({
        status: "error",
        result: { message: "Resolve returned an unexpected response." },
      });
    } catch {
      setState({
        status: "error",
        result: { message: "Could not reach /api/resolve-share." },
      });
    }
  }

  async function plant() {
    if (state.status !== "preview" && state.status !== "planted-blocked") {
      return;
    }

    const preview = state.result;

    try {
      const response = await fetch("/api/library/plant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() || preview.canonicalUrl }),
      });
      const data: unknown = await readJson(response);
      const message =
        data &&
        typeof data === "object" &&
        "message" in data &&
        typeof data.message === "string"
          ? data.message
          : "Plant into library needs a signed-in buyer. Preview-only for now.";

      setState({ status: "planted-blocked", result: preview, message });
    } catch {
      setState({
        status: "planted-blocked",
        result: preview,
        message: "Could not reach /api/library/plant.",
      });
    }
  }

  const preview =
    state.status === "preview" || state.status === "planted-blocked"
      ? state.result
      : null;
  const tone = preview ? stallToneClasses[preview.stall.tone ?? "find"] : null;

  return (
    <div className="space-y-8">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void resolve();
        }}
      >
        <label htmlFor="share-url" className="block text-sm font-medium text-foreground">
          Share URL
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="share-url"
            name="url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="https://mybot.farm/agents/gift-day"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          <Button
            type="submit"
            size="lg"
            className="h-11 rounded-full px-5"
            disabled={state.status === "loading"}
          >
            {state.status === "loading" ? "Resolving…" : "Preview"}
          </Button>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Stall pages, <code className="font-mono text-[0.9em] text-foreground">/packs/…json</code>,
          or <code className="font-mono text-[0.9em] text-foreground">/api/…</code> on this farm.
          Bare slugs work too. Raw GAF on other hosts is later.
        </p>
      </form>

      {state.status === "error" ? (
        <p className="text-sm leading-relaxed text-destructive" role="alert">
          {errorText(state.result)}
          {"warnings" in state.result && state.result.warnings?.length ? (
            <span className="mt-2 block text-muted-foreground">
              {state.result.warnings.join(" ")}
            </span>
          ) : null}
        </p>
      ) : null}

      {preview && tone ? (
        <article className={cn("rounded-3xl px-6 py-8 ring-1 sm:px-8", tone.card)}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={cn("h-6 px-2.5", tone.label)}>
              {preview.stall.category}
            </Badge>
            <Badge variant="outline" className="h-6 px-2.5">
              {preview.kind === "team" ? "Team" : "Agent"}
            </Badge>
            {preview.packSummary.scrubbed ? (
              <Badge variant="outline" className="h-6 px-2.5">
                Scrubbed
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
            {preview.stall.name}
          </h2>
          <p className="mt-2 text-base text-foreground/70">{preview.stall.title}</p>
          <p className="mt-3 text-base leading-relaxed text-pretty text-foreground/80">
            {preview.stall.description}
          </p>
          <p className="mt-4 text-sm text-foreground/70">
            {preview.packSummary.skillCount} skills · {preview.packSummary.memoryCount} memory ·{" "}
            {preview.packSummary.memberCount} members
          </p>
          {preview.stall.members?.length ? (
            <p className="mt-2 text-sm text-foreground/70">
              Members: {preview.stall.members.map((member) => member.name).join(", ")}
            </p>
          ) : null}
          {preview.warnings.length ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-foreground/70">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="lg" className="h-9 rounded-full px-4">
              <Link href={preview.stall.pagePath}>Open stall</Link>
            </Button>
            <CopyInstallPrompt prompt={preview.installPrompt.prompt} />
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-9 rounded-full px-4"
              onClick={() => {
                void plant();
              }}
            >
              Plant into library
            </Button>
          </div>
          {state.status === "planted-blocked" ? (
            <p className="mt-4 text-sm leading-relaxed text-foreground/75" role="status">
              {state.message}
            </p>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-foreground/65">
              Plant is preview-only until buyer accounts exist. Copy install prompt still
              creates a Grok Bot copy.
            </p>
          )}
        </article>
      ) : null}
    </div>
  );
}
