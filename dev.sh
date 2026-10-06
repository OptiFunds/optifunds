#!/bin/bash
# ==============================================================================
# OptiFunds - Script d'arrencada conjunt (Backend FastAPI + Frontend Next.js)
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "🚀 OptiFunds Analytics Platform"
echo "=========================================================="

# 1. Comprovar dependències de Python
echo "🔍 Comprovant backend FastAPI..."
python3 -c "import fastapi, uvicorn, duckdb, pandas" 2>/dev/null || {
    echo "❌ Falten dependències de Python. Executa: pip install -r requirements.txt"
    exit 1
}

# 2. Comprovar dependències de Node.js
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Instal·lant dependències de Node.js al frontend..."
    (cd frontend && npm install)
fi

# 3. Funció de neteja en sortir (Ctrl+C)
cleanup() {
    echo ""
    echo "🛑 Aturant serveis d'OptiFunds..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    wait 2>/dev/null || true
    echo "✅ Tots els serveis s'han aturat correctament."
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 4. Arrencar Backend FastAPI (Port 8000)
echo "⚡ Arrencant Backend FastAPI a http://127.0.0.1:8000..."
uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# Esperar 1 segon perquè el backend iniciï
sleep 1.5

# 5. Arrencar Frontend Next.js (Port 3000)
echo "🌐 Arrencant Frontend Next.js a http://localhost:3000..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "=========================================================="
echo "✨ OptiFunds està en funcionament:"
echo "   - Frontend: http://localhost:3000"
echo "   - API Docs: http://127.0.0.1:8000/docs"
echo "=========================================================="
echo "Prem [Ctrl+C] per aturar ambdós serveis."
echo ""

# Mantenir l'script viu esperant els processos
wait
