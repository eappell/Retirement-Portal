#!/usr/bin/env bash
set -euo pipefail

# Deploy portal (build on NAS and run via docker-compose.portal.yml)
# Usage: ./scripts/deploy-portal.sh --host nas --user deploy --path /path/to/project [--no-pull] [--yes]

print_usage() {
  cat <<EOF
Usage: $0 --host HOST --user USER --path PATH [--no-pull] [--yes] [--ssh-key KEY] [--port PORT]

Options:
  --host HOST       Remote NAS hostname or IP (required)
  --user USER       SSH user (required)
  --path PATH       Project path on NAS (required)
  --no-pull         Skip git pull on NAS
  --ssh-key PATH    SSH private key to use
  --port PORT       SSH port (default: 22)
  --yes             Non-interactive
EOF
}

NO_PULL=0
YES=0
SSH_KEY=""
SSH_PORT=22

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) NAS_HOST="$2"; shift 2;;
    --user) NAS_USER="$2"; shift 2;;
    --path) NAS_PATH="$2"; shift 2;;
    --no-pull) NO_PULL=1; shift;;
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
  read -p "Proceed to build & deploy portal on ${NAS_HOST}? [y/N] " yn
  if [[ "$yn" != "y" && "$yn" != "Y" ]]; then
    echo "Aborted"
    exit 0
  fi
fi

SSH_PREFIX=( ssh -p "$SSH_PORT" ${SSH_KEY:+-i "$SSH_KEY"} "${NAS_USER}@${NAS_HOST}" )

if [[ $NO_PULL -eq 0 ]]; then
  echo "Pulling latest code on NAS"
  "${SSH_PREFIX[@]}" "cd '$NAS_PATH' && git pull"
fi

# Build and run portal using docker-compose.portal.yml
echo "Building portal Docker image on NAS and bringing up container on port 8020"
"${SSH_PREFIX[@]}" "cd '$NAS_PATH' && docker build -f apps/portal/Dockerfile -t retire-portal:latest . && docker compose -f docker-compose.portal.yml up -d --no-deps --build portal"

echo "Portal deployed. Verifying with healthcheck..."

# Health check: poll local port 8020 on the NAS until service responds or timeout
HEALTH_URL="http://localhost:8020/"
MAX_ATTEMPTS=12
SLEEP_SECONDS=5
ATTEMPT=1
SUCCESS=0
while [[ $ATTEMPT -le $MAX_ATTEMPTS ]]; do
  echo "Healthcheck attempt $ATTEMPT/$MAX_ATTEMPTS..."
  if "${SSH_PREFIX[@]}" "curl -sS -o /dev/null -w '%{http_code}' $HEALTH_URL | grep -q '^2'"; then
    echo "Healthcheck succeeded. Portal is up at http://<NAS_IP>:8020"
    SUCCESS=1
    break
  fi
  sleep $SLEEP_SECONDS
  ATTEMPT=$((ATTEMPT+1))
done

if [[ $SUCCESS -ne 1 ]]; then
  echo "Healthcheck failed after $((MAX_ATTEMPTS*SLEEP_SECONDS)) seconds. Gathering logs..."
  "${SSH_PREFIX[@]}" "cd '$NAS_PATH' && docker compose -f docker-compose.portal.yml logs --no-color --tail 200 portal"
  echo "Check the logs above. If you want me to, I can fetch these logs or retry the deploy."
  exit 1
fi
