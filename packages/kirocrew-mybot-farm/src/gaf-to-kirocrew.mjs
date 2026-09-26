// GAF <-> KiroCrew mapping — the heart of the plugin.
//
// Import: gafToKirocrewAgent(pack) -> { template, steeringFiles[] }
//   * template lands at ~/.kiro/agents/<name>.json
//   * steeringFiles land under .kiro/steering/farm/<slug>/<skill>.md  (decision D2)
//   * tools default deny-by-default: read/search/web only            (decision D3)
//   * routines are documented in the prompt, NOT auto-scheduled       (decision D4)
//
// Export: kirocrewAgentToGaf(template) -> GAF agent-pack, machine-local fields scrubbed.
//
// Pure functions (no fs / no network) so they are unit-testable.

/** Reserved template-name prefixes the plugin must never write. */
const RESERVED_PREFIXES = ["kirocrew"];

/** D3: capabilities a planted third-party agent gets by default. No bash/write. */
export const DEFAULT_TOOLS = [
  "fs_read", "grep", "glob", "web_fetch", "web_search", "introspect",
];
export const DEFAULT_ALLOWED_TOOLS = [
  "fs_read", "grep", "glob", "web_fetch", "web_search", "introspect",
];
/** Capabilities we strip from any pack-requested set, always. */
const DENIED_TOOLS = new Set(["execute_bash", "fs_write"]);

export function slugifyName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Sanitize a GAF pack into a safe KiroCrew agent name; prefix reserved collisions. */
export function safeAgentName(pack, override) {
  let base = slugifyName(override || pack?.slug || pack?.profile?.name || "agent");
  if (!base) base = "agent";
  if (RESERVED_PREFIXES.some((p) => base === p || base.startsWith(p + "-"))) {
    base = `farm-${base}`;
  }
  return base;
}

function steeringDir(slug) {
  return `.kiro/steering/farm/${slug}`;
}

/** Compose the system prompt from GAF profile + memory + gettingStarted + routines. */
function composePrompt(pack, slug) {
  const p = pack.profile ?? {};
  const lines = [];
  lines.push(`# ${p.name ?? slug}`);
  if (p.title) lines.push(`\n_${p.title}_`);
  if (p.description) lines.push(`\n${p.description}`);

  const memory = Array.isArray(pack.memory) ? pack.memory : [];
  if (memory.length) {
    lines.push(`\n## Durable context`);
    for (const m of memory) if (m?.content) lines.push(`- ${m.content}`);
  }

  const skills = Array.isArray(pack.skills) ? pack.skills : [];
  const withContent = skills.filter((s) => s?.name && s?.content?.trim());
  const withoutContent = skills.filter((s) => s?.name && !s?.content?.trim());
  if (withContent.length) {
    lines.push(`\n## Skills`);
    lines.push(`Your procedures are steering files under \`${steeringDir(slug)}/\`:`);
    for (const s of withContent) lines.push(`- **${s.name}**${s.description ? ` — ${s.description}` : ""}`);
  }
  if (withoutContent.length) {
    lines.push(`\n## Referenced skills (no body shipped)`);
    for (const s of withoutContent) lines.push(`- ${s.name}${s.description ? ` — ${s.description}` : ""}`);
  }

  const gs = pack.gettingStarted?.skill;
  if (gs) lines.push(`\n## Getting started\nStart with the **${gs}** skill.`);

  // D4: routines are documented, NOT scheduled.
  const routines = Array.isArray(pack.routines) ? pack.routines : [];
  if (routines.length) {
    lines.push(`\n## Routines (not auto-scheduled)`);
    lines.push(`This pack ships routines. They are documented here but NOT scheduled on install; ask to schedule them explicitly.`);
    for (const r of routines) lines.push(`- **${r.slug}**${r.name ? ` (${r.name})` : ""}${r.description ? ` — ${r.description}` : ""}`);
  }

  return lines.join("\n") + "\n";
}

/**
 * Project a GAF agent-pack onto a KiroCrew agent template + steering files.
 * @returns {{ name, template, steeringFiles, withheldTools, notes }}
 */
export function gafToKirocrewAgent(pack, opts = {}) {
  const slug = slugifyName(pack?.slug || pack?.profile?.name || "agent");
  const name = safeAgentName(pack, opts.name);
  const notes = [];

  // D3: requested plugin/tool capabilities are recorded but NOT auto-granted.
  const requested = Array.isArray(pack.plugins)
    ? pack.plugins.map((pl) => pl?.pluginId).filter(Boolean)
    : [];
  const withheldTools = [...DENIED_TOOLS];
  if (requested.length) {
    notes.push(`Pack requested plugins [${requested.join(", ")}] — not auto-granted; add to the template's tools/mcpServers if you trust them.`);
  }

  const steeringFiles = [];
  const skills = Array.isArray(pack.skills) ? pack.skills : [];
  for (const s of skills) {
    if (s?.name && s?.content?.trim()) {
      steeringFiles.push({
        path: `${steeringDir(slug)}/${slugifyName(s.name)}.md`,
        content: `# ${s.name}\n\n${s.description ? s.description + "\n\n" : ""}${s.content.trim()}\n`,
      });
    }
  }

  const template = {
    name,
    description: pack.profile?.title || pack.profile?.description || name,
    model: typeof pack.model === "string" ? pack.model : "auto",
    tools: [...DEFAULT_TOOLS],
    allowedTools: [...DEFAULT_ALLOWED_TOOLS],
    resources: [`file://${steeringDir(slug)}/**/*.md`],
    prompt: composePrompt(pack, slug),
  };

  return { name, slug, template, steeringFiles, withheldTools, notes };
}

