import { lint as lintMarkdown } from "markdownlint/sync";
import DOMPurify from "isomorphic-dompurify";
import { marked, type Token, type Tokens } from "marked";

export const MAX_README_CHARS = 64_000;

export type ReadmeIssue = {
  severity: "warning" | "error";
  source: "markdownlint" | "marked" | "dompurify" | "input";
  message: string;
  detail?: string;
  line?: number;
  rule?: string;
};

export type ReadmeParseResult =
  | { ok: true; markdown: string; html: string; warnings: ReadmeIssue[] }
  | { ok: false; errors: ReadmeIssue[]; warnings: ReadmeIssue[] };

const ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "hr",
  "ul",
  "ol",
  "li",
  "a",
  "strong",
  "em",
  "b",
  "i",
  "code",
  "pre",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "del",
  "s",
];

const ALLOWED_ATTR = ["href", "title", "colspan", "rowspan", "align"];

const MARKDOWNLINT_CONFIG = {
  default: true,
  MD013: false,
  "line-length": false,
  MD041: false,
  "first-line-heading": false,
  MD033: false,
  "no-inline-html": false,
  MD036: false,
  "no-emphasis-as-heading": false,
  // Images are stripped later; do not hard-fail on missing alt text.
  MD045: false,
  "no-alt-text": false,
};

const MERMAID_FENCE =
  /```mermaid[^\n]*\n[\s\S]*?```/gi;
const LATEX_BLOCK = /\$\$[\s\S]+?\$\$/g;
const LATEX_INLINE = /(?<!\$)\$(?!\$)([^$\n]+)\$(?!\$)/g;

function lineOfIndex(text: string, index: number) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function stripUnsupportedConstructs(markdown: string): {
  markdown: string;
  warnings: ReadmeIssue[];
} {
  const warnings: ReadmeIssue[] = [];
  let next = markdown;

  next = next.replace(MERMAID_FENCE, (match, offset: number) => {
    warnings.push({
      severity: "warning",
      source: "marked",
      message:
        "Mermaid diagrams are not displayed. Remove the mermaid fence or replace it with a plain description.",
      detail: "```mermaid",
      line: lineOfIndex(markdown, offset),
      rule: "mermaid",
    });
    return "\n\n> Mermaid diagram omitted (not supported on stall READMEs).\n\n";
  });

  next = next.replace(LATEX_BLOCK, (match, offset: number) => {
    warnings.push({
      severity: "warning",
      source: "marked",
      message:
        "LaTeX blocks are not displayed. Rewrite the formula in plain text or code.",
      detail: "$$...$$",
      line: lineOfIndex(markdown, offset),
      rule: "latex-block",
    });
    return "\n\n> Math block omitted (LaTeX not supported).\n\n";
  });

  next = next.replace(LATEX_INLINE, (match, _inner: string, offset: number) => {
    warnings.push({
      severity: "warning",
      source: "marked",
      message:
        "Inline LaTeX is not displayed. Rewrite the formula in plain text.",
      detail: match.slice(0, 40),
      line: lineOfIndex(markdown, offset),
      rule: "latex-inline",
    });
    return "`(math omitted)`";
  });

  return { markdown: next, warnings };
}

function lintIssues(markdown: string): ReadmeIssue[] {
  const result = lintMarkdown({
    strings: { readme: markdown },
    config: MARKDOWNLINT_CONFIG,
  });

  const findings = result.readme ?? [];
  return findings.map((finding) => {
    const rule = finding.ruleNames[0] ?? "markdownlint";
    const severity =
      finding.severity === "warning" ? ("warning" as const) : ("error" as const);
    return {
      severity,
      source: "markdownlint" as const,
      message: `${finding.ruleDescription}. Fix the formatting so the README displays correctly.`,
      detail: finding.errorDetail ?? finding.errorContext ?? undefined,
      line: finding.lineNumber,
      rule,
    };
  });
}

function collectMarkedWarnings(tokens: Token[]): ReadmeIssue[] {
  const warnings: ReadmeIssue[] = [];

  const walk = (list: Token[]) => {
    for (const token of list) {
      if (token.type === "html") {
        warnings.push({
          severity: "warning",
          source: "marked",
          message:
            "Raw HTML in the README is not kept as written. Prefer basic markdown.",
          detail: token.raw.slice(0, 80).trim(),
          rule: "html",
        });
      }
      if (token.type === "image") {
        const image = token as Tokens.Image;
        warnings.push({
          severity: "warning",
          source: "marked",
          message:
            "Images are not displayed on stall READMEs. Remove the image or describe it in text.",
          detail: image.href || "image",
          rule: "image",
        });
      }
      if ("tokens" in token && Array.isArray(token.tokens)) {
        walk(token.tokens);
      }
      if ("items" in token && Array.isArray(token.items)) {
        for (const item of token.items) {
          if ("tokens" in item && Array.isArray(item.tokens)) {
            walk(item.tokens);
          }
        }
      }
    }
  };

  walk(tokens);
  return warnings;
}

