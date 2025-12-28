#!/usr/bin/env bash
set -euo pipefail

# Safe deploy script for the portal UI (rsync -> NAS) and restart nginx container
# Usage: ./scripts/deploy-ui.sh --host nas.example.com --user deploy --path /path/to/project [--no-build] [--yes] [--ssh-key /path/to/key]

print_usage() {
  cat <<EOF
Usage: $0 --host HOST --user USER --path PATH [--no-build] [--yes] [--ssh-key KEY] [--port PORT]

Options:
  --host HOST       Remote NAS hostname or IP (required)
  --user USER       SSH user (required)
  --path PATH       Project path on NAS (required; rsync will write into PATH/dist)
  --no-build        Skip local "npm run build" (assume ./dist is already built)
  --ssh-key PATH    SSH private key to use for rsync/ssh
  --port PORT       SSH port (default: 22)
  --yes             Non-interactive, proceed without confirmation
  --dry-run         Show actions but do not run rsync or restart
EOF
}

NO_BUILD=0
YES=0
DRY_RUN=0
SSH_KEY=""
SSH_PORT=22

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) NAS_HOST="$2"; shift 2;;
    --user) NAS_USER="$2"; shift 2;;
    --path) NAS_PATH="$2"; shift 2;;
    --no-build) NO_BUILD=1; shift;;
    --ssh-key) SSH_KEY="$2"; shift 2;;
    --port) SSH_PORT="$2"; shift 2;;
    --yes) YES=1; shift;;
    --dry-run) DRY_RUN=1; shift;;
    -h|--help) print_usage; exit 0;;
    *) echo "Unknown arg: $1"; print_usage; exit 1;;
  esac
done

if [[ -z "${NAS_HOST:-}" || -z "${NAS_USER:-}" || -z "${NAS_PATH:-}" ]]; then
  echo "ERROR: --host, --user and --path are required" >&2
  print_usage
  exit 2
fi

if [[ $NO_BUILD -eq 0 ]]; then
  echo "Building portal UI (npm ci && npm run build)"
  npm ci
  npm run build
else
  echo "Skipping build (--no-build)"
fi

RSYNC_CMD=( rsync -av --delete ./dist/ "${NAS_USER}@${NAS_HOST}:${NAS_PATH}/dist/" )

echo "Planned actions:"
echo " - Rsync ./dist/ -> ${NAS_USER}@${NAS_HOST}:${NAS_PATH}/dist/"
echo " - chmod -R a+rX ${NAS_PATH}/dist"
echo " - docker compose restart web (on NAS)"

if [[ $DRY_RUN -eq 1 ]]; then
  echo "Dry run enabled; not performing actions."
  echo "RSYNC: ${RSYNC_CMD[*]}"
  exit 0
fi

if [[ $YES -ne 1 ]]; then
  read -p "Proceed with deployment? [y/N] " yn
  if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
    echo "Aborted"
    exit 0
  fi
fi

# Execute rsync
"${RSYNC_CMD[@]}"

# Set permissions and restart web on NAS
ssh -p "$SSH_PORT" ${SSH_KEY:+-i "$SSH_KEY"} "${NAS_USER}@${NAS_HOST}" "chmod -R a+rX '${NAS_PATH}/dist'"
ssh -p "$SSH_PORT" ${SSH_KEY:+-i "$SSH_KEY"} "${NAS_USER}@${NAS_HOST}" "cd '${NAS_PATH}' && docker compose restart web"

echo "Done. Hard-refresh browser (Cmd/Ctrl+Shift+R) to clear caches or service worker."