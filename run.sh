#!/bin/bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "Iniciando servidor en puerto 3001..."
(cd server && npm run dev) &
SERVER_PID=$!

echo "Iniciando cliente en puerto 5173..."
(cd client && npm run dev) &
CLIENT_PID=$!

echo ""
echo "✅ Aplicación iniciada:"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend:  http://localhost:3001"
echo ""
echo "Presiona Ctrl+C para detener los servicios"

trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null" EXIT

wait