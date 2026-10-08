#!/usr/bin/env bash
# Applies the real migrations to a scratch database and runs test/sql/teacher_beta.test.sql.
# Usage: PGHOST=/tmp PGPORT=54329 PGUSER=postgres test/sql/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=gias_test_$$
psql -qAt -d postgres -c "create database $DB" >/dev/null
trap 'psql -qAt -d postgres -c "drop database $DB" >/dev/null' EXIT
P="psql -q -v ON_ERROR_STOP=1 -d $DB"
$P -f test/sql/00_supabase_stub.sql
$P -f supabase/migrations/20261005_core_schema_moderation_boards.sql
$P -f supabase/migrations/20261008000000_teacher_beta.sql
$P -f supabase/migrations/20261008010000_teacher_beta_v2.sql
$P -f supabase/migrations/20261008020000_teacher_beta_v3.sql
$P -f supabase/migrations/20261008030000_teacher_signup.sql
$P -f test/sql/teacher_beta.test.sql
