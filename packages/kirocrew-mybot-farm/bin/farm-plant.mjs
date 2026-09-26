#!/usr/bin/env node
// farm-plant — CLI for the KiroCrew mybot.farm plugin. No agent loop.
//
//   farm-plant search [query] [--kind agent|team]
//   farm-plant get <slug>                         # download the GAF pack (json)
//   farm-plant plant <slug> [--name N] [--force] [--dry-run]
//   farm-plant post --kind K --name N --title T --description D --category C \
//                   --price-cents 0 --pack ./file.json [--slug S] [--dry-run]
//
// Env: MYBOT_FARM_URL, MYBOT_FARM_API_KEY, KIRO_HOME.

import { readFile } from "node:fs/promises";
import { searchStalls, getPack, postListing, farmBase, farmKey } from "../src/farm-api.mjs";
import { plantAgent, kiroHome } from "../src/plant.mjs";
import { kirocrewAgentToGaf } from "../src/gaf-to-kirocrew.mjs";

function parseArgs(argv) {
  const pos = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) { flags[key] = true; }
      else { flags[key] = next; i++; }
    } else pos.push(a);
  }
  return { pos, flags };
}

function out(obj) { console.log(JSON.stringify(obj, null, 2)); }
function die(msg, code = 1) { console.error(`error: ${msg}`); process.exit(code); }

const [cmd, ...rest] = process.argv.slice(2);
const { pos, flags } = parseArgs(rest);

switch (cmd) {
  case "search": {
    const { status, body } = await searchStalls(pos[0], flags.kind);
    if (status !== 200) die(`search failed (${status})`);
    out({ count: body.count, stalls: body.stalls.map((s) => ({ slug: s.slug, kind: s.kind, name: s.name, title: s.title })) });
    break;
  }
  case "get": {
    if (!pos[0]) die("usage: farm-plant get <slug>");
    const { status, body } = await getPack(pos[0]);
    if (status === 402) die("pack is paid (402) — purchase/MPP not supported in this CLI");
    if (status !== 200) die(`get failed (${status})`);
    out(body);
    break;
  }
  case "plant": {
    if (!pos[0]) die("usage: farm-plant plant <slug>");
    const { status, body } = await getPack(pos[0]);
    if (status === 402) die("pack is paid (402)");
    if (status !== 200) die(`could not fetch pack (${status})`);
    if (body.format === "mybot.farm/team-pack") die("team packs: plant members individually for now (team crew mapping is next)");
    const plan = await plantAgent(body, { name: flags.name, force: Boolean(flags.force), dryRun: Boolean(flags["dry-run"]) });
    out({
      action: flags["dry-run"] ? "dry-run" : plan.wrote ? "planted" : plan.skippedExisting ? "skipped-existing" : "noop",
      kiroHome: kiroHome(),
      name: plan.name, agentPath: plan.agentPath, steeringPaths: plan.steeringPaths,
      withheldTools: plan.withheldTools, notes: plan.notes,
    });
    break;
  }
  case "post": {
    if (!flags.pack) die("usage: farm-plant post --pack ./file.json --kind ... --name ... etc");
    const pack = JSON.parse(await readFile(flags.pack, "utf8"));
    const body = {
      kind: flags.kind ?? "agent",
      name: flags.name, title: flags.title, description: flags.description,
      category: flags.category, priceCents: Number(flags["price-cents"] ?? 0),
      pack, ...(flags.slug ? { slug: flags.slug } : {}),
    };
    if (flags["dry-run"]) { out({ action: "dry-run", target: farmBase(), keyed: Boolean(farmKey()), body: { ...body, pack: "<omitted>" } }); break; }
    const { status, body: resp } = await postListing(body);
    if (status !== 200 && status !== 201) die(`post failed (${status}): ${JSON.stringify(resp)}`);
    out({ action: resp.created ? "created" : "updated", ...resp });
    break;
  }
  default:
    die(`unknown command "${cmd ?? ""}". commands: search | get | plant | post`);
}
