import { auth } from "@clerk/nextjs/server";
import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { findStall, resolvePackAccess } from "@/lib/catalog";
import { installPromptPayload } from "@/lib/install-prompt";
import { withPaidStallPayment } from "@/lib/mpp-pack";
import type { Stall } from "@/lib/packs";

function installPromptResponse(request: Request, stall: Stall) {
  const url = new URL(request.url);
  const payload = installPromptPayload(stall);

  if (url.searchParams.get("short") === "1") {
    return jsonResponse({
      tool: "get_install_prompt",
      slug: payload.slug,
      url: payload.url,
      prompt: payload.shortPrompt,
      variant: "short",
    });
  }

  return jsonResponse({
    tool: "get_install_prompt",
    ...payload,
  });
}

export async function GET(
  request: Request,
  context: RouteContext<"/api/install-prompt/[slug]">,
) {
  const { slug } = await context.params;
  const stall = await findStall(slug);

  if (!stall) {
    return notFoundResponse(slug);
  }

  const { userId } = await auth();
  const access = await resolvePackAccess(slug, userId);

  if (!access.ok && access.reason === "not_found") {
    return notFoundResponse(slug);
  }

  if (!access.ok) {
    return withPaidStallPayment(request, access.stall, () =>
      installPromptResponse(request, access.stall),
    );
  }

  return installPromptResponse(request, stall);
}

export function OPTIONS() {
  return optionsResponse();
}
