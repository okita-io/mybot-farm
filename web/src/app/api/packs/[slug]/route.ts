import { auth } from "@clerk/nextjs/server";
import { corsHeaders, jsonResponse, notFoundResponse, optionsResponse, paymentRequiredResponse } from "@/lib/http";
import { packFilename } from "@/lib/packs";
import { resolvePackAccess } from "@/lib/catalog";

export async function GET(
  request: Request,
  context: RouteContext<"/api/packs/[slug]">,
) {
  const { slug } = await context.params;
  const { userId } = await auth();
  const access = await resolvePackAccess(slug, userId);

  if (!access.ok && access.reason === "not_found") {
    return notFoundResponse(slug);
  }

  if (!access.ok) {
    return paymentRequiredResponse(slug, access.stall.priceCents ?? 0);
  }

  const { stall, pack } = access;
  const url = new URL(request.url);
  const asDownload = url.searchParams.get("download") === "1";
  const headers = new Headers(corsHeaders);

  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set(
    "Cache-Control",
    stall.listingId ? "private, no-store" : "public, max-age=60",
  );

  if (asDownload) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="${packFilename(stall)}"`,
    );
  }

  return jsonResponse(pack, { headers });
}

export function OPTIONS() {
  return optionsResponse();
}
