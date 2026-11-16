#!/bin/sh
# Container entrypoint: initialise the database schema, then start Next.js.
#
# DB_INIT controls the schema step:
#   auto    (default) -> `prisma migrate deploy` if prisma/migrations exists,
#                        otherwise `prisma db push --skip-generate`
#   migrate           -> always `prisma migrate deploy`
#   push              -> always `prisma db push --skip-generate`
#   none              -> skip (manage the schema yourself)
set -e

cd "$(dirname "$0")"
mkdir -p logs

PRISMA="node_modules/.bin/prisma"
DB_INIT="${DB_INIT:-auto}"

if [ "$DB_INIT" = "auto" ]; then
  if [ -d prisma/migrations ] && ls prisma/migrations/*/migration.sql >/dev/null 2>&1; then
    DB_INIT=migrate
  else
    DB_INIT=push
  fi
fi

if [ -z "$DATABASE_URL" ] && [ "$DB_INIT" != "none" ]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

case "$DB_INIT" in
  migrate)
    echo "Running prisma migrate deploy..."
    "$PRISMA" migrate deploy
    ;;
  push)
    echo "Running prisma db push..."
    "$PRISMA" db push --skip-generate
    ;;
  none)
    echo "Skipping database schema step (DB_INIT=none)"
    ;;
  *)
    echo "ERROR: unknown DB_INIT value '$DB_INIT' (use auto|migrate|push|none)" >&2
    exit 1
    ;;
esac

PORT="${PORT:-3000}"
echo "Starting Next.js on 0.0.0.0:${PORT}"
exec node_modules/.bin/next start -H 0.0.0.0 -p "$PORT"
