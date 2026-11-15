package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"polymarket/internal/auth"
	"polymarket/internal/cache"
	"polymarket/internal/db"
	"polymarket/internal/engine"
	"polymarket/internal/ws"

	"github.com/google/uuid"
)

var oracleSecret string

func SetOracleSecret(secret string) {
	oracleSecret = secret
}

func getAuthenticatedUserID(r *http.Request) string {
	token := auth.ExtractBearerToken(r)
	if token != "" {
		if claims, err := auth.ValidateToken(token); err == nil && claims != nil {
			return claims.UserID
		}
	}
	return ""
}

func requireOracle(w http.ResponseWriter, r *http.Request) bool {
	if oracleSecret == "" {
		return true
	}
	if r.Header.Get("X-Oracle-Secret") != oracleSecret {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}

// -------------------------------------------------------------
// AUTH HANDLERS
// -------------------------------------------------------------

type registerRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResponse struct {
	Token string   `json:"token"`
	User  userData `json:"user"`
}

type userData struct {
	ID           string `json:"id"`
	Username     string `json:"username"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	BalanceCents int64  `json:"balance_cents"`
}

func HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if len(req.Username) < 3 {
		http.Error(w, "username must be at least 3 characters", http.StatusBadRequest)
		return
	}
	if len(req.Password) < 6 {
		http.Error(w, "password must be at least 6 characters", http.StatusBadRequest)
		return
	}
	if req.Email == "" {
		req.Email = fmt.Sprintf("%s@prophesy.market", req.Username)
	}

	passwordHash := auth.HashPassword(req.Password)
	newID := uuid.New().String()
	initialBalance := int64(1000000) // $10,000 starting demo funds

	_, err := db.Pool.Exec(r.Context(),
		`INSERT INTO users (id, username, email, password_hash, role, balance_cents)
		 VALUES ($1, $2, $3, $4, 'TRADER', $5)`,
		newID, req.Username, req.Email, passwordHash, initialBalance,
	)
	if err != nil {
		if strings.Contains(err.Error(), "unique") || strings.Contains(err.Error(), "duplicate") {
			http.Error(w, "username or email already taken", http.StatusConflict)
			return
		}
		http.Error(w, "registration failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	token, err := auth.GenerateToken(newID, req.Username, "TRADER")
	if err != nil {
		http.Error(w, "token generation failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(authResponse{
		Token: token,
		User: userData{
			ID:           newID,
			Username:     req.Username,
			Email:        req.Email,
			Role:         "TRADER",
			BalanceCents: initialBalance,
		},
	})
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	loginKey := strings.TrimSpace(req.Username)
	var u userData
	var passwordHash string

	err := db.Pool.QueryRow(r.Context(),
		`SELECT id, username, COALESCE(email, ''), password_hash, role, balance_cents
		 FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)`,
		loginKey,
	).Scan(&u.ID, &u.Username, &u.Email, &passwordHash, &u.Role, &u.BalanceCents)

	if err != nil {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}

	if !auth.CheckPassword(req.Password, passwordHash) {
		http.Error(w, "invalid username or password", http.StatusUnauthorized)
		return
	}

	token, err := auth.GenerateToken(u.ID, u.Username, u.Role)
	if err != nil {
		http.Error(w, "failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(authResponse{
		Token: token,
		User:  u,
	})
}

func HandleDemoLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		As string `json:"as"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	username := "demo_trader"
	defaultID := "00000000-0000-0000-0000-000000000001"
	defaultRole := "TRADER"
	defaultBalance := int64(1000000)

	if req.As == "liquidity_bot" {
		username = "liquidity_bot"
		defaultID = "00000000-0000-0000-0000-000000000002"
		defaultRole = "BOT"
		defaultBalance = int64(5000000)
	}

	var u userData
	err := db.Pool.QueryRow(r.Context(),
		`SELECT id, username, COALESCE(email, ''), role, balance_cents FROM users WHERE id = $1`,
		defaultID,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Role, &u.BalanceCents)

	if err != nil {
		// Insert demo user if not present
		u = userData{
			ID:           defaultID,
			Username:     username,
			Email:        fmt.Sprintf("%s@prophesy.market", username),
			Role:         defaultRole,
			BalanceCents: defaultBalance,
		}
		_, _ = db.Pool.Exec(r.Context(),
			`INSERT INTO users (id, username, email, role, balance_cents)
			 VALUES ($1, $2, $3, $4, $5)
			 ON CONFLICT (id) DO UPDATE SET balance_cents = EXCLUDED.balance_cents`,
			u.ID, u.Username, u.Email, u.Role, u.BalanceCents,
		)
	}

	token, err := auth.GenerateToken(u.ID, u.Username, u.Role)
	if err != nil {
		http.Error(w, "token generation failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(authResponse{
		Token: token,
		User:  u,
	})
}

