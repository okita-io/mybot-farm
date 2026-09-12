import { auth } from "@clerk/nextjs/server";
import { jsonResponse, notFoundResponse, optionsResponse, paymentRequiredResponse } from "@/lib/http";
import { catalogPackSkillList, resolvePackAccess } from "@/lib/catalog";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/packs/[slug]/skills">,
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

  const skills = await catalogPackSkillList(slug);

  if (!skills) {
    return notFoundResponse(slug);
  }

  return jsonResponse({
    tool: "list_pack_skills",
    ...skills,
  });
}

export function OPTIONS() {
  return optionsResponse();
}
