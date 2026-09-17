#!/usr/bin/env bash
# Pull agents/ + teams/ from okita-io/mybot-farm-catalog into public/packs.
# Used at Vercel build time so mybot-farm does not need to ship catalog blobs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/public/packs"
OWNER="${CATALOG_GITHUB_OWNER:-okita-io}"
REPO="${CATALOG_GITHUB_REPO:-mybot-farm-catalog}"
BRANCH="${CATALOG_GITHUB_BRANCH:-main}"
SHA="${CATALOG_GITHUB_SHA:-}"
TOKEN="${CATALOG_GITHUB_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  if [ "${VERCEL:-}" = "1" ] || [ "${CI:-}" = "true" ]; then
    echo "error: CATALOG_GITHUB_TOKEN is required on Vercel/CI to pull ${OWNER}/${REPO}" >&2
    exit 1
  fi
  echo "pull-catalog: CATALOG_GITHUB_TOKEN unset — keeping committed ${DEST}"
  exit 0
fi

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/mybot-farm-catalog.XXXXXX")"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

ASKPASS="$(mktemp)"
chmod 700 "$ASKPASS"
cat > "$ASKPASS" <<'EOF'
#!/bin/sh
case "$1" in
  *Username*) printf '%s\n' "x-access-token" ;;
  *) printf '%s\n' "$CATALOG_PUSH_TOKEN" ;;
esac
EOF
export CATALOG_PUSH_TOKEN="$TOKEN"
export GIT_ASKPASS="$ASKPASS"
export GIT_TERMINAL_PROMPT=0

CLONE_URL="https://github.com/${OWNER}/${REPO}.git"
echo "pull-catalog: cloning ${OWNER}/${REPO} (${SHA:-$BRANCH}) → ${DEST}"

git clone --filter=blob:none --sparse --depth 1 --branch "$BRANCH" "$CLONE_URL" "$WORKDIR/repo"
cd "$WORKDIR/repo"
git sparse-checkout set agents teams

if [ -n "$SHA" ]; then
  git fetch --depth 1 origin "$SHA"
  git checkout --detach "$SHA"
fi

RESOLVED="$(git rev-parse HEAD)"
mkdir -p "$DEST"
# Vercel build images do not ship rsync — replace trees with cp.
rm -rf "$DEST/agents" "$DEST/teams"
cp -R "$WORKDIR/repo/agents" "$DEST/agents"
cp -R "$WORKDIR/repo/teams" "$DEST/teams"
find "$DEST/agents" "$DEST/teams" -name '.DS_Store' -delete 2>/dev/null || true

printf '%s\n' "$RESOLVED" > "$DEST/.catalog-sha"
AGENTS_JSON="$(find "$DEST/agents" -maxdepth 1 -name '*.json' | wc -l | tr -d ' ')"
AGENTS_TAR="$(find "$DEST/agents" -maxdepth 1 -name '*.hermes.tar.gz' | wc -l | tr -d ' ')"
TEAMS_JSON="$(find "$DEST/teams" -maxdepth 1 -name '*.json' | wc -l | tr -d ' ')"
echo "pull-catalog: ok sha=${RESOLVED} agents_json=${AGENTS_JSON} agents_tar=${AGENTS_TAR} teams_json=${TEAMS_JSON}"

unset CATALOG_PUSH_TOKEN
rm -f "$ASKPASS"
trap - EXIT
cleanup
