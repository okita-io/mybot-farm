#!/bin/bash
# workbench_cron.sh — heartbeat runner for the Workbench 3-agent team.
# Usage: workbench_cron.sh <job>   job: standup | qa-sweep | harvest
#
# Each run wakes the owning profile in a FRESH date-stamped session (never a
# long-lived shared session — that's how context bloat happens), in the shared
# team workspace, and delivers nothing unless the agent sends a DM.
set -euo pipefail

JOB="${1:?usage: workbench_cron.sh <standup|qa-sweep|harvest>}"
WS="$HOME/.hermes/teams/workbench"
DATE="$(date +%F)"

case "$JOB" in
  standup)
    PROFILE="workbench-spec"
    SESSION="standup-$DATE"
    PROMPT="Cron: workbench-standup. Do your morning standup now: read $WS/WORK.md and the last 3 days of $WS/reports/. Write $WS/reports/standup-$DATE.md (<=15 lines: shipped, stuck, today's top 2-3 Ready cards). Then DM @workbench-scaffold with today's priorities (card ids + why) and @workbench-smoke with the QA watch-list. If the board is empty or nothing changed since yesterday's standup, write the report and send NO DMs. Keep DMs to one short message each."
    ;;
  qa-sweep)
    PROFILE="workbench-smoke"
    SESSION="qa-sweep-$DATE"
    PROMPT="Cron: workbench-qa-sweep. Process the QA queue now: in $WS/WORK.md find all cards in Ready-for-QA (and Needs-Fix for regression re-checks). For each: run the app per its notes, run every accept check + a quick dogfood pass, write evidence into $WS/reports/qa-$DATE.md, then move the card to Shipped (under ## Done) or back to Needs-Fix with a repro in notes. DM @workbench-scaffold and @workbench-spec one short message per verdict. If the queue is empty, append one line to the report and send NO DMs. Never edit app code — you gate, you don't fix."
    ;;
  harvest)
    PROFILE="workbench-smoke"
    SESSION="harvest-$DATE"
    PROMPT="Cron: workbench-harvest. End-of-day board health: read $WS/WORK.md. Flag any card stuck >24h in a state its owner does not control; make sure Shipped cards are under ## Done; if a card bounced Smoke<->Scaffold more than twice or sits Needs-Fix >48h, escalate to the user with the report chain. Append a short board-health summary to $WS/reports/qa-$DATE.md and DM @workbench-spec that summary (one message). If everything is healthy, one report line and no DMs."
    ;;
  *) echo "unknown job: $JOB" >&2; exit 2 ;;
esac

cd "$WS"
# Agent runs can exceed the cron engine's flat script timeout (deep QA sweeps
# legitimately take hours). Detach: start the agent, record it in the report,
# exit immediately. The agent's work lands in the board + reports regardless.
SESSION="${SESSION}-$RANDOM"
nohup hermes -p "$PROFILE" chat -q "$PROMPT" --continue "$SESSION" --create-if-missing -Q \
  >> "$WS/reports/cron-$JOB.log" 2>&1 &
echo "workbench $JOB: agent detached (pid $!), log at reports/cron-$JOB.log"
