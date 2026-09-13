#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/workbench_cron.sh" standup
