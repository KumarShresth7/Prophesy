package ws

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"github.com/gorilla/websocket"
	"polymarket/internal/cache"
)

var upgrader = websocket.Upgrader{ CheckOrigin: func(r *http.Request) bool { return true } }

type Hub struct {
	mu      sync.RWMutex
	clients map[int]map[*websocket.Conn]bool
}

var MarketHub = &Hub{ clients: make(map[int]map[*websocket.Conn]bool) }

// The JSON wrapper for our multiplexer
type WSPayload struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type TradeMessage struct {
	ID       string `json:"id"`
	Price    int    `json:"price"`
	Quantity int    `json:"quantity"`
	Side     string `json:"side"`
	Time     string `json:"time"`
}

func HandleConnection(w http.ResponseWriter, r *http.Request) {
	marketID, _ := strconv.Atoi(r.URL.Query().Get("marketId"))
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil { return }

	MarketHub.mu.Lock()
	if MarketHub.clients[marketID] == nil { MarketHub.clients[marketID] = make(map[*websocket.Conn]bool) }
	MarketHub.clients[marketID][conn] = true
	MarketHub.mu.Unlock()

	defer func() {
		MarketHub.mu.Lock()
		delete(MarketHub.clients[marketID], conn)
		MarketHub.mu.Unlock()
		conn.Close()
	}()

	// Send initial order book state immediately
	BroadcastOrderBook(marketID, "YES")

	// Listen for incoming chat messages from the frontend
	for {
		var msg WSPayload
		if err := conn.ReadJSON(&msg); err != nil { break }
		
		if msg.Type == "CHAT_MSG" {
			// In production, you query Postgres here to attach the user's stance (YES/NO Holder)
			BroadcastChat(marketID, msg.Data)
		}
	}
}

func broadcast(marketID int, payload WSPayload) {
	MarketHub.mu.RLock()
	defer MarketHub.mu.RUnlock()
	for client := range MarketHub.clients[marketID] {
		client.WriteJSON(payload)
	}
}

func BroadcastTrade(marketID int, trade TradeMessage) {
	broadcast(marketID, WSPayload{Type: "NEW_TRADE", Data: trade})
}

func BroadcastChat(marketID int, chat interface{}) {
	broadcast(marketID, WSPayload{Type: "CHAT_MSG", Data: chat})
}

// Fetches top 10 from Redis ZSET and wraps it in the ORDER_BOOK type
func BroadcastOrderBook(marketID int, outcome string) {
	ctx := context.Background()
	bidKey := fmt.Sprintf("market:%d:%s:bids", marketID, outcome)
	askKey := fmt.Sprintf("market:%d:%s:asks", marketID, outcome)

	bids, _ := cache.Client.ZRevRangeWithScores(ctx, bidKey, 0, 9).Result()
	asks, _ := cache.Client.ZRangeWithScores(ctx, askKey, 0, 9).Result()

	// Simplified parsing for brevity
	type Level struct { Price int `json:"price"`; Qty int `json:"quantity"` }
	book := map[string][]Level{"bids": {}, "asks": {}}

	for _, z := range bids { book["bids"] = append(book["bids"], Level{Price: int(z.Score), Qty: 10}) }
	for _, z := range asks { book["asks"] = append(book["asks"], Level{Price: int(z.Score), Qty: 10}) }

	broadcast(marketID, WSPayload{Type: "ORDER_BOOK", Data: book})
}