func HandleMe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := getAuthenticatedUserID(r)
	if userID == "" {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var u userData
	err := db.Pool.QueryRow(r.Context(),
		`SELECT id, username, COALESCE(email, ''), role, balance_cents FROM users WHERE id = $1`,
		userID,
	).Scan(&u.ID, &u.Username, &u.Email, &u.Role, &u.BalanceCents)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(u)
}

func HandleUserFaucet(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := getAuthenticatedUserID(r)
	if userID == "" {
		userID = DemoUserID()
	}

	// Add $1,000 (100,000 cents) test balance
	var newBalance int64
	err := db.Pool.QueryRow(r.Context(),
		`UPDATE users SET balance_cents = balance_cents + 100000 WHERE id = $1 RETURNING balance_cents`,
		userID,
	).Scan(&newBalance)
	if err != nil {
		http.Error(w, "failed to fund user: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":        "funded",
		"added_cents":   100000,
		"balance_cents": newBalance,
	})
}

func HandleUserPortfolio(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := getAuthenticatedUserID(r)
	if userID == "" {
		userID = DemoUserID()
	}

	// 1. Fetch user balance
	var balanceCents int64
	_ = db.Pool.QueryRow(r.Context(), `SELECT balance_cents FROM users WHERE id = $1`, userID).Scan(&balanceCents)

	// 2. Fetch positions
	type positionItem struct {
		MarketID      int    `json:"market_id"`
		MarketTitle   string `json:"market_title"`
		MarketStatus  string `json:"market_status"`
		Outcome       string `json:"outcome"`
		Shares        int    `json:"shares"`
		AvgPriceCents int    `json:"avg_price_cents"`
	}
	var positions []positionItem
	posRows, err := db.Pool.Query(r.Context(),
		`SELECT p.market_id, m.title, m.status, p.outcome, p.shares, p.avg_price_cents
		 FROM positions p
		 JOIN markets m ON m.id = p.market_id
		 WHERE p.user_id = $1 AND p.shares > 0
		 ORDER BY p.updated_at DESC`,
		userID,
	)
	if err == nil {
		for posRows.Next() {
			var p positionItem
			if err := posRows.Scan(&p.MarketID, &p.MarketTitle, &p.MarketStatus, &p.Outcome, &p.Shares, &p.AvgPriceCents); err == nil {
				positions = append(positions, p)
			}
		}
		posRows.Close()
	}

	// 3. Fetch open orders
	type orderItem struct {
		ID             string    `json:"id"`
		MarketID       int       `json:"market_id"`
		MarketTitle    string    `json:"market_title"`
		Side           string    `json:"side"`
		Outcome        string    `json:"outcome"`
		PriceCents     int       `json:"price_cents"`
		Quantity       int       `json:"quantity"`
		FilledQuantity int       `json:"filled_quantity"`
		Status         string    `json:"status"`
		CreatedAt      time.Time `json:"created_at"`
	}
	var orders []orderItem
	ordRows, err := db.Pool.Query(r.Context(),
		`SELECT o.id, o.market_id, m.title, o.side, o.outcome, o.price_cents, o.quantity, o.filled_quantity, o.status, o.created_at
		 FROM orders o
		 JOIN markets m ON m.id = o.market_id
		 WHERE o.user_id = $1 AND o.status = 'OPEN'
		 ORDER BY o.created_at DESC`,
		userID,
	)
	if err == nil {
		for ordRows.Next() {
			var o orderItem
			if err := ordRows.Scan(&o.ID, &o.MarketID, &o.MarketTitle, &o.Side, &o.Outcome, &o.PriceCents, &o.Quantity, &o.FilledQuantity, &o.Status, &o.CreatedAt); err == nil {
				orders = append(orders, o)
			}
		}
		ordRows.Close()
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"user_id":       userID,
		"balance_cents": balanceCents,
		"positions":     positions,
		"orders":        orders,
	})
}

