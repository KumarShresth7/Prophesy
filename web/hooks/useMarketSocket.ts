"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type OrderLevel = { price: number; quantity: number };
export type OrderBookData = { bids: OrderLevel[]; asks: OrderLevel[] };

export type TradeTape = {
  id: string;
  price: number;
  quantity: number;
  side: "BUY" | "SELL";
  time: string;
};

export type ChatMessage = {
  id?: string;
  user: string;
  text: string;
  stance: "YES" | "NO" | "SPECTATOR";
  time: string;
};

type WSPayload = {
  type: "ORDER_BOOK" | "NEW_TRADE" | "CHAT_MSG";
  data: unknown;
};

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

export function useMarketSocket(marketId: number) {
  const [book, setBook] = useState<OrderBookData | null>(null);
  const [trades, setTrades] = useState<TradeTape[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`${WS_URL}/ws?marketId=${marketId}`);
    wsRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const payload: WSPayload = JSON.parse(event.data);
      if (payload.type === "ORDER_BOOK") {
        setBook(payload.data as OrderBookData);
      }
      if (payload.type === "NEW_TRADE") {
        const t = payload.data as TradeTape;
        setTrades((prev) => [t, ...prev].slice(0, 50));
      }
      if (payload.type === "CHAT_MSG") {
        const msg = payload.data as ChatMessage;
        setMessages((prev) => [...prev, msg]);
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [marketId]);

  const sendChat = useCallback((text: string, user = "You", stance: ChatMessage["stance"] = "SPECTATOR") => {
    const msg: ChatMessage = {
      id: Date.now().toString(),
      user,
      text,
      stance,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    wsRef.current?.send(JSON.stringify({ type: "CHAT_MSG", data: msg }));
    setMessages((prev) => [...prev, msg]);
  }, []);

  return { book, trades, messages, isConnected, sendChat, wsRef };
}
