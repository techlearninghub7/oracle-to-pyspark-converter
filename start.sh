#!/usr/bin/env bash
set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════╗"
echo "  ║   Oracle → PySpark Converter          ║"
echo "  ║   Local Development Startup           ║"
echo "  ╚═══════════════════════════════════════╝"
echo -e "${NC}"

# ── Backend ──────────────────────────────────────
echo -e "${YELLOW}[1/3] Setting up backend...${NC}"
cd backend

if [ ! -d "venv" ]; then
  echo "  Creating Python virtual environment..."
  python3 -m venv venv
fi

echo "  Installing Python dependencies..."
venv/bin/pip install -r requirements.txt -q

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "  ${YELLOW}⚠  Created backend/.env — please add your OPENROUTER_API_KEY${NC}"
fi

mkdir -p data

echo -e "${GREEN}  ✓ Backend ready${NC}"

# ── Frontend ─────────────────────────────────────
echo -e "${YELLOW}[2/3] Setting up frontend...${NC}"
cd ../frontend

if [ ! -d "node_modules" ]; then
  echo "  Installing Node dependencies..."
  npm install -q
fi

if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
fi

echo -e "${GREEN}  ✓ Frontend ready${NC}"
cd ..

# ── Start services ────────────────────────────────
echo -e "${YELLOW}[3/3] Starting services...${NC}"
echo ""
echo -e "${GREEN}  Backend  → http://localhost:8000${NC}"
echo -e "${GREEN}  Frontend → http://localhost:5173${NC}"
echo -e "${GREEN}  API Docs → http://localhost:8000/docs${NC}"
echo ""

# Start backend in background
cd backend
venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Start frontend in foreground
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Trap Ctrl+C
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

echo -e "${CYAN}  Press Ctrl+C to stop all services${NC}"
wait
