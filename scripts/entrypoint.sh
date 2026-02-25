#!/bin/sh
set -e

echo "Running database migrations..."
bun run src/lib/db/migrate.ts
echo "Migrations complete."

exec bun /app/server.js
