#!/usr/bin/env bash
# Runs the real classroom edge function (Deno) against a scratch Postgres with the real migrations, then drives it over HTTP.
# Needs: a running local Postgres (PGHOST/PGPORT/PGUSER set), deno on PATH (or DENO=/path/to/deno), node.
set -euo pipefail
cd "$(dirname "$0")/../.."
DENO=${DENO:-deno}
export GIAS_PGDB=gias_edge_$$
psql -qAt -d postgres -c "create database $GIAS_PGDB" >/dev/null
P="psql -q -v ON_ERROR_STOP=1 -d $GIAS_PGDB"
$P -f test/sql/00_supabase_stub.sql; $P -f supabase/migrations/20261005_core_schema_moderation_boards.sql; $P -f supabase/migrations/20261008000000_teacher_beta.sql
$P -f supabase/migrations/20261008010000_teacher_beta_v2.sql
$P -f supabase/migrations/20261008020000_teacher_beta_v3.sql
$P -f supabase/migrations/20261008030000_teacher_signup.sql
$P -f supabase/migrations/20261009000000_owner_dashboard.sql
$P -f supabase/migrations/20261009010000_unit_focus_quiz.sql
$P -f supabase/migrations/20261009020000_beta_fixes_1009.sql
export SUPABASE_URL=http://mock SUPABASE_SERVICE_ROLE_KEY=mock IP_HASH_SALT=test-salt DENO_SERVE_ADDRESS=tcp:127.0.0.1:8787
$DENO run -A --import-map=test/edge/import_map.json supabase/functions/classroom/index.ts >/tmp/gias_edge_$$.log 2>&1 &
PID=$!
cleanup() { kill $PID 2>/dev/null || true; psql -qAt -d postgres -c "drop database $GIAS_PGDB" >/dev/null 2>&1 || true; }
trap cleanup EXIT
for i in $(seq 1 50); do curl -s -o /dev/null http://127.0.0.1:8787 && break; sleep 0.2; done
node test/edge/e2e.mjs || { echo '--- function log ---'; tail -20 /tmp/gias_edge_$$.log; exit 1; }