// -------------------------------------------------------------
// ORDER MANAGEMENT
// -------------------------------------------------------------

func HandlePlaceOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var order engine.Order
	if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Use authenticated user ID if available, otherwise check body or fallback to demo
	authUID := getAuthenticatedUserID(r)
	if authUID != "" {
		order.UserID = authUID
	} else if order.UserID == "" {
		order.UserID = DemoUserID()
	}

	if order.ID == "" {
		order.ID = uuid.New().String()
	}
	if order.CreatedAt.IsZero() {
		order.CreatedAt = time.Now()
	}
	if order.PriceCents < 1 || order.PriceCents > 99 {
		http.Error(w, "price must be between 1 and 99 cents", http.StatusBadRequest)
		return
	}
	if order.Quantity <= 0 {
		http.Error(w, "quantity must be greater than 0", http.StatusBadRequest)
		return
	}
	if order.Side != "BUY" && order.Side != "SELL" {
		http.Error(w, "side must be BUY or SELL", http.StatusBadRequest)
		return
	}
	if order.Outcome != "YES" && order.Outcome != "NO" {
		http.Error(w, "outcome must be YES or NO", http.StatusBadRequest)
		return
	}

	if err := engine.ProcessOrder(r.Context(), order); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusAccepted)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "executed", "order_id": order.ID})
}

