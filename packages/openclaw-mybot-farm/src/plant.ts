export { slugifyAgentId, writePackWorkspace, plantPack } from "./plant.mjs";

export type PlantOptions = {
  slug: string;
  agentId?: string;
  workspace?: string;
  force?: boolean;
  config: { baseUrl: string; workspaceRoot: string };
  skipAgentsAdd?: boolean;
};

export type PlantResult = {
  agentId: string;
  workspace: string;
  skillsInstalled: string[];
  attribution: string;
  sourceNote: string;
  packSlug: string;
  createdAgent: boolean;
};
