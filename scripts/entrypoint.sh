#!/bin/sh
set -e
bun run migrate
exec node .next/standalone/server.js
