#!/usr/bin/env bash
set -euo pipefail

# Deploy Portal API on remote NAS (recommended to build on NAS)
# Usage: ./scripts/deploy-api.sh --host nas --user deploy --path /path/to/project [--no-pull] [--image tag] [--yes]

print_usage() {
  cat <<EOF
Usage: $0 --host HOST --user USER --path PATH [--no-pull] [--image IMAGE] [--yes] [--ssh-key KEY] [--port PORT]

Options:
  --host HOST       Remote NAS hostname or IP (required)
  --user USER       SSH user (required)
  --path PATH       Project path on NAS (required)
  --no-pull         Do not run git pull on the NAS before building
  --image IMAGE     Use pre-built image (pull and deploy) instead of building on NAS
  --ssh-key PATH    SSH private key to use
  --port PORT       SSH port (default: 22)
  --yes             Non-interactive (skip confirmation)
EOF
}

NO_PULL=0
YES=0
IMAGE=""
SSH_KEY=""
SSH_PORT=22

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) NAS_HOST="$2"; shift 2;;
    --user) NAS_USER="$2"; shift 2;;
    --path) NAS_PATH="$2"; shift 2;;
    --no-pull) NO_PULL=1; shift;;
    --image) IMAGE="$2"; shift 2;;
    --ssh-key) SSH_KEY="$2"; shift 2;;
    --port) SSH_PORT="$2"; shift 2;;
    --yes) YES=1; shift;;
    -h|--help) print_usage; exit 0;;
    *) echo "Unknown arg: $1"; print_usage; exit 1;;
  esac
done

if [[ -z "${NAS_HOST:-}" || -z "${NAS_USER:-}" || -z "${NAS_PATH:-}" ]]; then
  echo "ERROR: --host, --user and --path are required" >&2
  print_usage
  exit 2
fi

if [[ $YES -ne 1 ]]; then
  read -p "Proceed to deploy API on ${NAS_HOST}? [y/N] " yn
  if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
    echo "Aborted"
    exit 0
  fi
fi

SSH_PREFIX=( ssh -p "$SSH_PORT" ${SSH_KEY:+-i "$SSH_KEY"} "${NAS_USER}@${NAS_HOST}" )

if [[ -n "$IMAGE" ]]; then
  echo "Pulling image $IMAGE on remote host and restarting API service"
  "${SSH_PREFIX[@]}" "docker pull $IMAGE || true && cd '$NAS_PATH' && docker compose up -d --no-deps api"
  echo "Done."
  exit 0
fi

if [[ $NO_PULL -eq 0 ]]; then
  echo "Pulling latest code on NAS"
  "${SSH_PREFIX[@]}" "cd '$NAS_PATH' && git pull"
fi

echo "Building API on NAS (docker compose build api)"
"${SSH_PREFIX[@]}" "cd '$NAS_PATH' && docker compose build api"

echo "Starting API service"
"${SSH_PREFIX[@]}" "cd '$NAS_PATH' && docker compose up -d --no-deps --build api"

echo "Done. Tail the logs to verify: docker compose logs -f api"