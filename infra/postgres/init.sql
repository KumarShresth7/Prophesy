CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'TRADER',
    balance_cents BIGINT NOT NULL DEFAULT 1000000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS markets (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'GENERAL',
    status TEXT NOT NULL DEFAULT 'OPEN',
    resolved_outcome TEXT,
    resolution_evidence TEXT,
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    market_id INT NOT NULL REFERENCES markets(id),
    side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
    outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
    price_cents INT NOT NULL CHECK (price_cents BETWEEN 1 AND 99),
    quantity INT NOT NULL CHECK (quantity > 0),
    filled_quantity INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id INT NOT NULL REFERENCES markets(id),
    maker_order_id UUID REFERENCES orders(id),
    taker_order_id UUID REFERENCES orders(id),
    price_cents INT NOT NULL,
    quantity INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
    user_id UUID NOT NULL REFERENCES users(id),
    market_id INT NOT NULL REFERENCES markets(id),
    outcome TEXT NOT NULL CHECK (outcome IN ('YES', 'NO')),
    shares INT NOT NULL DEFAULT 0,
    avg_price_cents INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, market_id, outcome)
);

CREATE INDEX IF NOT EXISTS idx_orders_market ON orders(market_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_user ON positions(user_id);

-- Upsert seed users:
-- demo_trader password: password123 (hashed with SHA-256 with salt)
-- liquidity_bot password: botpassword123
INSERT INTO users (id, username, email, password_hash, role, balance_cents) VALUES
    ('00000000-0000-0000-0000-000000000001', 'demo_trader', 'demo@prophesy.market', '77e23114d6428c04ec562086e37fe5fa1f9bfb67be303530f252cfdf7ecbeeb0', 'TRADER', 1000000),
    ('00000000-0000-0000-0000-000000000002', 'liquidity_bot', 'bot@prophesy.market', '5f4dcc3b5aa765d61d8327deb882cf992b9699b19747fe57b023de033b495700', 'BOT', 5000000)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash;

INSERT INTO markets (id, title, description, category, expires_at) VALUES
    (1, 'Will SpaceX launch Starship by Friday?', 'Resolves YES if SpaceX successfully launches Starship orbital flight test before the market expiry.', 'AEROSPACE', NOW() + INTERVAL '7 days'),
    (2, 'Ethereum ETF approved by SEC before July?', 'Resolves YES if the SEC approves a spot Ethereum ETF 19b-4 filing before July 1.', 'CRYPTO', NOW() + INTERVAL '90 days'),
    (3, 'GPT-5 released before December 2024?', 'Resolves YES if OpenAI publicly releases or announces GPT-5 before Dec 31, 2024.', 'AI & TECH', NOW() + INTERVAL '180 days'),
    (4, 'Federal Reserve cuts interest rates in next FOMC meeting?', 'Resolves YES if the Federal Reserve cuts the benchmark interest rate by at least 25 bps.', 'ECONOMY', NOW() + INTERVAL '30 days'),
    (5, 'Nvidia (NVDA) stock closes above $1500 this year?', 'Resolves YES if Nvidia (NVDA) official closing price exceeds $1500 on NASDAQ before Dec 31.', 'FINANCE', NOW() + INTERVAL '240 days'),
    (6, 'US Presidential Election 2024: Winner', 'Resolves YES if the Democratic candidate wins the 2024 US Presidential Election.', 'POLITICS', NOW() + INTERVAL '300 days')
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    category = EXCLUDED.category;

INSERT INTO orders (id, user_id, market_id, side, outcome, price_cents, quantity, filled_quantity, status) VALUES
    ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000002', 1, 'SELL', 'YES', 65, 120, 0, 'OPEN'),
    ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 1, 'BUY', 'YES', 59, 800, 0, 'OPEN'),
    ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000002', 2, 'SELL', 'YES', 32, 250, 0, 'OPEN'),
    ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000002', 2, 'BUY', 'YES', 28, 500, 0, 'OPEN'),
    ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000002', 3, 'SELL', 'YES', 88, 150, 0, 'OPEN'),
    ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000002', 3, 'BUY', 'YES', 82, 300, 0, 'OPEN')
ON CONFLICT (id) DO NOTHING;
