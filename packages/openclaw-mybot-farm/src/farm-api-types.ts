export type FarmStall = {
  slug: string;
  stallId?: string;
  packVersion?: number;
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
  avatar?: {
    kind?: string;
    shape?: string;
    color?: string;
  };
};

export type FarmPackRoutine = {
  slug: string;
  name?: string;
  description?: string;
  content?: string;
};

export type FarmPackPlugin = {
  pluginId: string;
  name?: string;
  description?: string;
};

export type FarmPackGettingStarted = {
  skill: string;
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
  /** Content revision for same-slug listing updates. Distinct from GAF format `version`. */
  packVersion?: number;
  runtime?: string[];
  slug: string;
  category?: string;
  tags?: string[];
  profile?: FarmPackProfile;
  memory?: FarmPackMemory[];
  skills?: FarmPackSkill[];
  routines?: FarmPackRoutine[];
  plugins?: FarmPackPlugin[];
  gettingStarted?: FarmPackGettingStarted;
  visibility?: "public" | "team";
  manifest?: FarmPackManifest;
  [key: string]: unknown;
};

export type FarmConfig = {
  baseUrl: string;
  workspaceRoot: string;
  apiKey?: string;
};

export type ListingKind = "agent" | "team";

export type ListingPayload = {
  kind: ListingKind;
  name: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  pack: Record<string, unknown>;
  slug?: string;
  packVersion?: number;
};

export type ListingPayloadSummary = {
  kind: ListingKind | string | undefined;
  name: string | undefined;
  title: string | undefined;
  category: string | undefined;
  priceCents: number | undefined;
  pack: {
    format?: unknown;
    version?: unknown;
    runtime: unknown;
    skillCount: number;
    encodedChars: number;
  };
};
