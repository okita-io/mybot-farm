# Fixtures

Test and development JSON matching what **farm_plant** writes under
`$HERMES_HOME/worlds/neon-harbor/` (and the planned `state.json` seed).

| File | Mirrors on-disk path | Source |
|------|----------------------|--------|
| `neon-harbor-world.json` | `worlds/neon-harbor/world.json` | `world` block from mybot.farm `neon-harbor` world-pack |
| `neon-harbor-state.json` | `worlds/neon-harbor/state.json` | Expected seed after farm plant (not written yet) |

Canonical catalog pack (full `mybot.farm/world-pack` with `members[]`):

`~/git_repos/mybot-farm/web/public/packs/worlds/neon-harbor.json`

## Local smoke test

Copy fixtures into a fake Hermes home:

```bash
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
mkdir -p "$HERMES_HOME/worlds/neon-harbor"
cp fixtures/neon-harbor-world.json "$HERMES_HOME/worlds/neon-harbor/world.json"
cp fixtures/neon-harbor-state.json "$HERMES_HOME/worlds/neon-harbor/state.json"
```

Cast profiles (`Patch`, `Probe`) still require a real `farm_plant` or profile import.
