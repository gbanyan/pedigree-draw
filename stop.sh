#!/bin/bash
# Pedigree Draw - Stop Server Script

cd "$(dirname "$0")"

if [ -f ".server.pid" ]; then
    PID=$(cat .server.pid)
    if kill -0 "$PID" 2>/dev/null; then
        echo "Stopping server (PID: $PID)..."
        kill "$PID"
        rm -f .server.pid
        echo "Server stopped."
    else
        echo "Server process not found. Cleaning up..."
        rm -f .server.pid
    fi
else
    # Try to find and kill any running vite process for this project
    PIDS=$(pgrep -f "vite.*pedigree-draw")
    if [ -n "$PIDS" ]; then
        echo "Found running server process(es): $PIDS"
        echo "Stopping..."
        kill $PIDS 2>/dev/null
        echo "Server stopped."
    else
        echo "No server is running."
    fi
fi
