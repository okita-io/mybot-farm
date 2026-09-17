import { auth } from "@clerk/nextjs/server";
import { corsHeaders, jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { getCatalogPack, resolvePackAccess } from "@/lib/catalog";
import { recordStallDownload } from "@/lib/engagement";
import { withPaidStallPayment } from "@/lib/mpp-pack";
import { packFilename, type Stall } from "@/lib/packs";
import type { FarmPack } from "@/lib/pack-files";

async function packDownloadResponse(
  request: Request,
  slug: string,
  stall: Stall,
  pack?: FarmPack,
) {
  const resolved = pack ?? (await getCatalogPack(slug));
  if (!resolved) {
    return notFoundResponse(slug);
  }

  const url = new URL(request.url);
  const asDownload = url.searchParams.get("download") === "1";
  const headers = new Headers(corsHeaders);

  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set(
    "Cache-Control",
    stall.listingId ? "private, no-store" : "public, max-age=60",
  );

  if (asDownload) {
    await recordStallDownload(slug);
    headers.set(
      "Content-Disposition",
      `attachment; filename="${packFilename(stall)}"`,
    );
  }

  return jsonResponse(resolved, { headers });
}

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
    return withPaidStallPayment(request, access.stall, () =>
      packDownloadResponse(request, slug, access.stall),
    );
  }

  return packDownloadResponse(request, slug, access.stall, access.pack);
}

export function OPTIONS() {
  return optionsResponse();
}
