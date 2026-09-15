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
    PROMPT="Cron: workbench-standup. Do your morning standup now. Protocol: $WS/TEAM.md. Live board = kanban board workbench (kanban_list board=workbench + kanban_show for detail). Also read $WS/WORK.md backlog notes + the last 3 days of $WS/reports/. Promote any user-seeded backlog notes in WORK.md to kanban Build tasks (assignee workbench-scaffold, body with story/accept/out). Write $WS/reports/standup-$DATE.md (<=15 lines: shipped, stuck, today's top 2-3 tasks). Then DM @workbench-scaffold with today's priorities (task ids + why) and @workbench-smoke with the QA watch-list. If nothing changed since yesterday's standup and there are no backlog notes, write the report and send NO DMs. Keep DMs to one short message each."
    ;;
  qa-sweep)
    PROFILE="workbench-smoke"
    SESSION="qa-sweep-$DATE"
    PROMPT="Cron: workbench-qa-sweep. Process the QA queue now. Protocol: $WS/TEAM.md. Live board = kanban board workbench — queue = kanban_list board=workbench assignee=workbench-smoke status=ready (QA tasks). For each QA task: kanban_show it, run the app per its body, independently run every accept check + a quick dogfood pass, write evidence into $WS/reports/qa-$DATE.md, attach evidence (kanban_attach). All pass -> kanban_complete the QA task verdict PASS + DM Shipped. Any fail -> kanban_complete verdict FAIL with repro + create the rework task (assignee workbench-scaffold, parent = this QA task, body = repro/evidence) + DM the bounce. If the queue is empty, append one line to the report and send NO DMs. Never edit app code — you gate, you don't fix."
    ;;
  harvest)
    PROFILE="workbench-smoke"
    SESSION="harvest-$DATE"
    PROMPT="Cron: workbench-harvest. End-of-day board health. Protocol: $WS/TEAM.md. Live board = kanban board workbench. 1) Reconcile orphans: any completed Build/rework task with no QA task and no rework task pointing at it -> DM @workbench-scaffold to create the missing QA task (never ship around the gate). 2) Flag any task stuck >24h in a state its owner does not control. 3) Bounce >2x or stuck >48h -> escalate: kanban_block needs_input + DM the user with the report chain. 4) Mirror the day's shipped cards (QA verdict PASS) into the Shipped table in $WS/WORK.md. Append a short board-health summary to $WS/reports/qa-$DATE.md and DM @workbench-spec that summary (one message). If everything is healthy, one report line and no DMs."
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
