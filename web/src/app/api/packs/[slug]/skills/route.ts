import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { packSkillList } from "@/lib/pack-files";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/packs/[slug]/skills">,
) {
  const { slug } = await context.params;
  const skills = packSkillList(slug);

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
