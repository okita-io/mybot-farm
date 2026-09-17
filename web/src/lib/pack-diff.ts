import type { FarmPack } from "@/lib/pack-files";

function skillNames(pack: FarmPack | null | undefined): string[] {
  return (pack?.skills ?? [])
    .map((skill) => skill.name?.trim())
    .filter((name): name is string => Boolean(name));
}

function memberRoles(pack: FarmPack | null | undefined): string[] {
  return (pack?.members ?? [])
    .map((member) => (member.role ?? member.pack ?? "").trim())
    .filter(Boolean);
}

function added(before: string[], after: string[]): string[] {
  const prior = new Set(before);
  return after.filter((item) => !prior.has(item));
}

function removed(before: string[], after: string[]): string[] {
  const next = new Set(after);
  return before.filter((item) => !next.has(item));
}

function clipList(items: string[], noun: string): string | null {
  if (!items.length) {
    return null;
  }
  const shown = items.slice(0, 3).join(", ");
  const extra = items.length > 3 ? ` (+${items.length - 3})` : "";
  const verb = items.length === 1 ? noun : `${noun}s`;
  return `Added ${verb} ${shown}${extra}`;
}

export function summarizePackChange(
  previous: FarmPack | null | undefined,
  next: FarmPack,
  options?: { created?: boolean },
): string {
  if (options?.created || !previous) {
    const skills = skillNames(next);
    const members = memberRoles(next);
    const bits = [
      "Published",
      skills.length ? `${skills.length} skill${skills.length === 1 ? "" : "s"}` : null,
      members.length ? `${members.length} member${members.length === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    return bits.join(" · ");
  }

  const parts = [
    clipList(added(skillNames(previous), skillNames(next)), "skill"),
    clipList(added(memberRoles(previous), memberRoles(next)), "member"),
  ].filter(Boolean) as string[];

  const droppedSkills = removed(skillNames(previous), skillNames(next));
  if (droppedSkills.length) {
    parts.push(
      `Removed skill${droppedSkills.length === 1 ? "" : "s"} ${droppedSkills.slice(0, 3).join(", ")}`,
    );
  }
  const droppedMembers = removed(memberRoles(previous), memberRoles(next));
  if (droppedMembers.length) {
    parts.push(
      `Removed member${droppedMembers.length === 1 ? "" : "s"} ${droppedMembers.slice(0, 3).join(", ")}`,
    );
  }

  const prevTitle = previous.profile?.title?.trim();
  const nextTitle = next.profile?.title?.trim();
  if (prevTitle && nextTitle && prevTitle !== nextTitle) {
    parts.push("Updated title");
  }

  const prevDesc = previous.profile?.description?.trim();
  const nextDesc = next.profile?.description?.trim();
  if (prevDesc && nextDesc && prevDesc !== nextDesc) {
    parts.push("Updated description");
  }

  return parts.slice(0, 3).join(" · ") || "Updated pack";
}