/**
 * Project a GAF team-pack onto a KiroCrew crew:
 *   - one agent template + steering set per member (via gafToKirocrewAgent)
 *   - a shared steering file for shared.memory
 *   - a workspace (name = team slug) that members bind to
 *   - the CLI bind commands to run (workspace create + agent create per member),
 *     since D1 established the CLI binds members but the plugin writes templates.
 *   - topology + shared.gettingStarted preserved as documentation
 *
 * memberPacks: map of memberSlug -> resolved GAF agent-pack (fetched by caller).
 * @returns {{ workspace, members[], sharedSteering, bindCommands[], topologyDoc, notes }}
 */
export function gafTeamToKirocrewCrew(teamPack, memberPacks, opts = {}) {
  const teamSlug = slugifyName(teamPack?.slug || teamPack?.profile?.name || "team");
  const workspace = safeAgentName({ slug: teamSlug }, opts.workspace);
  const notes = [];
  const members = [];
  const bindCommands = [];

  bindCommands.push(`kirocrew workspace create --name ${workspace}`);

  const refs = Array.isArray(teamPack?.members) ? teamPack.members : [];
  for (const ref of refs) {
    const memberSlug = typeof ref.pack === "string"
      ? String(ref.pack).split("/").pop().replace(/\.(json|hermes\.tar\.gz|tar\.gz)$/i, "")
      : slugifyName(ref.role || "member");
    const resolved = memberPacks?.[memberSlug];
    if (!resolved) {
      notes.push(`member "${memberSlug}" (${ref.role ?? "?"}) could not be resolved — skipped; fetch its pack and re-run.`);
      continue;
    }
    const mapped = gafToKirocrewAgent(resolved, {});
    members.push({ role: ref.role, summary: ref.summary, ...mapped });
    bindCommands.push(
      `kirocrew agent create --name "${mapped.name}" --kiro-agent ${mapped.name} --workspace ${workspace} --memory-store default`,
    );
  }

  // shared.memory -> a shared steering file all members can reference
  let sharedSteering = null;
  const sharedMem = Array.isArray(teamPack?.shared?.memory) ? teamPack.shared.memory : [];
  if (sharedMem.length) {
    sharedSteering = {
      path: `.kiro/steering/farm/${teamSlug}/_shared.md`,
      content: `# ${teamPack.profile?.name ?? teamSlug} — shared context\n\n${sharedMem.map((m) => `- ${m.content}`).join("\n")}\n`,
    };
  }

  const topo = teamPack?.topology;
  const topologyDoc = [
    `# ${teamPack.profile?.name ?? teamSlug} — crew`,
    teamPack.profile?.description ? `\n${teamPack.profile.description}` : "",
    topo?.kind ? `\n**Topology:** ${topo.kind}` : "",
    Array.isArray(topo?.handoffs) && topo.handoffs.length
      ? `\n**Handoffs:**\n${topo.handoffs.map((h) => `- ${h}`).join("\n")}` : "",
    teamPack?.shared?.gettingStarted ? `\n**Getting started:** ${teamPack.shared.gettingStarted}` : "",
  ].filter(Boolean).join("\n") + "\n";

  return { teamSlug, workspace, members, sharedSteering, bindCommands, topologyDoc, notes };
}

/**
 * Reverse: a KiroCrew agent template -> GAF agent-pack, scrubbed of machine-local
 * fields (mcpServers with absolute paths, hooks, keys). For farm_post export.
 */
export function kirocrewAgentToGaf(template, opts = {}) {
  const name = template?.name ?? "agent";
  const scrubbedNotes = [];
  if (template?.mcpServers) scrubbedNotes.push("mcpServers (machine-local binary paths)");
  if (template?.hooks) scrubbedNotes.push("hooks (machine-local commands)");

  const pack = {
    format: "mybot.farm/agent-pack",
    version: "0.1",
    slug: opts.slug ?? slugifyName(name),
    category: opts.category ?? "Experimental",
    profile: {
      name: opts.displayName ?? name,
      title: template?.description ?? name,
      description: opts.description ?? template?.description ?? "",
    },
    // The composed prompt becomes the soul/first memory; skills are re-derived
    // from steering files by the caller (they live on disk, not in the template).
    memory: template?.prompt
      ? [{ kind: "profile", content: template.prompt.trim() }]
      : [],
    skills: opts.skills ?? [],
    routines: [],
    plugins: [],
    manifest: { scrubbed: true, author: opts.author ?? "kirocrew export" },
  };

  return { pack, scrubbed: scrubbedNotes };
}
