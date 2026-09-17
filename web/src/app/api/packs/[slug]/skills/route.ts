import { auth } from "@clerk/nextjs/server";
import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { catalogPackSkillList, resolvePackAccess } from "@/lib/catalog";
import { withPaidStallPayment } from "@/lib/mpp-pack";

export async function GET(
  request: Request,
  context: RouteContext<"/api/packs/[slug]/skills">,
) {
  const { slug } = await context.params;
  const { userId } = await auth();
  const access = await resolvePackAccess(slug, userId);

  if (!access.ok && access.reason === "not_found") {
    return notFoundResponse(slug);
  }

  if (!access.ok) {
    return withPaidStallPayment(request, access.stall, async () => {
      const skills = await catalogPackSkillList(slug);
      if (!skills) {
        return notFoundResponse(slug);
      }
      return jsonResponse({
        tool: "list_pack_skills",
        ...skills,
      });
    });
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
