package engine

import (
	"context"
	"fmt"
	"strings"
	"time"

	"polymarket/internal/cache"
	"polymarket/internal/db"
	"polymarket/internal/ws"

	"github.com/jackc/pgx/v5"
	"github.com/redis/go-redis/v9"
)

type Order struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	MarketID   int       `json:"market_id"`
	Side       string    `json:"side"`
	Outcome    string    `json:"outcome"`
	PriceCents int       `json:"price_cents"`
	Quantity   int       `json:"quantity"`
	CreatedAt  time.Time `json:"created_at"`
}

func ProcessOrder(ctx context.Context, incoming Order) error {
	unfilled := incoming.Quantity

	// First verify market is OPEN
	var marketStatus string
	err := db.Pool.QueryRow(ctx, `SELECT status FROM markets WHERE id = $1`, incoming.MarketID).Scan(&marketStatus)
	if err != nil {
		return fmt.Errorf("market not found: %w", err)
	}
	if marketStatus != "OPEN" {
		return fmt.Errorf("market is %s, cannot place orders", marketStatus)
	}

	// Verify user balance if BUY
	if incoming.Side == "BUY" {
		var balance int64
		err := db.Pool.QueryRow(ctx, `SELECT balance_cents FROM users WHERE id = $1`, incoming.UserID).Scan(&balance)
		if err != nil {
			return fmt.Errorf("user not found: %w", err)
		}
		requiredFunds := int64(incoming.PriceCents * incoming.Quantity)
		if balance < requiredFunds {
			return fmt.Errorf("insufficient balance: have $%.2f, need $%.2f", float64(balance)/100.0, float64(requiredFunds)/100.0)
		}
	}

	for unfilled > 0 {
		matchStr, err := findBestMatch(ctx, incoming)
		if err == redis.Nil || matchStr == "" {
			if err := restOrderInBook(ctx, incoming, unfilled); err != nil {
				return err
			}
			ws.BroadcastOrderBook(incoming.MarketID, incoming.Outcome)
			return nil
		} else if err != nil {
			return err
		}

		makerOrderID := orderIDFromMember(matchStr)
		tradeQty, fullyFilled, err := executeTradeTx(ctx, incoming, makerOrderID, unfilled)
		if err != nil {
			// If maker order no longer exists or couldn't be locked, prune stale redis entry and continue
			queueKey := askKey(incoming.MarketID, incoming.Outcome)
			if incoming.Side == "SELL" {
				queueKey = bidKey(incoming.MarketID, incoming.Outcome)
			}
			_ = cache.Client.ZRem(ctx, queueKey, matchStr).Err()
			continue
		}

		// Prune from redis if maker order is fully filled
		if fullyFilled {
			queueKey := askKey(incoming.MarketID, incoming.Outcome)
			if incoming.Side == "SELL" {
				queueKey = bidKey(incoming.MarketID, incoming.Outcome)
			}
			_ = cache.Client.ZRem(ctx, queueKey, matchStr).Err()
		}

		unfilled -= tradeQty

		ws.BroadcastTrade(incoming.MarketID, ws.TradeMessage{
			ID:       fmt.Sprintf("trd_%d", time.Now().UnixNano()),
			Price:    incoming.PriceCents,
			Quantity: tradeQty,
			Side:     incoming.Side,
			Time:     time.Now().Format("15:04:05"),
		})
	}

	ws.BroadcastOrderBook(incoming.MarketID, incoming.Outcome)
	return nil
}

func orderIDFromMember(member string) string {
	if i := strings.Index(member, ":"); i >= 0 {
		return member[i+1:]
	}
	return member
}

func bidKey(marketID int, outcome string) string {
	return fmt.Sprintf("market:%d:%s:bids", marketID, outcome)
}

func askKey(marketID int, outcome string) string {
	return fmt.Sprintf("market:%d:%s:asks", marketID, outcome)
}

func findBestMatch(ctx context.Context, o Order) (string, error) {
	if o.Side == "BUY" {
		queueKey := askKey(o.MarketID, o.Outcome)
		opt := &redis.ZRangeBy{Min: "-inf", Max: fmt.Sprintf("%d", o.PriceCents), Offset: 0, Count: 1}
		res, err := cache.Client.ZRangeByScore(ctx, queueKey, opt).Result()
		if err != nil || len(res) == 0 {
			return "", redis.Nil
		}
		return res[0], nil
	}

	queueKey := bidKey(o.MarketID, o.Outcome)
	opt := &redis.ZRangeBy{Min: fmt.Sprintf("%d", o.PriceCents), Max: "+inf", Offset: 0, Count: 1}
	res, err := cache.Client.ZRevRangeByScore(ctx, queueKey, opt).Result()
	if err != nil || len(res) == 0 {
		return "", redis.Nil
	}
	return res[0], nil
}

