import { NextResponse } from "next/server";
import {
  clearListingReadme,
  getListingById,
  updateListingReadme,
} from "@/lib/listings";
import { parseStallReadme } from "@/lib/readme";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getListingById(id);
  if (
    !existing ||
    existing.sellerUserId !== user.id ||
    existing.deletedAt
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const markdown =
    body && typeof body === "object" && "markdown" in body
      ? (body as { markdown: unknown }).markdown
      : null;

  if (typeof markdown !== "string") {
    return NextResponse.json(
      {
        error: "readme_invalid",
        message: "Please fix the formatting.",
        errors: [
          {
            severity: "error",
            source: "input",
            message: "README body must include a markdown string.",
            rule: "type",
          },
        ],
        warnings: [],
      },
      { status: 400 },
    );
  }

  const parsed = parseStallReadme(markdown);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        error: "readme_invalid",
        message: "Please fix the formatting.",
        errors: parsed.errors,
        warnings: parsed.warnings,
      },
      { status: 400 },
    );
  }

  const listing = await updateListingReadme(id, user.id, {
    readmeMarkdown: parsed.markdown,
    readmeHtml: parsed.html,
  });
  if (!listing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    html: listing.readmeHtml,
    warnings: parsed.warnings,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const listing = await clearListingReadme(id, user.id);
  if (!listing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
