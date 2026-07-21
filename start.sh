#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$ROOT/.env" ]] || { echo "Missing .env; copy .env.example." >&2; exit 1; }
frontend_port="${FRONTEND_PORT:-5173}"
export CORS_ORIGINS="${CORS_ORIGINS:-http://127.0.0.1:$frontend_port}"
if [[ "${NODE_ENV:-}" == "test" && -z "${DOCUMENT_ENCRYPTION_KEY:-}" ]]; then
  export DOCUMENT_ENCRYPTION_KEY="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
fi
case "${1:-backend}" in backend) cd "$ROOT/backend"; exec npm start;; frontend) cd "$ROOT/frontend"; exec npm run dev;; *) echo "Usage: $0 [backend|frontend]" >&2; exit 64;; esac
