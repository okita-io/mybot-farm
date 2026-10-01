# Team workflows spec — bundle orchestrating workflows with a team pack

**Date:** 2026-09-30
**Status:** specced, not started. System **#15** in [user-systems-backlog.md](./user-systems-backlog.md).
**One line:** Extend the existing `team` stall kind with an **optional, additive, runtime-neutral `workflows[]`** field so a team pack ships its orchestrating workflow scripts alongside its agent members — and, when planted into KiroCrew, the workflows install self-satisfyingly against the members just planted.

This is **not** a new pack kind and **not** a KiroCrew-only format. A team pack stays portable GAF JSON (`mybot.farm/team-pack`); `workflows[]` is one more optional array that empty/absent packs ignore. Only KiroCrew can *run* a KiroCrew dynamic workflow today, so a team that depends on one declares `runtime: ["kirocrew"]` — but the field itself is neutral so GrokBot/Hermes/OpenClaw can populate it with their own orchestration shapes later. This spec is the farm-side schema + card + validation + the KiroCrew plant/export path; it builds directly on the KiroCrew plugin ([kirocrew-plugin-spec.md](./kirocrew-plugin-spec.md), system #14).

---

## 1. Verified facts (grounded, not assumed)

- **A KiroCrew dynamic workflow is a self-contained Python script.** It carries a `META` dict `{name, description, phases[]}` and an `async def workflow(ctx)` that drives agents through a **sandboxed `ctx` DSL**: `ctx.agent(prompt, schema=, label=, phase=)`, `ctx.phase()`, `ctx.log()`, `ctx.args`. A crew ships **0..N** workflows. (Confirmed against the Workflows app surface — backend `kiro_crew.apps.builtins.workflows.server`, a hidden Crew app — and the `workflow_author` / `workflow_run` MCP tools.)
- **The engine lives in the gateway binary and validates before running.** A local **dry-run validation is free** (it parses `META` + the `workflow` signature and sandbox-checks the script without executing agents). This is the hook the export scrub/lint gate and the plant pre-save check both call.
- **Saved workflows live under `~/.kiro/crew/workflows/`.** Verified on this machine: the dir exists with a `.run-id.json` counter (`{"version": 1, "high_water": N}`) and a `.run-id.lock`. Scripts are plain `*.py` files in that dir. (No seed `*.py` present yet at authoring time — see **G1** for the exact filename convention gate.)
- **GAF team source shape** is `FarmPack` in [`web/src/lib/pack-files.ts`](../web/src/lib/pack-files.ts): a team adds `members[]{role, summary, pack}` + `shared{memory, gettingStarted}` + `topology`, on top of the agent fields (`profile`, `skills[]`, `memory[]`, `routines[]`, `plugins[]`). Validation is `validateGafPack` (additive, kind-agnostic) + `validateListingPack(kind, pack)` (kind-aware, team requires `format === "mybot.farm/team-pack"` and `members.length >= 2`) in [`web/src/lib/gaf-pack.ts`](../web/src/lib/gaf-pack.ts).
- **The team card** renders through `StallHeaderMeta` + `StallPackStats` in [`web/src/components/stall-meta.tsx`](../web/src/components/stall-meta.tsx), composed by [`web/src/components/stall-card.tsx`](../web/src/components/stall-card.tsx). `StallHeaderMeta` already exposes an `extra?: ReactNode` slot; `StallPackStats` sits in the card's `CardContent`. The `kirocrew` runtime badge already exists in [`web/src/lib/runtimes.ts`](../web/src/lib/runtimes.ts).
- **Prior work (committed, branch `feat/kirocrew-runtime`, PR #35):** [`packages/kirocrew-mybot-farm`](../packages/kirocrew-mybot-farm) plants GAF agent/team packs into `~/.kiro/agents/<name>.json` (+ steering under `.kiro/steering/farm/<slug>/`), binding members via `kirocrew workspace create` + `kirocrew agent create --kiro-agent <name> --workspace <ws>`. Locked decisions: **D2** skills→namespaced steering, **D3** deny-by-default tools (no `execute_bash`/`fs_write` for planted third-party agents), **D4** routines OFF by default. The scrub gate is backlog **#5** (strips machine-local paths/secrets on export). `mock-farm/` mirrors the live API.

**Still to verify in implementation cycle 1 (the two real unknowns):** the exact filename/dir convention when writing a planted workflow (`G1`), and the exact local validate mechanism to call before save (`G2`). Both are **verify-first gates** (§9) with a stated verification method; neither blocks writing the rest of the plugin.

---

## 2. Scope

**In:** an additive optional `workflows[]` on the team pack `FarmPack` type; `validateGafPack`/`validateListingPack` changes (all optional, back-compat); a gated workflow list on the team card; the KiroCrew plant path writing each script to `~/.kiro/crew/workflows/`; a local dry-run validate before save; a **mandatory** export scrub/lint gate over each script (shares #5); `runtime[]` honesty; tests + DoD.

**Out:** a new pack kind (explicitly rejected — see **W1**); production code of any kind (this is spec + backlog only); any `~/.kiro` writes during speccing; auto-*running* a planted workflow (plant installs it; the user runs it); non-KiroCrew runtime workflow shapes (the field is left neutral for them, not populated); GAF-level changes beyond the one additive array.

---

## 3. Additive schema (the contract)

Add one optional array to the team pack. Shape, matching `FarmPack` house style (optional fields, string unions, no required keys that break old packs):

```ts
// web/src/lib/pack-files.ts  (and mirrored in web/src/lib/gaf-pack.ts for validation)
export type PackWorkflow = {
  /** Stable id within the team; also the planted filename stem. [a-z0-9-]. */
  slug: string;
  /** Human name — mirrors the script's META.name. */
  name: string;
  /** One-liner — mirrors META.description. Shown on the card. */
  description: string;
  /** Optional phase labels for display; mirrors META.phases[]. */
  phases?: string[];
  /** The workflow script source (Python). The payload. */
  script: string;
  /** At most one workflow in the array marks default: true. */
  default?: boolean;
};

export type FarmPack = {
  // …existing fields…
  members?: PackMemberRef[];
  team?: unknown;
  shared?: { memory?: PackMemory[]; gettingStarted?: string };
  topology?: unknown;
  /** NEW — optional orchestrating workflows bundled with the team.
   *  Absent/empty == today's team (hard back-compat requirement). */
  workflows?: PackWorkflow[];
};
```

**House-style confirmation (don't guess):** field names mirror existing GAF arrays — `routines[]{slug,name,description,content}` and `skills[]{name,description,content}` already pair a `slug`/`name` with a body field. We use `script` (not `content`) for the body because the payload is executable source, not prose, and the distinction matters to the scrub gate (§6) and reads clearly in the card. `phases?` mirrors the workflow `META.phases[]`. If review prefers `content` for consistency with `routines[]`, that is a one-word rename with no behavioural effect — flagged, not blocking.

### 3.1 Validation changes (all optional, back-compat)

- **`validateGafPack`** (kind-agnostic, additive — [`web/src/lib/gaf-pack.ts`](../web/src/lib/gaf-pack.ts)): add a `pack.workflows !== undefined` branch mirroring the existing `routines` branch. Per entry: must be a plain object; `slug` required non-empty string; `name`, `description` required non-empty strings; `script` required non-empty string; `phases` if present an array of strings; `default` if present a boolean. **At most one** entry may set `default: true` (else `error: "at most one workflow may be default"`). Old packs that omit `workflows` still pass (the branch only runs when the key is present) — this is the hard back-compat requirement, and it's covered by a dedicated test (§8).
- **`validateListingPack`** (kind-aware): `workflows[]` is only meaningful on `kind === "team"`. For `kind === "agent"`, if `workflows` is a non-empty array, reject: `error: 'kind "agent" listings cannot include workflows[] — use kind "team"'` (mirrors the existing `members[]` guard). For `kind === "team"`, no new *required* field — an empty/absent `workflows` is a valid team exactly as today.
- **No new format string.** `format` stays `mybot.farm/team-pack`. `MIN_TEAM_MEMBERS` is unchanged.

### 3.2 `GafWorkflow` reader helper

Add `asGafWorkflows(value): GafWorkflow[]` next to `asGafRoutines` in `gaf-pack.ts` — a defensive filter (`slug` + `script` are strings) for the plant/export consumers, matching the existing `asGaf*` family.

---

## 4. The stall card (minimal diff)

Goal: when `workflows?.length`, the team card lists each workflow (name + description, default marked); when empty/absent it renders **exactly as today**. Minimal diff, gated.

### 4.1 Stats plumbing (`web/src/lib/pack-files.ts`)

`StallCardStats` / `packCardStats` already project card-safe fields. Add a `workflows` projection carrying only what the card shows (never the `script` body — the card must not ship source):

```ts
export type StallCardWorkflow = { slug: string; name: string; description: string; isDefault: boolean };
export type StallCardStats = {
  // …existing…
  workflows: StallCardWorkflow[]; // [] when absent — safe default, no card change
};
```

In `packCardStats`, map `pack.workflows ?? []` → `{ slug, name, description, isDefault: Boolean(w.default) }`. Add `workflows: stats.workflows` to `packSummaryFields` so the server→client payload carries it. `catalogStallCardStats` (consumed by `stall-card.tsx`) returns it unchanged.

### 4.2 Component (`web/src/components/stall-meta.tsx`)

Add a sibling to `StallPackStats` — a small presentational component, gated by the caller:

```tsx
export function StallWorkflows({ workflows }: { workflows: StallCardWorkflow[] }) {
  if (!workflows.length) return null; // empty => renders nothing, team looks like today
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground/80">
        {workflows.length === 1 ? "Workflow" : `${workflows.length} workflows`}
      </p>
      <ul className="space-y-1">
        {workflows.map((w) => (
          <li key={w.slug} className="text-sm text-foreground/70">
            {w.name}
            {w.isDefault ? <span className="ml-1.5 text-xs text-foreground/55">· default</span> : null}
            {w.description ? ` — ${w.description}` : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

This mirrors `StallRevisionHistory` (same file) exactly: a `if (!x.length) return null` guard, a bold label line, a `<ul>` of `text-foreground/70` rows. No new design primitives.

### 4.3 Wiring (`web/src/components/stall-card.tsx`)

One line in `CardContent`, right after `StallPackStats`:

```tsx
{stats ? (
  <StallPackStats skillCount={stats.skillCount} memoryLineCount={stats.memoryLineCount} soulLine={stats.soulLine} />
) : null}
{stats?.workflows?.length ? <StallWorkflows workflows={stats.workflows} /> : null}  {/* NEW, gated */}
<StallDates listedAt={stall.listedAt} updatedAt={stall.updatedAt} />
```

Import `StallWorkflows` alongside the existing `StallHeaderMeta, StallPackStats` import. The gate `stats?.workflows?.length` means a team with no workflows (every team today) renders byte-identically — the new node isn't emitted at all. **Alternative placement** (if review prefers the header row over the body): pass `<StallWorkflows … />` through `StallHeaderMeta`'s existing `extra?: ReactNode` slot instead; the body placement is recommended because the list is multi-line and the header row is single-line badges.

---

## 5. Plant path — write workflows into KiroCrew (the self-satisfying install)

In [`packages/kirocrew-mybot-farm`](../packages/kirocrew-mybot-farm), the team plant already (a) writes each member template to `~/.kiro/agents/<member-name>.json`, (b) binds members via `kirocrew workspace create` + `kirocrew agent create`. **Add a third step, after members are planted and bound:** for each `pack.workflows[]`, write its `script` to the KiroCrew workflows dir.

```
packages/kirocrew-mybot-farm/
  src/plant.mjs            # add plantWorkflows(pack, { dryRun, force }) called from plantTeam AFTER member binds
  src/gaf-to-kirocrew.mjs  # add workflowTargetPath(slug) + the dir convention (G1)
  src/workflow-validate.mjs# NEW — local dry-run validate before save (G2)
  tests/workflow.test.mjs  # NEW
```

- **Write target:** `~/.kiro/crew/workflows/<slug>.py` (where `<slug>` = `workflows[].slug`, re-slugified `[a-z0-9-]`). **Confirm the exact filename/dir convention before writing — gate G1.** The dir is verified to exist; the `.py` extension and bare-stem naming are the reasonable convention but are not yet proven against a saved example. Respect the `.run-id.lock` and do not hand-edit `.run-id.json` (saving via the app/MCP path, if that's the supported write, manages the counter — see **G1**).
- **Ordering is the whole point — the self-satisfying install.** The workflow script's `ctx.agent("<member-name>", …)` references resolve against the Crew Members **just planted and bound** in steps (a)/(b). Planting workflows *after* members means a freshly installed team is immediately runnable: the orchestrator script and the agents it names arrive together and already reference each other. Call this out in the plant output ("planted N members + M workflows; workflow `<default>` orchestrates them — run with `workflow_run`").
- **`force` / collision:** never overwrite an existing `~/.kiro/crew/workflows/<slug>.py` unless `force` (copy the agent-template rule from #14's D1). On `--clean` reinstall, remove the slug's planted workflow files alongside its steering dir (track them in the existing `.farm-meta.json` install marker).
- **Default pointer:** record which workflow is `default` in the plant output and the install marker; KiroCrew has no "default workflow" config key, so default is advisory (the plant message tells the user which to run first). If a crew-config default key is later confirmed, wire it — until then, advisory only (**G1** notes this).
- **Deny-by-default still applies:** a planted workflow runs through the sandboxed `ctx` DSL (no raw shell), and the members it drives already carry D3's conservative allow-list. The workflow does not widen member capabilities.

---

## 6. Validation + mandatory export scrub/lint gate

Two gates, both non-optional.

### 6.1 Local dry-run validate before save (plant side) — gate G2

Before writing each `<slug>.py`, validate the script locally so a broken workflow never lands. The engine validates pre-run; a local dry-run is free. **Mechanism to confirm (G2):** either the `workflow_author`/validate MCP path, or a Workflows-app validate endpoint, or invoking the gateway binary's workflow-validate verb. The validator parses `META` + the `async def workflow(ctx)` signature and sandbox-checks the script. On failure, the plant **skips that workflow and reports the error** (members still plant — a bad workflow does not abort the whole team). Marked **verify-first (G2)**; until confirmed, the plant does a cheap static pre-check (file parses as Python, `META` dict present with `name`/`description`, a top-level `async def workflow` exists) and flags that full engine validation is pending G2.

### 6.2 Mandatory scrub/lint gate on export (publish side) — shares #5

Publishing a team **with `workflows[]`** runs the scrub gate (**system #5**, [`scripts/scrub.py`](../scripts/scrub.py)) over **each `script`** before the listing is accepted, and **REJECTS on failure**. This is not optional and shares code with #5 — the same deterministic, stdlib-only, exit-code-`0/1/2` scrubber the agent-export path uses:

- **Strip / reject:** machine-local absolute paths (e.g. `/Users/<name>/…`, `/Applications/KiroCrew.app/…`), secrets/API keys/tokens, absolute binary paths, PII — the same `DROP_GLOBS` + field-redaction + content-scan + re-scan passes `scrub.py` already runs. A workflow script is scanned as a text blob (not an archive): the content-scan + re-scan passes apply directly.
- **Reject semantics:** a high-confidence hit in a `script` fails the publish exactly as a secret in an agent export fails it (scrub exit `1`). The listing POST returns the scrub error; the stall does not go live. This makes "scrub or don't ship" an enforced gate for workflows, not an honor-system request — the same stance #5 takes for the rest of the pack.
- **Where it runs:** in `validateListingPack`'s publish path / `listing-publish.ts` (the #5 seam), extended to iterate `workflows[]`. Seed catalog files are exempt (as today — only seller writes are gated).

---

## 7. `runtime[]` honesty

The `workflows[]` field is **runtime-neutral** (any runtime may populate it with its own orchestration shape later), but a given workflow's `script` is a KiroCrew Python workflow and only KiroCrew can run it. So:

- A team whose workflows **only** KiroCrew can execute lists `runtime: ["kirocrew"]` (optionally alongside other runtimes that can still use the *members*, e.g. `["grok-bot", "kirocrew"]` — the members plant everywhere; the orchestration runs only on KiroCrew). This is honest advertising via the existing `normalizeRuntimes` / runtime-badge path — no schema change.
- The schema does **not** hardcode KiroCrew. `PackWorkflow.script` is "the workflow source"; a future GrokBot/Hermes/OpenClaw orchestration format can reuse the same array with its own `script` dialect, gated by that runtime's own validator. We document this as the neutrality guarantee, not a TODO.
- The card (§4) shows the workflow list regardless of runtime; the *runnability* is communicated by the runtime badges already on the card, not by hiding the list.

---

## 8. Tests & Definition of Done (mirrors [kirocrew-plugin-spec.md](./kirocrew-plugin-spec.md) §8)

**Unit (farm-side, `web/`):**
- `validateGafPack` accepts a team with a valid `workflows[]`; rejects a non-array, a missing `slug`/`name`/`description`/`script`, a non-string `phases` entry, a non-boolean `default`, and **two** `default: true` entries.
- **Back-compat:** every existing seed team pack (`pair-bench`, `road-crew`, `workbench`) still passes `validateGafPack` + `validateListingPack("team", …)` unchanged (no `workflows` key).
- `validateListingPack("agent", { …, workflows: [one] })` rejects; `validateListingPack("team", { …, workflows: [] })` passes.
- `packCardStats` projects `workflows` as `{slug,name,description,isDefault}` and **never** includes `script`; empty when absent.

**Unit (plugin-side, `packages/kirocrew-mybot-farm`):**
- `workflowTargetPath("foo")` → `~/.kiro/crew/workflows/foo.py` (per G1); re-slugifies a dirty slug.
- `plantWorkflows` (dry-run) lists the target paths without writing; live plant writes them; existing file not overwritten without `force`; `--clean` removes them.
- Team plant of a fixture team with 2 members + 1 default workflow: produces 2 member templates **and** 1 workflow file, and the plant output names the default and states the members-first ordering.
- The export scrub gate rejects a `script` containing a `/Users/<name>/…` path or a fake `sk-…` token (shares #5 fixtures).

**Component (farm-side):**
- `StallWorkflows` renders nothing for `[]`; renders N rows with the default marked for N>0.
- `StallCard` snapshot for a team with no workflows is unchanged (back-compat visual).

**DoD:**
- `workflows[]` validates (additive, all-optional, back-compat proven by seed packs passing).
- The team card lists workflows with the default marked when present, and is byte-identical when absent.
- The plant writes each workflow to the confirmed dir **after** members, so a freshly planted team is immediately runnable (members resolve); dry-run shows targets without writing.
- Local dry-run validation runs before save (G2 mechanism confirmed, or the documented static pre-check with G2 flagged).
- Export of a team with workflows runs the #5 scrub over every script and rejects on a hit.
- `runtime[]` reflects KiroCrew-only runnability honestly; schema stays neutral.
- `npm test` (web) + plugin tests green; this doc + backlog + README index updated.

---

## 9. Decision gates (verify-first — do not block the spec)

- **G1 — workflow filename/dir convention: VERIFY-FIRST.** `~/.kiro/crew/workflows/` is **confirmed to exist** (with `.run-id.json` `{"version":1,"high_water":N}` + `.run-id.lock`). **Unconfirmed:** that a saved workflow is a bare `<slug>.py` in that dir vs. a subdir or an app-managed write that updates the counter/lock. **How to verify (cycle 1):** save one workflow via the Workflows app / `workflow_author` save path and inspect what lands in `~/.kiro/crew/workflows/` (filename, extension, whether `.run-id.json` changed, lock behaviour). Until then: assume `<slug>.py` bare-stem, do **not** hand-edit the counter, and prefer the app/MCP save path if it exists over a raw file write (safer against the lock). The "default" pointer is advisory until a crew-config default key is confirmed.
- **G2 — local validate mechanism: VERIFY-FIRST.** The engine validates pre-run and a local dry-run is free, but the exact callable (MCP `workflow_author`/validate vs. a Workships-app validate endpoint vs. a gateway binary verb) is unconfirmed. **How to verify (cycle 1):** probe the `workflow_author`/`workflow_run` MCP tools and the `kiro_crew.apps.builtins.workflows.server` surface for a validate-only path; confirm it returns a parse/sandbox verdict without executing agents. Until then: the static pre-check in §6.1 ships and G2 upgrades it to full engine validation.
- **W1 — new kind vs. extend `team`: RESOLVED (user decision) — EXTEND.** `workflows[]` is additive on the existing `team` kind, not a new kind. Empty/absent == today's team; must render + validate exactly as now (hard back-compat). Rationale: a team *is* the unit that owns an orchestration; a separate kind would fork the catalog, the card, and the plant path for no gain, and would break the "members + their orchestrator ship together" story. Not re-litigated.
- **W2 — `script` vs `content` body key: RESOLVED — `script`.** Executable source, not prose; the distinction is load-bearing for the scrub gate and card. A rename to `content` (for `routines[]` parity) is a no-op change if review insists — flagged, non-blocking.
- **W3 — many workflows + default pointer: RESOLVED (user decision).** Many workflows per crew; at most one `default: true`; default is marked on the card and named in the plant output. Enforced by validation (§3.1).

---

## 10. Sequencing

1. **Verify G1 + G2** (one work-session cycle) — save + validate one real workflow, lock the dir/filename convention and the validate callable.
2. **Schema + validation** (`pack-files.ts`, `gaf-pack.ts` + tests) — additive, back-compat proven by seed packs. Demonstrable, farm-side only.
3. **Card** (`stall-meta.tsx` `StallWorkflows` + one gated line in `stall-card.tsx` + stats projection) — gated, byte-identical when absent.
4. **Plant** (`plantWorkflows` after member binds, `workflowTargetPath`, workflow-validate) — the self-satisfying install.
5. **Export scrub gate** (extend the #5 seam over `workflows[]`) — shares scrub code with #5.

---

## 11. End-to-end acceptance fixture — "Storytime" children's short-story crew

The canonical test for the whole bundle: a real team pack with members **and** a workflow, planted and run, that proves the self-satisfying install (§5) end to end. Simple enough to eyeball, exercises every seam.

**The pack (`storytime`, kind `team`, `runtime: ["kirocrew"]`):**
- **Members (3):**
  - `story-lead` — Team Lead. The user-facing entry point; takes a request ("a book for my kid Paul"), invokes the workflow, returns the finished markdown path. Deny-by-default tools + `fs_write` to the output dir only (per D3 the planted default is read/search; this fixture documents the one write grant the crew needs).
  - `story-writer` — Creative writer. Drafts the story from a brief (child's name, setting).
  - `story-editor` — Editor. Checks length (400–900 words), reading age, fairy-tale tone; returns a corrected draft.
- **Workflow (1, default): `write-childrens-story`** — the orchestration `story-lead` runs:

```python
META = {
    "name": "write-childrens-story",
    "description": "Draft and edit a simplified fairy-tale short story for a child, 400-900 words, written to a markdown file.",
    "phases": ["draft", "edit", "finalize"],
}

async def workflow(ctx):
    args = ctx.args if isinstance(ctx.args, dict) else {}
    child = (args.get("child_name") or "the child").strip()
    setting = (args.get("setting") or "a simplified fairy-tale kingdom").strip()

    ctx.phase("draft")
    draft = await ctx.agent(
        f"Write a children's short story for a kid named {child}, set in {setting}. "
        f"Simplified fairy-tale tone, warm and gentle, 400-900 words. "
        f"Make {child} the hero. Return the story text only.",
        schema={"type": "object", "properties": {"title": {"type": "string"},
                "story": {"type": "string"}}, "required": ["title", "story"]},
        label="writer-draft", phase="draft", agent="story-writer")

    ctx.phase("edit")
    edited = await ctx.agent(
        "You are a children's book editor. Ensure the story is 400-900 words, "
        "age-appropriate, consistent fairy-tale tone, and keeps the child as hero. "
        "Fix and return the final version.\n\n"
        f"TITLE: {draft.get('title','')}\n\nSTORY:\n{draft.get('story','')}",
        schema={"type": "object", "properties": {"title": {"type": "string"},
                "story": {"type": "string"}, "word_count": {"type": "integer"}},
                "required": ["title", "story"]},
        label="editor-pass", phase="edit", agent="story-editor")

    ctx.phase("finalize")
    title = edited.get("title") or draft.get("title") or "A Story"
    story = edited.get("story") or draft.get("story") or ""
    md = f"# {title}\n\nFor {child}\n\n{story}\n"
    return {"title": title, "markdown": md, "word_count": edited.get("word_count")}
```

**What it proves (maps to the DoD, §8):**
- `ctx.agent(..., agent="story-writer"/"story-editor")` resolves against the just-planted members → the **self-satisfying install** (§5) is real, not theoretical.
- The pack validates as a team with a non-empty `workflows[]` (§3) and the card lists `write-childrens-story` with the default marked (§4).
- Round-trip through `mock-farm`: `farm_post` the pack (scrub gate passes — the script has no machine-local paths), `farm_plant` it into a temp `KIRO_HOME`, confirm 3 member templates + `~/.kiro/crew/workflows/write-childrens-story.py` land, then run the workflow and assert a 400–900-word markdown file is produced.
- The Team-Lead interaction model ("ask `story-lead` for a book for Paul") is the user-facing demo once G1/G2 and the plant path land.

**Why this fixture:** it's the smallest pack that is *simultaneously* a multi-member team and a workflow owner, so it's the one artifact that regression-guards the entire #15 surface — schema, card, plant ordering, and run-time member resolution — in a form a human can read end to end.

---

## Related

- [kirocrew-plugin-spec.md](./kirocrew-plugin-spec.md) — the KiroCrew plugin this extends (system #14); plant/export/scrub seams
- [user-systems-backlog.md](./user-systems-backlog.md) — parent backlog (#15)
- [teams.md](./teams.md) — team packs, topology (pair/hub/pipeline)
- [../packages/kirocrew-mybot-farm](../packages/kirocrew-mybot-farm) — the plugin package touched by §5–6
- [../scripts/scrub.py](../scripts/scrub.py) — the shared scrub engine (#5) the export gate calls
- [api-keys.md](./api-keys.md) — seller API keys, `farm_post` publish contract
