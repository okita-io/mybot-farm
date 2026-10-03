import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { writeSpriteSheet } from "./io.ts";
import { knownShapes } from "./masks.ts";

export function usage(): string {
  return `Usage:
  agent-sprites generate --role ROLE [--color COLOR] [--shape SHAPE] [--out DIR]
  agent-sprites generate ROLE [--color COLOR] [--shape SHAPE] [--out DIR]

Role is the RNG seed. Color and shape map profile.avatar.color / profile.avatar.shape
onto the palette and silhouette.

Writes:
  <out>/<role>.sheet.png
  <out>/<role>.sheet.json

Default --out is ./assets. Shapes: ${knownShapes().join(", ")}.
`;
}

export async function run(argv: string[]): Promise<number> {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    process.stdout.write(usage());
    return args.length === 0 ? 1 : 0;
  }

  const command = args[0] === "generate" ? "generate" : null;
  const rest = command ? args.slice(1) : args;
  if (!command && rest[0]?.startsWith("-")) {
    process.stderr.write(usage());
    return 1;
  }

  const { values, positionals } = parseArgs({
    args: rest,
    options: {
      role: { type: "string" },
      color: { type: "string" },
      shape: { type: "string" },
      out: { type: "string", default: "assets" },
    },
    allowPositionals: true,
  });

  const role = (values.role ?? positionals[0] ?? "").trim();
  if (!role) {
    process.stderr.write("error: --role is required\n\n");
    process.stderr.write(usage());
    return 1;
  }

  const written = await writeSpriteSheet(
    { role, color: values.color, shape: values.shape },
    values.out ?? "assets",
  );
  process.stdout.write(`${written.pngPath}\n${written.jsonPath}\n`);
  return 0;
}

function isMain(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isMain()) {
  run(process.argv).then((code) => {
    process.exitCode = code;
  });
}
