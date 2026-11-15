package cache

import (
	"context"
	"fmt"
	"time"

	"polymarket/internal/db"

	"github.com/redis/go-redis/v9"
)

// SeedOrderBooks loads open orders from Postgres into Redis sorted sets.
func SeedOrderBooks(ctx context.Context) error {
	rows, err := db.Pool.Query(ctx,
		`SELECT id, market_id, side, outcome, price_cents, quantity - filled_quantity
		 FROM orders WHERE status = 'OPEN' AND quantity > filled_quantity`,
	)
	if err != nil {
		return err
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		var marketID int
		var side, outcome string
		var priceCents, remaining int
		if err := rows.Scan(&id, &marketID, &side, &outcome, &priceCents, &remaining); err != nil {
			return err
		}
		if remaining <= 0 {
			continue
		}

		queueKey := fmt.Sprintf("market:%d:%s:bids", marketID, outcome)
		if side == "SELL" {
			queueKey = fmt.Sprintf("market:%d:%s:asks", marketID, outcome)
		}
		member := fmt.Sprintf("%d:%s", time.Now().UnixNano(), id)
		if err := Client.ZAdd(ctx, queueKey, redis.Z{Score: float64(priceCents), Member: member}).Err(); err != nil {
			return err
		}
	}
	return rows.Err()
}
