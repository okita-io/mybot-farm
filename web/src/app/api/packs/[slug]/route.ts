import { corsHeaders, jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { packFilename } from "@/lib/packs";
import { requireStallAndPack } from "@/lib/pack-files";

export async function GET(
  request: Request,
  context: RouteContext<"/api/packs/[slug]">,
) {
  const { slug } = await context.params;
  const loaded = requireStallAndPack(slug);

  if (!loaded) {
    return notFoundResponse(slug);
  }

  const { stall, pack } = loaded;
  const url = new URL(request.url);
  const asDownload = url.searchParams.get("download") === "1";
  const headers = new Headers(corsHeaders);

  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=60");

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