func HandleCancelOrder(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		OrderID string `json:"order_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.OrderID == "" {
		req.OrderID = r.URL.Query().Get("order_id")
	}
	if req.OrderID == "" {
		http.Error(w, "order_id required", http.StatusBadRequest)
		return
	}

	userID := getAuthenticatedUserID(r)
	if userID == "" {
		userID = DemoUserID()
	}

	var marketID int
	var outcome, side string
	var priceCents int
	err := db.Pool.QueryRow(r.Context(),
		`SELECT market_id, outcome, side, price_cents FROM orders WHERE id = $1 AND (user_id = $2 OR $2 = '') AND status = 'OPEN'`,
		req.OrderID, userID,
	).Scan(&marketID, &outcome, &side, &priceCents)
	if err != nil {
		http.Error(w, "order not found or cannot be cancelled", http.StatusNotFound)
		return
	}

	_, _ = db.Pool.Exec(r.Context(), `UPDATE orders SET status = 'CANCELLED' WHERE id = $1`, req.OrderID)

	// Remove from Redis queue
	queueKey := fmt.Sprintf("market:%d:%s:bids", marketID, outcome)
	if side == "SELL" {
		queueKey = fmt.Sprintf("market:%d:%s:asks", marketID, outcome)
	}

	// Prune matching member from Redis
	members, _ := cache.Client.ZRange(r.Context(), queueKey, 0, -1).Result()
	for _, m := range members {
		if strings.HasSuffix(m, ":"+req.OrderID) || m == req.OrderID {
			_ = cache.Client.ZRem(r.Context(), queueKey, m).Err()
		}
	}

	ws.BroadcastOrderBook(marketID, outcome)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "cancelled", "order_id": req.OrderID})
}

// -------------------------------------------------------------
// MARKETS API
// -------------------------------------------------------------

type marketSummary struct {
	ID                 int     `json:"id"`
	Title              string  `json:"title"`
	Description        string  `json:"description"`
	Category           string  `json:"category"`
	Status             string  `json:"status"`
	ResolvedOutcome    string  `json:"resolved_outcome,omitempty"`
	ResolutionEvidence string  `json:"resolution_evidence,omitempty"`
	ExpiresAt          *string `json:"expires_at,omitempty"`
	Probability        int     `json:"probability"`
	VolumeCents        int64   `json:"volume_cents"`
}

func HandleListMarkets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rows, err := db.Pool.Query(r.Context(),
		`SELECT m.id, m.title, m.description, m.category, m.status,
		        COALESCE(m.resolved_outcome, ''), COALESCE(m.resolution_evidence, ''),
		        m.expires_at::text,
		        COALESCE(SUM(t.price_cents * t.quantity), 0) AS volume_cents
		 FROM markets m
		 LEFT JOIN trades t ON t.market_id = m.id
		 GROUP BY m.id
		 ORDER BY m.id ASC`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var markets []marketSummary
	for rows.Next() {
		var m marketSummary
		if err := rows.Scan(&m.ID, &m.Title, &m.Description, &m.Category, &m.Status, &m.ResolvedOutcome, &m.ResolutionEvidence, &m.ExpiresAt, &m.VolumeCents); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Calculate current implied probability from order book or default
		m.Probability = 50
		ctx := r.Context()
		bidKey := fmt.Sprintf("market:%d:YES:bids", m.ID)
		askKey := fmt.Sprintf("market:%d:YES:asks", m.ID)
		bids, _ := cache.Client.ZRevRangeWithScores(ctx, bidKey, 0, 0).Result()
		asks, _ := cache.Client.ZRangeWithScores(ctx, askKey, 0, 0).Result()

		if len(bids) > 0 && len(asks) > 0 {
			m.Probability = int((bids[0].Score + asks[0].Score) / 2)
		} else if len(bids) > 0 {
			m.Probability = int(bids[0].Score)
		} else if len(asks) > 0 {
			m.Probability = int(asks[0].Score)
		}

		markets = append(markets, m)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(markets)
}

func HandleGetMarketDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	marketID := r.URL.Query().Get("market_id")
	if marketID == "" {
		http.Error(w, "market_id required", http.StatusBadRequest)
		return
	}

	var m struct {
		ID                 int     `json:"id"`
		Title              string  `json:"title"`
		Description        string  `json:"description"`
		Category           string  `json:"category"`
		Status             string  `json:"status"`
		ResolvedOutcome    *string `json:"resolved_outcome,omitempty"`
		ResolutionEvidence *string `json:"resolution_evidence,omitempty"`
		ExpiresAt          *string `json:"expires_at,omitempty"`
		ResolvedAt         *string `json:"resolved_at,omitempty"`
		VolumeCents        int64   `json:"volume_cents"`
		Probability        int     `json:"probability"`
	}

	err := db.Pool.QueryRow(r.Context(),
		`SELECT m.id, m.title, m.description, m.category, m.status,
		        m.resolved_outcome, m.resolution_evidence, m.expires_at::text, m.resolved_at::text,
		        COALESCE(SUM(t.price_cents * t.quantity), 0) AS volume_cents
		 FROM markets m
		 LEFT JOIN trades t ON t.market_id = m.id
		 WHERE m.id = $1
		 GROUP BY m.id`,
		marketID,
	).Scan(&m.ID, &m.Title, &m.Description, &m.Category, &m.Status, &m.ResolvedOutcome, &m.ResolutionEvidence, &m.ExpiresAt, &m.ResolvedAt, &m.VolumeCents)
	if err != nil {
		http.Error(w, "market not found", http.StatusNotFound)
		return
	}

	m.Probability = 50
	ctx := r.Context()
	bidKey := fmt.Sprintf("market:%s:YES:bids", marketID)
	askKey := fmt.Sprintf("market:%s:YES:asks", marketID)
	bids, _ := cache.Client.ZRevRangeWithScores(ctx, bidKey, 0, 0).Result()
	asks, _ := cache.Client.ZRangeWithScores(ctx, askKey, 0, 0).Result()
	if len(bids) > 0 && len(asks) > 0 {
		m.Probability = int((bids[0].Score + asks[0].Score) / 2)
	} else if len(bids) > 0 {
		m.Probability = int(bids[0].Score)
	} else if len(asks) > 0 {
		m.Probability = int(asks[0].Score)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(m)
}

func HandleCreateMarket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Category    string `json:"category"`
		Days        int    `json:"days"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	req.Title = strings.TrimSpace(req.Title)
	if len(req.Title) < 5 {
		http.Error(w, "title must be at least 5 characters", http.StatusBadRequest)
		return
	}
	if req.Category == "" {
		req.Category = "GENERAL"
	}
	if req.Days <= 0 {
		req.Days = 7
	}

	var newID int
	err := db.Pool.QueryRow(r.Context(),
		`INSERT INTO markets (title, description, category, expires_at)
		 VALUES ($1, $2, $3, NOW() + ($4 || ' days')::INTERVAL)
		 RETURNING id`,
		req.Title, req.Description, strings.ToUpper(req.Category), req.Days,
	).Scan(&newID)
	if err != nil {
		http.Error(w, "failed to create market: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Seed initial liquidity bot orders so the order book is populated immediately
	botID := "00000000-0000-0000-0000-000000000002"
	_ = engine.ProcessOrder(r.Context(), engine.Order{
		ID:         uuid.New().String(),
		UserID:     botID,
		MarketID:   newID,
		Side:       "BUY",
		Outcome:    "YES",
		PriceCents: 45,
		Quantity:   200,
	})
	_ = engine.ProcessOrder(r.Context(), engine.Order{
		ID:         uuid.New().String(),
		UserID:     botID,
		MarketID:   newID,
		Side:       "SELL",
		Outcome:    "YES",
		PriceCents: 55,
		Quantity:   200,
	})

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"id":       newID,
		"title":    req.Title,
		"category": req.Category,
		"status":   "OPEN",
	})
}