func executeTradeTx(ctx context.Context, taker Order, makerID string, takeUnfilled int) (tradeQty int, makerFullyFilled bool, err error) {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return 0, false, err
	}
	defer tx.Rollback(ctx)

	var makerPrice, makerRemaining int
	var makerUserID string
	err = tx.QueryRow(ctx,
		`SELECT user_id, price_cents, quantity - filled_quantity FROM orders WHERE id = $1 AND status = 'OPEN' FOR UPDATE`,
		makerID,
	).Scan(&makerUserID, &makerPrice, &makerRemaining)
	if err != nil {
		return 0, false, err
	}

	if makerRemaining <= 0 {
		_, _ = tx.Exec(ctx, `UPDATE orders SET status = 'FILLED' WHERE id = $1`, makerID)
		_ = tx.Commit(ctx)
		return 0, true, nil
	}

	tradeQty = takeUnfilled
	if makerRemaining < tradeQty {
		tradeQty = makerRemaining
	}

	totalCost := makerPrice * tradeQty

	if taker.Side == "BUY" {
		_, _ = tx.Exec(ctx, `UPDATE users SET balance_cents = balance_cents - $1 WHERE id = $2`, totalCost, taker.UserID)
		_, _ = tx.Exec(ctx, `UPDATE users SET balance_cents = balance_cents + $1 WHERE id = $2`, totalCost, makerUserID)
		updatePositionTx(ctx, tx, taker.UserID, taker.MarketID, taker.Outcome, tradeQty, makerPrice)
		updatePositionTx(ctx, tx, makerUserID, taker.MarketID, taker.Outcome, -tradeQty, makerPrice)
	} else {
		_, _ = tx.Exec(ctx, `UPDATE users SET balance_cents = balance_cents + $1 WHERE id = $2`, totalCost, taker.UserID)
		_, _ = tx.Exec(ctx, `UPDATE users SET balance_cents = balance_cents - $1 WHERE id = $2`, totalCost, makerUserID)
		updatePositionTx(ctx, tx, taker.UserID, taker.MarketID, taker.Outcome, -tradeQty, makerPrice)
		updatePositionTx(ctx, tx, makerUserID, taker.MarketID, taker.Outcome, tradeQty, makerPrice)
	}

	newFilled := makerRemaining - tradeQty
	newStatus := "OPEN"
	if newFilled <= 0 {
		newStatus = "FILLED"
		makerFullyFilled = true
	}

	_, _ = tx.Exec(ctx, `UPDATE orders SET filled_quantity = filled_quantity + $1, status = $2 WHERE id = $3`, tradeQty, newStatus, makerID)
	_, _ = tx.Exec(ctx,
		`INSERT INTO trades (market_id, maker_order_id, taker_order_id, price_cents, quantity) VALUES ($1, $2, $3, $4, $5)`,
		taker.MarketID, makerID, taker.ID, makerPrice, tradeQty,
	)

	if err := tx.Commit(ctx); err != nil {
		return 0, false, err
	}
	return tradeQty, makerFullyFilled, nil
}

func updatePositionTx(ctx context.Context, tx pgx.Tx, userID string, marketID int, outcome string, shareDelta int, priceCents int) {
	_, _ = tx.Exec(ctx, `
		INSERT INTO positions (user_id, market_id, outcome, shares, avg_price_cents, updated_at)
		VALUES ($1, $2, $3, GREATEST(0, $4), $5, NOW())
		ON CONFLICT (user_id, market_id, outcome)
		DO UPDATE SET
			shares = GREATEST(0, positions.shares + EXCLUDED.shares),
			avg_price_cents = CASE WHEN positions.shares + EXCLUDED.shares > 0 THEN EXCLUDED.avg_price_cents ELSE positions.avg_price_cents END,
			updated_at = NOW()
	`, userID, marketID, outcome, shareDelta, priceCents)
}

func restOrderInBook(ctx context.Context, o Order, remaining int) error {
	_, err := db.Pool.Exec(ctx,
		`INSERT INTO orders (id, user_id, market_id, side, outcome, price_cents, quantity, filled_quantity, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'OPEN')`,
		o.ID, o.UserID, o.MarketID, o.Side, o.Outcome, o.PriceCents, remaining,
	)
	if err != nil {
		return err
	}

	queueKey := bidKey(o.MarketID, o.Outcome)
	if o.Side == "SELL" {
		queueKey = askKey(o.MarketID, o.Outcome)
	}
	value := fmt.Sprintf("%d:%s", time.Now().UnixNano(), o.ID)
	return cache.Client.ZAdd(ctx, queueKey, redis.Z{Score: float64(o.PriceCents), Member: value}).Err()
}
