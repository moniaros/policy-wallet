#!/usr/bin/env bash
# Local PostgreSQL for verification work that needs a real database.
#
# Written because "we have no database here" was assumed for a long time and
# turned out to be false: postgresql-16 is present in the dev image, it just
# needs a cluster. Migrations, `prisma db seed`, and any check that goes through
# Prisma can all run against this — which is the difference between a change
# that passes its mocked tests and one shown to work.
#
# NOT for application data. The cluster lives under the postgres user's home,
# listens on 5433 to stay out of the way of anything on 5432, and is disposable.
#
#   ./scripts/dev-postgres.sh start     # initdb (first run) + start + createdb
#   ./scripts/dev-postgres.sh stop
#   ./scripts/dev-postgres.sh reset     # drop and recreate the database
#   ./scripts/dev-postgres.sh url       # print the DATABASE_URL to export
#
# Then:
#   export DATABASE_URL="$(./scripts/dev-postgres.sh url)"
#   export DIRECT_URL="$DATABASE_URL"
#   npx prisma migrate deploy && npx prisma db seed
set -euo pipefail

PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PGDATA=${PGDATA:-/var/lib/postgresql/pwdata}
PGPORT=${PGPORT:-5433}
PGDB=${PGDB:-policywallet}
URL="postgresql://postgres@127.0.0.1:${PGPORT}/${PGDB}"

# initdb refuses to run as root, and the postgres user cannot read a data
# directory owned by root — hence the su, and hence PGDATA living somewhere the
# postgres user actually owns rather than in a scratch directory.
as_postgres() { su postgres -c "$1"; }

case "${1:-start}" in
    start)
        if [ ! -s "$PGDATA/PG_VERSION" ]; then
            mkdir -p "$PGDATA"
            chown postgres:postgres "$PGDATA"
            as_postgres "$PGBIN/initdb -D $PGDATA -U postgres --auth=trust" >/dev/null
            echo "initialised cluster at $PGDATA"
        fi
        if ! pg_isready -h 127.0.0.1 -p "$PGPORT" >/dev/null 2>&1; then
            as_postgres "$PGBIN/pg_ctl -D $PGDATA -l $PGDATA/server.log -o '-p $PGPORT' start" >/dev/null
            sleep 2
        fi
        psql -h 127.0.0.1 -p "$PGPORT" -U postgres -tAc \
            "SELECT 1 FROM pg_database WHERE datname='$PGDB'" | grep -q 1 \
            || createdb -h 127.0.0.1 -p "$PGPORT" -U postgres "$PGDB"
        echo "ready: $URL"
        ;;
    stop)
        as_postgres "$PGBIN/pg_ctl -D $PGDATA stop" >/dev/null 2>&1 || true
        echo "stopped"
        ;;
    reset)
        dropdb -h 127.0.0.1 -p "$PGPORT" -U postgres --if-exists "$PGDB"
        createdb -h 127.0.0.1 -p "$PGPORT" -U postgres "$PGDB"
        echo "recreated $PGDB — run prisma migrate deploy next"
        ;;
    url)
        echo "$URL"
        ;;
    *)
        echo "usage: $0 {start|stop|reset|url}" >&2
        exit 1
        ;;
esac
