import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { installPromptPayload } from "@/lib/install-prompt";
import { getStall } from "@/lib/packs";

export async function GET(
  request: Request,
  context: RouteContext<"/api/install-prompt/[slug]">,
) {
  const { slug } = await context.params;
  const stall = getStall(slug);

  if (!stall) {
    return notFoundResponse(slug);
  }

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

export function OPTIONS() {
  return optionsResponse();
}
