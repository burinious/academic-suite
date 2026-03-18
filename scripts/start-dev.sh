#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_ENV_FILE="$BACKEND_DIR/.env"
BACKEND_LOG="$ROOT_DIR/backend.dev.log"
FRONTEND_LOG="$ROOT_DIR/frontend.dev.log"

load_backend_env() {
  if [[ ! -f "$BACKEND_ENV_FILE" ]]; then
    return
  fi

  while IFS= read -r raw_line || [[ -n "$raw_line" ]]; do
    line="${raw_line%$'\r'}"

    if [[ -z "${line// }" || "$line" =~ ^[[:space:]]*# ]]; then
      continue
    fi

    key="${line%%=*}"
    value="${line#*=}"
    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
      value="${value:1:-1}"
    fi

    export "$key=$value"
  done < "$BACKEND_ENV_FILE"
}

load_backend_env

echo "Starting backend..."
(
  cd "$BACKEND_DIR"
  nohup python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 >"$BACKEND_LOG" 2>&1 &
) >/dev/null 2>&1

sleep 2

echo "Starting frontend..."
(
  cd "$FRONTEND_DIR"
  nohup npm.cmd run dev >"$FRONTEND_LOG" 2>&1 &
) >/dev/null 2>&1

sleep 2

echo
echo "Academic Data Processing Suite launch started."
echo "Backend:  http://127.0.0.1:8000"
echo "Frontend: http://127.0.0.1:5173"
echo
echo "Logs:"
echo "  $BACKEND_LOG"
echo "  $FRONTEND_LOG"
