#!/usr/bin/env bash
set -e

cd /workspace

mkdir -p ./.firebase-emulators/state

ensure_npm_ci() {
  local workspace="$1"
  local lockfile="$workspace/package-lock.json"
  local modules_dir="$workspace/node_modules"
  local hash_file="$modules_dir/.package-lock.sha256"
  local current_hash=""
  local previous_hash=""
  local should_install="false"

  if [ ! -d "$modules_dir" ] || [ -z "$(ls -A "$modules_dir" 2>/dev/null)" ]; then
    should_install="true"
  fi

  if [ -f "$lockfile" ]; then
    current_hash="$(sha256sum "$lockfile" | awk '{print $1}')"
    if [ -f "$hash_file" ]; then
      previous_hash="$(cat "$hash_file")"
    fi
    if [ "$current_hash" != "$previous_hash" ]; then
      should_install="true"
    fi
  fi

  if [ "$should_install" = "true" ]; then
    if [ "$workspace" = "/workspace" ]; then
      npm ci --no-audit --no-fund
    else
      npm ci --prefix "$workspace" --no-audit --no-fund
    fi

    if [ -n "$current_hash" ]; then
      mkdir -p "$modules_dir"
      echo "$current_hash" > "$hash_file"
    fi
  fi
}

ensure_npm_ci "/workspace"

if [ -d functions ]; then
  ensure_npm_ci "/workspace/functions"

  npm --prefix functions run build
fi

npm run dev -- --host 0.0.0.0 --port 5173 &
VITE_PID=$!

firebase emulators:start \
  --import ./.firebase-emulators/state \
  --export-on-exit ./.firebase-emulators/state &
EMU_PID=$!

trap 'kill -TERM "$VITE_PID" "$EMU_PID" 2>/dev/null' SIGINT SIGTERM

wait -n "$VITE_PID" "$EMU_PID"
exit $?
