#!/usr/bin/env bash
# Full-stack UI test. Needs: local Postgres (PGHOST/PGPORT/PGUSER), deno (DENO=...), node, Playwright in /opt/npm-tools, vite deps installed.
set -euo pipefail
cd "$(dirname "$0")/../.."
DENO=${DENO:-deno}
export GIAS_PGDB=gias_ui_$$
psql -qAt -d postgres -c "create database $GIAS_PGDB" >/dev/null
P="psql -q -v ON_ERROR_STOP=1 -d $GIAS_PGDB"
$P -f test/sql/00_supabase_stub.sql; $P -f supabase/migrations/20261005_core_schema_moderation_boards.sql; $P -f supabase/migrations/20261008000000_teacher_beta.sql
$P -f supabase/migrations/20261008010000_teacher_beta_v2.sql
$P -f supabase/migrations/20261008020000_teacher_beta_v3.sql
$P -f supabase/migrations/20261008030000_teacher_signup.sql
$P -f supabase/migrations/20261009000000_owner_dashboard.sql
$P -f supabase/migrations/20261009010000_unit_focus_quiz.sql
export SUPABASE_URL=http://mock SUPABASE_SERVICE_ROLE_KEY=mock IP_HASH_SALT=ui-test DENO_SERVE_ADDRESS=tcp:127.0.0.1:8787
$DENO run -A --import-map=test/edge/import_map.json supabase/functions/classroom/index.ts >/tmp/gias_ui_edge_$$.log 2>&1 & EDGE=$!
npx vite --port 4174 --strictPort >/tmp/gias_ui_vite_$$.log 2>&1 & VITE=$!
cleanup() { kill $EDGE $VITE 2>/dev/null || true; psql -qAt -d postgres -c "drop database $GIAS_PGDB" >/dev/null 2>&1 || true; }
trap cleanup EXIT
for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:4174 && curl -s -o /dev/null http://127.0.0.1:8787 && break; sleep 0.3; done
node test/ui/classroom-ui.mjs || { echo '--- edge log ---'; tail -15 /tmp/gias_ui_edge_$$.log; echo '--- vite log ---'; tail -10 /tmp/gias_ui_vite_$$.log; exit 1; }
