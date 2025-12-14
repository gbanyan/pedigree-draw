#!/bin/bash
# Pedigree Draw - Start Server Script

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if another instance is running
if [ -f ".server.pid" ]; then
    OLD_PID=$(cat .server.pid)
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Server is already running (PID: $OLD_PID)"
        echo "Access at: http://localhost:5173/pedigree-draw/"
        exit 0
    fi
fi

echo "Starting Pedigree Draw server..."
npm run dev > .server.log 2>&1 &
SERVER_PID=$!
echo $SERVER_PID > .server.pid

# Wait for server to start
sleep 2

if kill -0 "$SERVER_PID" 2>/dev/null; then
    # Get local IP address (works on both Linux and macOS)
    LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || hostname -I 2>/dev/null | awk '{print $1}' || echo "YOUR_IP")

    echo ""
    echo "=========================================="
    echo "  Pedigree Draw Server Started!"
    echo "=========================================="
    echo ""
    echo "  Local:   http://localhost:5173/pedigree-draw/"
    if [ "$LOCAL_IP" != "YOUR_IP" ] && [ -n "$LOCAL_IP" ]; then
        echo "  Network: http://${LOCAL_IP}:5173/pedigree-draw/"
    else
        echo "  Network: Check 'ip addr' for your IP address"
    fi
    echo ""
    echo "  To stop the server, run: ./stop.sh"
    echo "=========================================="
else
    echo "Failed to start server. Check .server.log for details."
    rm -f .server.pid
    exit 1
fi
