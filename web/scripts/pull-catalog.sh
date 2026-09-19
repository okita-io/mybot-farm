#!/usr/bin/env bash
# Pull agents/ + teams/ from okita-io/mybot-farm-catalog into public/packs.
# Used at Vercel build time so mybot-farm does not need to ship catalog blobs.
#
# Auth is the GitHub REST tarball API (Bearer), not git clone. Fine-grained PATs
# with Contents: Read often fail HTTPS git clone with
# "Write access to repository not granted" (403) even though the API works.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/public/packs"
OWNER="${CATALOG_GITHUB_OWNER:-okita-io}"
REPO="${CATALOG_GITHUB_REPO:-mybot-farm-catalog}"
BRANCH="${CATALOG_GITHUB_BRANCH:-main}"
SHA="${CATALOG_GITHUB_SHA:-}"
TOKEN="${CATALOG_GITHUB_TOKEN:-}"
API="https://api.github.com/repos/${OWNER}/${REPO}"
REF="${SHA:-$BRANCH}"

keep_committed() {
  echo "pull-catalog: $1 — keeping committed ${DEST} (env=${VERCEL_ENV:-local})"
  exit 0
}

fail_or_keep() {
  # Production must pull the live catalog. Preview/local/CI keep committed packs
  # when the token is missing or cannot read the private catalog repo.
  if [ "${VERCEL_ENV:-}" = "production" ]; then
    echo "error: $1" >&2
    echo "error: CATALOG_GITHUB_TOKEN needs Contents read on ${OWNER}/${REPO} (fine-grained PAT, resource owner ${OWNER})." >&2
    exit 1
  fi
  keep_committed "$1"
}

if [ -z "$TOKEN" ]; then
  fail_or_keep "CATALOG_GITHUB_TOKEN unset"
fi

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/mybot-farm-catalog.XXXXXX")"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

github_get() {
  local url="$1" dest="$2"
  local tmp code
  tmp="$(mktemp "${WORKDIR}/curl.XXXXXX")"
  code="$(curl -sS -L --retry 2 --retry-delay 1 \
    -A "mybot-farm-pull-catalog" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    -o "$tmp" \
    -w "%{http_code}" \
    "$url" || true)"
  if [ "$code" != "200" ]; then
    local body
    body="$(tr '\n' ' ' < "$tmp" | cut -c1-240)"
    rm -f "$tmp"
    echo "${code}|${body}"
    return 1
  fi
  mv "$tmp" "$dest"
  echo "200|"
}

echo "pull-catalog: fetching ${OWNER}/${REPO} (${REF}) → ${DEST}"

COMMIT_JSON="${WORKDIR}/commit.json"
if ! COMMIT_ERR="$(github_get "${API}/commits/${REF}" "$COMMIT_JSON")"; then
  CODE="${COMMIT_ERR%%|*}"
  BODY="${COMMIT_ERR#*|}"
  fail_or_keep "GitHub ${CODE} reading ${OWNER}/${REPO}@${REF}${BODY:+ (${BODY})}"
fi

RESOLVED="$(node -e 'const fs=require("fs"); const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); process.stdout.write(j.sha || "")' "$COMMIT_JSON")"
if [ -z "$RESOLVED" ]; then
  fail_or_keep "GitHub commit payload for ${REF} had no sha"
fi

TARBALL="${WORKDIR}/catalog.tar.gz"
if ! TAR_ERR="$(github_get "${API}/tarball/${RESOLVED}" "$TARBALL")"; then
  CODE="${TAR_ERR%%|*}"
  BODY="${TAR_ERR#*|}"
  fail_or_keep "GitHub ${CODE} downloading tarball ${OWNER}/${REPO}@${RESOLVED}${BODY:+ (${BODY})}"
fi

EXTRACT="${WORKDIR}/extract"
mkdir -p "$EXTRACT"
tar -xzf "$TARBALL" -C "$EXTRACT"
ROOTDIR="$(find "$EXTRACT" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
if [ -z "$ROOTDIR" ] || [ ! -d "${ROOTDIR}/agents" ] || [ ! -d "${ROOTDIR}/teams" ]; then
  fail_or_keep "catalog tarball missing agents/ or teams/"
fi

mkdir -p "$DEST"
# Vercel build images do not ship rsync — replace trees with cp.
rm -rf "$DEST/agents" "$DEST/teams"
cp -R "${ROOTDIR}/agents" "$DEST/agents"
cp -R "${ROOTDIR}/teams" "$DEST/teams"
find "$DEST/agents" "$DEST/teams" -name '.DS_Store' -delete 2>/dev/null || true

printf '%s\n' "$RESOLVED" > "$DEST/.catalog-sha"
AGENTS_JSON="$(find "$DEST/agents" -maxdepth 1 -name '*.json' | wc -l | tr -d ' ')"
AGENTS_TAR="$(find "$DEST/agents" -maxdepth 1 -name '*.hermes.tar.gz' | wc -l | tr -d ' ')"
TEAMS_JSON="$(find "$DEST/teams" -maxdepth 1 -name '*.json' | wc -l | tr -d ' ')"
echo "pull-catalog: ok sha=${RESOLVED} agents_json=${AGENTS_JSON} agents_tar=${AGENTS_TAR} teams_json=${TEAMS_JSON}"

trap - EXIT
cleanup