func HandleExpiredMarkets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !requireOracle(w, r) {
		return
	}

	rows, err := db.Pool.Query(r.Context(),
		`SELECT id, title, description, category, status, expires_at::text
		 FROM markets
		 WHERE status = 'OPEN' AND expires_at IS NOT NULL AND expires_at <= NOW()
		 ORDER BY expires_at ASC`,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type market struct {
		ID          int     `json:"id"`
		Title       string  `json:"title"`
		Description string  `json:"description"`
		Category    string  `json:"category"`
		Status      string  `json:"status"`
		ExpiresAt   *string `json:"expires_at,omitempty"`
	}

	var markets []market
	for rows.Next() {
		var m market
		if err := rows.Scan(&m.ID, &m.Title, &m.Description, &m.Category, &m.Status, &m.ExpiresAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		markets = append(markets, m)
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(markets)
}

type resolveRequest struct {
	MarketID int    `json:"market_id"`
	Outcome  string `json:"outcome"`
	Evidence string `json:"evidence"`
}

func HandleResolveMarket(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if !requireOracle(w, r) {
		return
	}

	var req resolveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	req.Outcome = strings.ToUpper(req.Outcome)
	if req.Outcome != "YES" && req.Outcome != "NO" {
		http.Error(w, "outcome must be YES or NO", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	// 1. Update market state
	_, err = tx.Exec(ctx,
		`UPDATE markets SET status = 'RESOLVED', resolved_outcome = $1, resolution_evidence = $2, resolved_at = NOW() WHERE id = $3`,
		req.Outcome, req.Evidence, req.MarketID,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 2. Pay out 100 cents ($1.00) per winning share to holders!
	rows, err := tx.Query(ctx,
		`SELECT user_id, shares FROM positions WHERE market_id = $1 AND outcome = $2 AND shares > 0`,
		req.MarketID, req.Outcome,
	)
	if err == nil {
		type payout struct {
			userID string
			shares int
		}
		var payouts []payout
		for rows.Next() {
			var p payout
			if err := rows.Scan(&p.userID, &p.shares); err == nil {
				payouts = append(payouts, p)
			}
		}
		rows.Close()

		for _, p := range payouts {
			payoutCents := int64(p.shares * 100)
			_, _ = tx.Exec(ctx,
				`UPDATE users SET balance_cents = balance_cents + $1 WHERE id = $2`,
				payoutCents, p.userID,
			)
		}
	}

	// 3. Mark all open orders as CANCELLED
	_, _ = tx.Exec(ctx, `UPDATE orders SET status = 'CANCELLED' WHERE market_id = $1 AND status = 'OPEN'`, req.MarketID)

	if err := tx.Commit(ctx); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// 4. Clean up Redis order books
	_ = cache.Client.Del(ctx, fmt.Sprintf("market:%d:YES:bids", req.MarketID), fmt.Sprintf("market:%d:YES:asks", req.MarketID)).Err()
	_ = cache.Client.Del(ctx, fmt.Sprintf("market:%d:NO:bids", req.MarketID), fmt.Sprintf("market:%d:NO:asks", req.MarketID)).Err()

	ws.BroadcastOrderBook(req.MarketID, "YES")

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"status":    "resolved",
		"market_id": req.MarketID,
		"outcome":   req.Outcome,
		"evidence":  req.Evidence,
	})
}

func DemoUserID() string {
	if id := os.Getenv("DEMO_USER_ID"); id != "" {
		return id
	}
	return "00000000-0000-0000-0000-000000000001"
}
