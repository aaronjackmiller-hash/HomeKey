#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PORT="${PORT:-5000}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:${PORT}/api/health}"
LOG_FILE="${LOG_FILE:-/tmp/homekey-backend-api-only.log}"
PID_FILE="${PID_FILE:-/tmp/homekey-backend-api-only.pid}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-30}"

if [ "${NODE_ENV:-}" != "production" ]; then
    echo "NODE_ENV must be set to production for this smoke test."
    exit 1
fi

if [ -f "${ROOT_DIR}/frontend/build/index.html" ]; then
    echo "frontend/build/index.html must be absent to validate API-only startup behavior."
    exit 1
fi

cleanup() {
    if [ -f "${PID_FILE}" ]; then
        pid=""
        read -r pid < "${PID_FILE}" || true
        if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
            kill "${pid}" || true
        fi
        rm -f "${PID_FILE}"
    fi
}

trap cleanup EXIT

(
    cd "${ROOT_DIR}"
    node backend/server.js > "${LOG_FILE}" 2>&1 &
    echo $! > "${PID_FILE}"
)

for _attempt in $(seq 1 "${MAX_ATTEMPTS}"); do
    response="$(curl -sS "${HEALTH_URL}" || true)"
    if [ -n "${response}" ]; then
        if node -e "const payload = JSON.parse(process.argv[1]); process.exit(payload.status === 'ok' && payload.db === 'connected' ? 0 : 1);" "${response}"; then
            if rg -q "Skipping static frontend serving and running in API-only mode\\." "${LOG_FILE}"; then
                echo "API-only production startup smoke test passed."
                exit 0
            fi
        fi
    fi
    sleep 2
done

echo "API-only production startup smoke test failed."
echo "Expected a healthy backend and API-only startup warning in logs."
sed -n '1,200p' "${LOG_FILE}" || true
exit 1
