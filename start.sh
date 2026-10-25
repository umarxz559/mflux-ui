#!/usr/bin/env bash
# =============================================================================
# mflux UI — Start script
# Launches both the FastAPI backend and the Vite dev server.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== mflux UI ==="
echo ""

# --- Backend ---
echo "[1/2] Starting FastAPI backend on http://127.0.0.1:8010 ..."
cd "$SCRIPT_DIR/backend"

# Use local lib directory for Python packages
export PYTHONPATH="$SCRIPT_DIR/backend/lib${PYTHONPATH:+:$PYTHONPATH}"

# Check if port is already in use
if lsof -ti:8010 >/dev/null 2>&1; then
    echo "  Port 8010 already in use — reusing existing backend"
else
    python3 -m uvicorn main:app --host 127.0.0.1 --port 8010 --reload &
    BACKEND_PID=$!
fi

# --- Frontend ---
echo "[2/2] Starting Vite dev server on http://127.0.0.1:3000 ..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "  Installing frontend dependencies..."
    npm install
fi

# Check if port is already in use
if lsof -ti:3000 >/dev/null 2>&1; then
    echo "  Port 3000 already in use — reusing existing frontend"
else
    npm run dev &
    FRONTEND_PID=$!
fi

echo ""
echo "=== Ready ==="
echo "  Frontend: http://127.0.0.1:3000"
echo "  Backend:  http://127.0.0.1:8010"
echo ""
echo "Press Ctrl+C to stop both servers."
echo ""

# Trap Ctrl+C to clean up
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# Wait for either process to exit
wait 2>/dev/null || true

# Clean up
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
