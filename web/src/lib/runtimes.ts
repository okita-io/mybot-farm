export const RUNTIME_IDS = ["grok-bot", "hermes", "openclaw"] as const;

export type RuntimeId = (typeof RUNTIME_IDS)[number];

export type RuntimeTag = {
  id: RuntimeId;
  label: string;
  className: string;
};

export const runtimeTags: Record<RuntimeId, RuntimeTag> = {
  "grok-bot": {
    id: "grok-bot",
    label: "GrokBot",
    className:
      "border-transparent bg-black text-white! dark:bg-white dark:text-black!",
  },
  hermes: {
    id: "hermes",
    label: "Hermes",
    className: "border-transparent bg-blue-600 text-white!",
  },
  openclaw: {
    id: "openclaw",
    label: "OpenClaw",
    className: "border-transparent bg-red-600 text-black!",
  },
};

export function isRuntimeId(value: string): value is RuntimeId {
  return (RUNTIME_IDS as readonly string[]).includes(value);
}

export function normalizeRuntimes(runtime: string[] | undefined): RuntimeId[] {
  const seen = new Set<RuntimeId>();

  for (const value of runtime ?? []) {
    if (isRuntimeId(value)) {
      seen.add(value);
    }
  }

  return RUNTIME_IDS.filter((id) => seen.has(id));
}

export function runtimeTag(id: string): RuntimeTag | undefined {
  return isRuntimeId(id) ? runtimeTags[id] : undefined;
}
