"use client";

import { useLayoutEffect, useRef, useState, type DragEvent } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, CircleX, FilePlus2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReadmeIssue } from "@/lib/readme";

type StallReadmeCardProps = {
  listingId?: string;
  isOwner: boolean;
  toneCardClassName: string;
  initialHtml?: string | null;
  initialWarnings?: ReadmeIssue[];
};

type FailState = {
  message: string;
  errors: ReadmeIssue[];
  warnings: ReadmeIssue[];
};

function issueLabel(issue: ReadmeIssue) {
  const parts = [
    issue.rule,
    issue.detail,
    issue.line != null ? `line ${issue.line}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

function IssueList({
  issues,
  tone,
}: {
  issues: ReadmeIssue[];
  tone: "warning" | "error";
}) {
  if (!issues.length) {
    return null;
  }

  return (
    <ul
      className={cn(
        "mt-2 space-y-1.5 text-sm leading-relaxed",
        tone === "error" ? "text-destructive" : "text-foreground/80",
      )}
    >
      {issues.map((issue, index) => (
        <li key={`${issue.rule ?? issue.source}-${index}`}>
          <span className="font-medium">{issueLabel(issue) || issue.source}</span>
          {": "}
          {issue.message}
        </li>
      ))}
    </ul>
  );
}

export function StallReadmeCard({
  listingId,
  isOwner,
  toneCardClassName,
  initialHtml,
  initialWarnings = [],
}: StallReadmeCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [html, setHtml] = useState(initialHtml?.trim() ? initialHtml : null);
  const [warnings, setWarnings] = useState<ReadmeIssue[]>(initialWarnings);
  const [fail, setFail] = useState<FailState | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [readmeExpanded, setReadmeExpanded] = useState(false);
  const [readmeOverflows, setReadmeOverflows] = useState(false);
  const readmeRef = useRef<HTMLDivElement>(null);

  const canEdit = Boolean(isOwner && listingId);
  const empty = !html;

  async function uploadMarkdown(file: File) {
    if (!listingId || !canEdit) {
      return;
    }

    const name = file.name.toLowerCase();
    if (
      !name.endsWith(".md") &&
      !name.endsWith(".markdown") &&
      file.type &&
      file.type !== "text/markdown" &&
      file.type !== "text/plain"
    ) {
      setFail({
        message: "Please fix the formatting.",
        errors: [
          {
            severity: "error",
            source: "input",
            message: "Upload a .md or .markdown file.",
            detail: file.name,
            rule: "filetype",
          },
        ],
        warnings: [],
      });
      return;
    }

    setBusy(true);
    setFail(null);

    try {
      const markdown = await file.text();
      const response = await fetch(`/api/listings/${listingId}/readme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        html?: string;
        warnings?: ReadmeIssue[];
        errors?: ReadmeIssue[];
        message?: string;
      } | null;

      if (!response.ok || !data?.ok) {
        setFail({
          message: data?.message ?? "Please fix the formatting.",
          errors: data?.errors ?? [
            {
              severity: "error",
              source: "input",
              message: "Upload failed. Try again with basic markdown.",
              rule: "upload",
            },
          ],
          warnings: data?.warnings ?? [],
        });
        return;
      }

      setHtml(data.html ?? null);
      setWarnings(data.warnings ?? []);
      setFail(null);
      setReadmeExpanded(false);
    } catch {
      setFail({
        message: "Please fix the formatting.",
        errors: [
          {
            severity: "error",
            source: "input",
            message: "Could not upload the README. Check your connection and try again.",
            rule: "network",
          },
        ],
        warnings: [],
      });
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function removeReadme() {
    if (!listingId || !canEdit) {
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/readme`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setFail({
          message: "Please fix the formatting.",
          errors: [
            {
              severity: "error",
              source: "input",
              message: "Could not remove the README. Try again.",
              rule: "delete",
            },
          ],
          warnings: [],
        });
        return;
      }
      setHtml(null);
      setWarnings([]);
      setFail(null);
      setReadmeExpanded(false);
      setReadmeOverflows(false);
    } finally {
      setBusy(false);
    }
  }

  useLayoutEffect(() => {
    const el = readmeRef.current;
    if (!el || !html) {
      setReadmeOverflows(false);
      return;
    }

    function measure() {
      if (!el || readmeExpanded) {
        return;
      }
      setReadmeOverflows(el.scrollHeight > el.clientHeight + 1);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [html, readmeExpanded]);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (!canEdit || busy) {
      return;
    }
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void uploadMarkdown(file);
    }
  }

  return (
    <div
      className={cn(
        "mt-4 rounded-3xl px-6 py-6 ring-1 sm:px-8",
        toneCardClassName,
        canEdit && empty && "border border-dashed border-foreground/20",
        dragOver && "ring-2 ring-foreground/30",
      )}
      onDragOver={(event) => {
        if (!canEdit) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            README
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Basic markdown only — Mermaid charts and LaTeX are not displayed.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".md,.markdown,text/markdown,text/plain"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadMarkdown(file);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {empty ? (
                <>
                  <FilePlus2 data-icon="inline-start" />
                  Add README
                </>
              ) : (
                <>
                  <Upload data-icon="inline-start" />
                  Replace
                </>
              )}
            </Button>
            {!empty ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={busy}
                onClick={() => void removeReadme()}
              >
                <Trash2 data-icon="inline-start" />
                Remove
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {fail ? (
        <div
          className="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 ring-1 ring-destructive/30"
          role="alert"
        >
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <CircleX className="size-4 shrink-0" aria-hidden />
            {fail.message}
          </p>
          <IssueList issues={[...fail.errors, ...fail.warnings]} tone="error" />
        </div>
      ) : null}

      {!fail && warnings.length && canEdit ? (
        <div
          className="mt-4 rounded-2xl bg-muted/80 px-4 py-3 ring-1 ring-foreground/10"
          role="status"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="size-4 shrink-0 text-foreground/70" aria-hidden />
            Some formatting could not be parsed. Fix the README so it displays
            correctly.
          </p>
          <IssueList issues={warnings} tone="warning" />
        </div>
      ) : null}

      {html ? (
        <div className="relative mt-4">
          <div
            ref={readmeRef}
            className={cn(
              "stall-readme text-base leading-relaxed text-foreground/90",
              !readmeExpanded && "line-clamp-5",
              !readmeExpanded && readmeOverflows && "pr-28",
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {readmeOverflows && !readmeExpanded ? (
            <button
              type="button"
              className="absolute right-0 bottom-0 inline-flex h-[1.625em] items-center gap-0.5 rounded-full bg-background/90 px-2 text-sm font-medium text-foreground ring-1 ring-foreground/10 backdrop-blur-sm"
              aria-expanded={false}
              onClick={() => setReadmeExpanded(true)}
            >
              <ChevronDown className="size-4" aria-hidden />
              Read more
            </button>
          ) : null}
          {readmeOverflows && readmeExpanded ? (
            <button
              type="button"
              className="mt-3 inline-flex items-center gap-0.5 text-sm font-medium text-foreground underline-offset-4 hover:underline"
              aria-expanded={true}
              onClick={() => setReadmeExpanded(false)}
            >
              <ChevronUp className="size-4" aria-hidden />
              Read less
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-card/40 px-5 py-8 text-center ring-1 ring-foreground/5">
          {canEdit ? (
            <p className="text-sm text-muted-foreground">
              {busy
                ? "Uploading…"
                : "Drop a .md file here, or use Add README, for an instruction manual that stays separate from the pack."}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No README yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
