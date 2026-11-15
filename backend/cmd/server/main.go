package main

import (
	"context"
	"log"
	"net/http"

	"polymarket/internal/api"
	"polymarket/internal/cache"
	"polymarket/internal/config"
	"polymarket/internal/db"
	"polymarket/internal/ws"
)

func enableCORS(origin string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqOrigin := r.Header.Get("Origin")
		if reqOrigin != "" {
			w.Header().Set("Access-Control-Allow-Origin", reqOrigin)
		} else if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, DELETE, PUT")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Oracle-Secret")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func handleMarketsRoute(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		api.HandleCreateMarket(w, r)
		return
	}
	api.HandleListMarkets(w, r)
}

func main() {
	cfg := config.Load()

	if err := db.InitPostgres(cfg.DatabaseURL); err != nil {
		log.Println("DB Init Warning (will retry on incoming requests if needed):", err)
	} else {
		log.Println("PostgreSQL connected successfully")
		defer db.Pool.Close()
	}

	if err := cache.InitRedis(cfg.RedisURL); err != nil {
		log.Println("Redis Init Warning (will retry on incoming requests if needed):", err)
	} else {
		log.Println("Redis connected successfully")
		defer cache.Client.Close()
	}

	if db.Pool != nil && cache.Client != nil {
		if err := cache.SeedOrderBooks(context.Background()); err != nil {
			log.Println("order book seed warning:", err)
		}
	}

	api.SetOracleSecret(cfg.OracleSecret)

	// Auth Endpoints
	http.HandleFunc("/api/auth/register", enableCORS(cfg.CORSOrigin, api.HandleRegister))
	http.HandleFunc("/api/auth/login", enableCORS(cfg.CORSOrigin, api.HandleLogin))
	http.HandleFunc("/api/auth/demo", enableCORS(cfg.CORSOrigin, api.HandleDemoLogin))
	http.HandleFunc("/api/auth/me", enableCORS(cfg.CORSOrigin, api.HandleMe))

	// User Portfolio & Faucet
	http.HandleFunc("/api/user/portfolio", enableCORS(cfg.CORSOrigin, api.HandleUserPortfolio))
	http.HandleFunc("/api/user/faucet", enableCORS(cfg.CORSOrigin, api.HandleUserFaucet))

	// Orders
	http.HandleFunc("/api/orders", enableCORS(cfg.CORSOrigin, api.HandlePlaceOrder))
	http.HandleFunc("/api/orders/cancel", enableCORS(cfg.CORSOrigin, api.HandleCancelOrder))

	// Markets
	http.HandleFunc("/api/markets", enableCORS(cfg.CORSOrigin, handleMarketsRoute))
	http.HandleFunc("/api/markets/detail", enableCORS(cfg.CORSOrigin, api.HandleGetMarketDetail))
	http.HandleFunc("/api/markets/expired", enableCORS(cfg.CORSOrigin, api.HandleExpiredMarkets))
	http.HandleFunc("/api/markets/resolve", enableCORS(cfg.CORSOrigin, api.HandleResolveMarket))

	// WebSocket
	http.HandleFunc("/ws", ws.HandleConnection)

	addr := ":" + cfg.Port
	log.Printf("Prophesy engine live on %s", addr)
	log.Fatal(http.ListenAndServe(addr, nil))
}
