#!/bin/sh
set -e
bun run migrate
exec bun .next/standalone/server.js
