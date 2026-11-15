# Prophesy

High-frequency prediction market platform featuring a sub-millisecond Go CLOB (Central Limit Order Book) matching engine, PostgreSQL row-locked financial vault, Redis sorted set order books, full authentication system, modern landing page, trader terminal, and an autonomous LangGraph AI oracle for web-researched resolution.

## Architecture

| Layer | Tech | Role |
|-------|------|------|
| **Matching Engine** | Go + Redis ZSETs | Sub-ms CLOB bids/asks matching & price-time priority |
| **Financial Vault** | PostgreSQL | Balances, positions, orders, trades (`SELECT … FOR UPDATE`) |
| **Authentication** | Go JWT (HMAC-SHA256) | User registration, login, 1-click demo access, password security |
| **Web App & Terminal** | Next.js 16 + React 19 + Tailwind CSS | High-conversion landing page, live markets dashboard, CLOB terminal, portfolio & leaderboard |
| **Realtime Gateway** | Gorilla WebSocket | Order book, live tape, and user chat on a single persistent socket |
| **AI Oracle** | Python FastAPI + LangGraph | Multi-agent DuckDuckGo web search → GPT-4o analysis → deterministic JSON resolution |

---

## Key Features

1. **Stunning Landing Page (`/` or `/welcome`)**
   - High-impact FinTech/Web3 aesthetic with ambient gradient lighting.
   - Live platform metrics: 24H volume, mean CLOB latency (<2.1ms), active markets, oracle accuracy.
   - Trending prediction markets ticker with live odds.
   - Interactive 4-pillar architectural breakdown & step-by-step workflow.
   - FAQ accordion and instant demo launch CTA.

2. **Full Authentication & Account System (`/login`, `/register`)**
   - User registration with instant **$10,000.00** demo trading capital grant.
   - Secure login with JWT token authentication.
   - **1-Click Instant Demo Login**: Toggle between `demo_trader` ($10k) and `liquidity_bot` ($50k) with zero friction.
   - **Test Faucet (`+$1,000`)**: Mint free test trading funds anytime directly from the top navigation.

3. **Markets Dashboard & Market Creation (`/markets`)**
   - Categorized filters (`ALL`, `CRYPTO`, `POLITICS`, `AI & TECH`, `ECONOMY`, `AEROSPACE`, `FINANCE`).
   - Real-time search by keywords and status filter (`OPEN` vs `RESOLVED`).
   - Modal to propose and launch new prediction markets with automatic liquidity seeding.

4. **Institutional Trading Terminal (`/market/[id]`)**
   - Dynamic market details fetched from the Go backend.
   - Real-time Redis order book (Asks in red, Bids in green) with 1-click price copying to the trade ticket.
   - Live price chart with outcome history.
   - Trade ticket connected to user's real buying power with position sizing buttons (25%, 50%, 75%, MAX).
   - Real-time trade tape & community chat tagged with user positions.
   - Prominent resolution banner with verified primary evidence when settled by the AI Oracle.

5. **Trader Portfolio (`/portfolio`)**
   - Real-time tracking of net worth, available buying power, and capital in open positions.
   - Active positions table detailing shares, average entry price, and total invested value.
   - Resting limit orders table with 1-click order cancellation.

6. **LangGraph Autonomous AI Oracle (`oracle/`)**
   - Scrapes live search snippets via DuckDuckGo.
   - Analyzes real-world evidence against market resolution criteria using GPT-4o (or deterministic heuristic fallback).
   - Executes deterministic settlement calling `/api/markets/resolve`, which automatically distributes **$1.00 per winning share** to holders.

---

## Quick Start (Docker)

```bash
cp .env.example .env
# Optional: Add OPENAI_API_KEY to .env for GPT-4o powered web research

docker compose up --build
```

### Services & URLs

| Service | URL | Notes |
|---------|-----|-------|
| **Landing Page & Web App** | [http://localhost:3000](http://localhost:3000) | Landing page, markets, terminal & portfolio |
| **Go Matching Engine & API** | [http://localhost:8080](http://localhost:8080) | REST API & WebSocket |
| **Autonomous AI Oracle** | [http://localhost:8001](http://localhost:8001) | FastAPI & LangGraph resolution service |
| **PostgreSQL Database** | `localhost:5432` | Schema, vault, users & trades |
| **Redis Cache** | `localhost:6379` | Sorted set order books |

---

## API Reference

### Authentication & User

- `POST /api/auth/register` — Register a new account (`username`, `email`, `password`). Credits $10,000 balance.
- `POST /api/auth/login` — Sign in with username/email and password. Returns JWT token.
- `POST /api/auth/demo` — 1-click demo login as `demo_trader` or `liquidity_bot`.
- `GET /api/auth/me` — Get authenticated user details & buying power (`Authorization: Bearer <token>`).
- `POST /api/user/faucet` — Add $1,000 in test trading funds to the current account.
- `GET /api/user/portfolio` — Fetch user's active positions, open orders, and trade history.

### Markets & Orders

- `GET /api/markets` — List all markets with current implied odds and 24h volume.
- `POST /api/markets` — Create a new prediction market.
- `GET /api/markets/detail?market_id=1` — Fetch full market metadata, expiry, status, and resolution evidence.
- `POST /api/orders` — Place limit or market order (`market_id`, `side`, `outcome`, `price_cents`, `quantity`).
- `POST /api/orders/cancel` — Cancel a resting limit order and prune from Redis.
- `GET /api/markets/expired` — List expired markets awaiting resolution (requires `X-Oracle-Secret`).
- `POST /api/markets/resolve` — Settle a market outcome and distribute payouts (requires `X-Oracle-Secret`).

---

## Local Development (Without Docker)

### 1. Database & Cache
Ensure PostgreSQL and Redis are running locally, or configure a Neon Postgres and Upstash Redis connection in `.env`.

### 2. Backend (Go)
```bash
cd backend
export DATABASE_URL="postgres://prophesy:prophesy@localhost:5432/prophesy?sslmode=disable"
export REDIS_URL="redis://localhost:6379"
go run ./cmd/server
```

### 3. Web Frontend (Next.js)
```bash
cd web
npm install
npm run dev
```

### 4. Oracle (FastAPI + LangGraph)
```bash
cd oracle
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
