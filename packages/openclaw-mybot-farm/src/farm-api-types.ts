export type FarmStall = {
  slug: string;
  name?: string;
  title?: string;
  description?: string;
  pageUrl?: string;
  packUrl?: string;
  kind?: string;
  category?: string;
  api?: Record<string, string>;
  [key: string]: unknown;
};

export type FarmPackSkill = {
  name: string;
  description?: string;
  content?: string;
};

export type FarmPackMemory = {
  kind?: string;
  content?: string;
  createdAt?: string;
};

export type FarmPackProfile = {
  name?: string;
  title?: string;
  description?: string;
  avatar?: unknown;
};

export type FarmPackManifest = {
  author?: string;
  license?: string;
  homepage?: string;
  sourceNote?: string;
  sourceRepo?: string;
  sourcePath?: string;
  attribution?: string;
  skillCount?: number;
  [key: string]: unknown;
};

export type FarmPack = {
  format?: string;
  version?: string;
  runtime?: string[];
  slug: string;
  category?: string;
  tags?: string[];
  profile?: FarmPackProfile;
  memory?: FarmPackMemory[];
  skills?: FarmPackSkill[];
  manifest?: FarmPackManifest;
  [key: string]: unknown;
};

export type FarmConfig = {
  baseUrl: string;
  workspaceRoot: string;
};
