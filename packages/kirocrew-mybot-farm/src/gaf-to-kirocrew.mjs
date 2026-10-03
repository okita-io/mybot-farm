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

/** worlds/v1 cast capability names that are DOCUMENTATION ONLY (spec §11.3). */
const WORLD_CAST_CAPABILITIES = new Set(["web", "files", "schedule"]);

/** Pick the cast skin for a member by role (worlds key cast by role, not name). */
function castSkinForRole(world, role) {
  const cast = Array.isArray(world?.cast) ? world.cast : [];
  return cast.find((c) => c && c.role === role) || null;
}

/** Place name for prose. Falls back to the id when the place has no name. */
function placeName(world, placeId) {
  const places = Array.isArray(world?.places) ? world.places : [];
  const hit = places.find((p) => p && p.id === placeId);
  return hit?.name || placeId;
}

/** Human-readable name of a place id for the world doc. */
function placeLabel(world, placeId) {
  const places = Array.isArray(world?.places) ? world.places : [];
  const hit = places.find((p) => p && p.id === placeId);
  return hit?.name ? `${hit.name} (${placeId})` : placeId;
}

/**
 * Compose the `_world.md` steering doc from a worlds/v1 `world` block. Readable
 * projection so the planted crew understands the setting (world-install-contract
 * §3.1): title/mood, places, per-role cast skin, turn model + entrypoint.
 */
function composeWorldDoc(world, teamSlug) {
  const title = world?.title || teamSlug;
  const lines = [`# ${title} — world`];

  const mood = world?.theme?.mood || world?.render?.theme;
  if (mood) lines.push(`\n_Setting: ${mood}._`);
  if (world?.thumbnail) lines.push(`\nThumbnail: \`${world.thumbnail}\``);

  const rules = world?.rules ?? {};
  const turnModel = rules.turnModel || "defer";
  const handoff = rules.handoff ? `, handoff by ${rules.handoff}` : "";
  lines.push(`\n**Turn model:** ${turnModel}${handoff}. Characters speak in the shared scene; wait for an @mention unless you are the greeter.`);
  if (rules.ambient) {
    lines.push(`\n_This world declares ambient life, but routines are NOT scheduled on install — ask to schedule them explicitly._`);
  }

  const entry = world?.entrypoint;
  if (entry?.place) {
    const greeter = entry.greeter ? ` — the **${entry.greeter}** greets first` : "";
    lines.push(`\n**Entry:** scene opens in ${placeLabel(world, entry.place)}${greeter}.`);
  }

  const places = Array.isArray(world?.places) ? world.places : [];
  if (places.length) {
    lines.push(`\n## Places`);
    for (const p of places) {
      const present = Array.isArray(p?.present) && p.present.length ? ` — present: ${p.present.join(", ")}` : "";
      const connects = Array.isArray(p?.connects) && p.connects.length ? ` — connects to ${p.connects.join(", ")}` : "";
      lines.push(`- **${p?.name ?? p?.id}** (\`${p?.id}\`)${present}${connects}`);
    }
  }

  const cast = Array.isArray(world?.cast) ? world.cast : [];
  if (cast.length) {
    lines.push(`\n## Cast`);
    for (const c of cast) {
      const parts = [`**${c?.name ?? c?.role}** plays the **${c?.role}**`];
      if (c?.home) parts.push(`home: ${placeLabel(world, c.home)}`);
      if (c?.memoryScope) parts.push(`memory: ${c.memoryScope}`);
      if (Array.isArray(c?.capabilities) && c.capabilities.length) {
        const known = c.capabilities.filter((cap) => WORLD_CAST_CAPABILITIES.has(cap));
        if (known.length) parts.push(`capabilities (advisory only): ${known.join(", ")}`);
      }
      lines.push(`- ${parts.join(" — ")}`);
      const rel = c?.relationships;
      if (rel && typeof rel === "object") {
        const relLines = Object.entries(rel).map(([who, how]) => `  - ${who}: ${how}`);
        if (relLines.length) lines.push(relLines.join("\n"));
      }
    }
  }

  lines.push(
    `\n## Safety`,
    `Cast capabilities above are advisory documentation. Each character keeps KiroCrew's deny-by-default tool allow-list (read/search/web). A world never grants \`execute_bash\` or \`fs_write\`.`,
  );

  return lines.join("\n") + "\n";
}

/**
 * Project a GAF world-pack onto a KiroCrew crew PLUS the world layer. A world is
 * a team-pack superset: the base crew is produced by gafTeamToKirocrewCrew
 * (byte-identical to a plain team install), then the `world` block adds:
 *   - a `_world.md` steering doc (places, cast skins, turn model, entrypoint);
 *   - a per-member "world skin" appended to each member's template prompt,
 *     naming the character + home and pointing at `_world.md`;
 *   - the raw worlds/v1 block carried through for `world.json`.
 *
 * Cast is keyed by `role`, matching `members[].role`. Safety: cast capabilities
 * are documentation only — the deny-by-default allow-list is never widened.
 *
 * @returns {{ ...crew, world, worldDoc }}  worldDoc = { path, content } | null
 */
export function gafWorldToKirocrewCrew(worldPack, memberPacks, opts = {}) {
  const crew = gafTeamToKirocrewCrew(worldPack, memberPacks, opts);
  const world = worldPack?.world && typeof worldPack.world === "object" ? worldPack.world : null;

  if (!world) {
    crew.notes.push("world-pack has no `world` block — planted as a plain team.");
    return { ...crew, world: null, worldDoc: null };
  }

  const worldDoc = {
    path: `.kiro/steering/farm/${crew.teamSlug}/_world.md`,
    content: composeWorldDoc(world, crew.teamSlug),
  };

  // Per-member world skin: name the character + home, point at _world.md. The
  // member keeps its own GAF persona; the world overlays its role in the scene.
  const worldDocRef = `.kiro/steering/farm/${crew.teamSlug}/_world.md`;
  for (const m of crew.members) {
    const skin = castSkinForRole(world, m.role);
    const charName = skin?.name || m.role;
    const homeLine = skin?.home
      ? ` You live in **${placeName(world, skin.home)}**.`
      : "";
    const greeter = world?.entrypoint?.greeter === m.role ? " You greet newcomers when the scene opens." : "";
    m.template.prompt +=
      `\n## In the world: ${world.title || crew.teamSlug}\n` +
      `You are **${charName}**, embodied as the **${m.role}** in this world.${homeLine}${greeter}\n` +
      `The scene, places, cast, and turn model are described in \`${worldDocRef}\`. ` +
      `Speak in character in the shared scene; wait for an @mention unless you are the greeter. ` +
      `Your tool allow-list is unchanged by the world — any capabilities the world lists are advisory only.\n`;
    // Ensure the member can read the world doc.
    if (!m.template.resources.includes(`file://${worldDocRef}`)) {
      m.template.resources.push(`file://${worldDocRef}`);
    }
  }

  return { ...crew, world, worldDoc };
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