function sanitizeHtml(html: string): {
  html: string;
  warnings: ReadmeIssue[];
} {
  const warnings: ReadmeIssue[] = [];
  const seen = new Set<string>();

  DOMPurify.removeAllHooks();

  DOMPurify.addHook("uponSanitizeElement", (_node, data) => {
    if (
      data.allowedTags[data.tagName] ||
      data.tagName === "body" ||
      data.tagName === "html" ||
      data.tagName === "#document-fragment" ||
      data.tagName === "head"
    ) {
      return;
    }
    const key = `tag:${data.tagName}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    warnings.push({
      severity: "warning",
      source: "dompurify",
      message: `Tag <${data.tagName}> was removed. Rewrite with basic markdown so it displays correctly.`,
      detail: data.tagName,
      rule: data.tagName,
    });
  });

  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    if (data.attrName === "href") {
      const value = data.attrValue.trim().toLowerCase();
      if (value.startsWith("javascript:") || value.startsWith("data:")) {
        data.keepAttr = false;
        const key = `attr:href:${value.slice(0, 24)}`;
        if (!seen.has(key)) {
          seen.add(key);
          warnings.push({
            severity: "warning",
            source: "dompurify",
            message:
              "Unsafe link was removed. Use http(s) or relative links only.",
            detail: `href=${data.attrValue.slice(0, 60)}`,
            rule: "href",
          });
        }
      }
    }

    if (!data.keepAttr && data.attrName) {
      const tag =
        typeof (node as Element).tagName === "string"
          ? (node as Element).tagName.toLowerCase()
          : "element";
      const key = `attr:${tag}.${data.attrName}`;
      if (!seen.has(key)) {
        seen.add(key);
        warnings.push({
          severity: "warning",
          source: "dompurify",
          message: `Attribute ${data.attrName} on <${tag}> was not allowed — remove it or rewrite as basic markdown.`,
          detail: `${tag}.${data.attrName}`,
          rule: `${tag}.${data.attrName}`,
        });
      }
    }
  });

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });

  DOMPurify.removeAllHooks();

  return { html: clean, warnings };
}

/** Extract a string README from a GAF pack object, if present. */
export function extractPackReadme(pack: Record<string, unknown>): string | null {
  for (const key of ["readme", "README", "README.md"] as const) {
    const value = pack[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return null;
}

export function parseStallReadme(input: string): ReadmeParseResult {
  const warnings: ReadmeIssue[] = [];

  if (typeof input !== "string") {
    return {
      ok: false,
      errors: [
        {
          severity: "error",
          source: "input",
          message: "Please fix the formatting. README must be markdown text.",
          rule: "type",
        },
      ],
      warnings: [],
    };
  }

  const markdown = input.replace(/^\uFEFF/, "");
  if (!markdown.trim()) {
    return {
      ok: false,
      errors: [
        {
          severity: "error",
          source: "input",
          message: "Please fix the formatting. README is empty.",
          rule: "empty",
        },
      ],
      warnings: [],
    };
  }

  if (markdown.length > MAX_README_CHARS) {
    return {
      ok: false,
      errors: [
        {
          severity: "error",
          source: "input",
          message: `Please fix the formatting. README is too large (max ${MAX_README_CHARS.toLocaleString()} characters).`,
          detail: `${markdown.length} characters`,
          rule: "size",
        },
      ],
      warnings: [],
    };
  }

  const linted = lintIssues(markdown);
  // Style findings stay visible on the card, but only structural/parse
  // failures hard-block a save (empty, size, marked, sanitizer).
  for (const issue of linted) {
    warnings.push({ ...issue, severity: "warning" });
  }

  const stripped = stripUnsupportedConstructs(markdown);
  warnings.push(...stripped.warnings);

  let rawHtml = "";
  try {
    const lexer = new marked.Lexer();
    const tokens = lexer.lex(stripped.markdown);
    warnings.push(...collectMarkedWarnings(tokens));
    const parsed = marked.parser(tokens);
    rawHtml = typeof parsed === "string" ? parsed : "";
  } catch (error) {
    return {
      ok: false,
      errors: [
        {
          severity: "error",
          source: "marked",
          message:
            "Please fix the formatting. Markdown failed to parse into HTML.",
          detail: error instanceof Error ? error.message : String(error),
          rule: "parse",
        },
      ],
      warnings,
    };
  }

  if (!rawHtml.trim()) {
    return {
      ok: false,
      errors: [
        {
          severity: "error",
          source: "marked",
          message:
            "Please fix the formatting. Markdown produced no displayable content.",
          rule: "empty-html",
        },
      ],
      warnings,
    };
  }

  const sanitized = sanitizeHtml(rawHtml);
  warnings.push(...sanitized.warnings);

  const textOnly = sanitized.html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!textOnly) {
    return {
      ok: false,
      errors: [
        {
          severity: "error",
          source: "dompurify",
          message:
            "Please fix the formatting. After sanitizing, nothing safe remained to display. Use basic markdown only.",
          rule: "empty-sanitized",
        },
      ],
      warnings,
    };
  }

  return {
    ok: true,
    markdown,
    html: sanitized.html,
    warnings,
  };
}
