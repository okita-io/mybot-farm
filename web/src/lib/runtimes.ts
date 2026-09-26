export const RUNTIME_IDS = ["grok-bot", "hermes", "openclaw", "kirocrew"] as const;

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
      "border-transparent bg-black text-white! shadow-[inset_0_1px_0_oklch(1_0_0/0.28),var(--clay-shadow-sm)] dark:bg-white dark:text-black!",
  },
  hermes: {
    id: "hermes",
    label: "Hermes",
    className:
      "border-transparent bg-linear-to-b from-blue-500 to-blue-700 text-white! shadow-[inset_0_1px_0_oklch(1_0_0/0.35),var(--clay-shadow-sm)]",
  },
  openclaw: {
    id: "openclaw",
    label: "OpenClaw",
    className:
      "border-transparent bg-linear-to-b from-red-500 to-red-700 text-black! shadow-[inset_0_1px_0_oklch(1_0_0/0.35),var(--clay-shadow-sm)]",
  },
  kirocrew: {
    id: "kirocrew",
    label: "KiroCrew",
    className:
      "border-transparent bg-linear-to-b from-purple-500 to-purple-700 text-white! shadow-[inset_0_1px_0_oklch(1_0_0/0.35),var(--clay-shadow-sm)]",
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
