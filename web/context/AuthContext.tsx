"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  balance_cents: number;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  loginDemo: (role?: "demo_trader" | "liquidity_bot") => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  claimFaucet: () => Promise<number>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        return data;
      } else {
        // Token expired or invalid
        localStorage.removeItem("prophesy_token");
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error("Failed to fetch user session:", err);
    }
    return null;
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("prophesy_token");
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser(savedToken).finally(() => setIsLoading(false));
    } else {
      // Auto-load demo session if no token is saved so users can test immediately
      const savedUser = localStorage.getItem("prophesy_demo_user");
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    }
  }, [fetchCurrentUser]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Login failed");
      }
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("prophesy_token", data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Registration failed");
      }
      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("prophesy_token", data.token);
    } finally {
      setIsLoading(false);
    }
  };

  const loginDemo = async (role: "demo_trader" | "liquidity_bot" = "demo_trader") => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ as: role }),
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem("prophesy_token", data.token);
      } else {
        // Fallback offline mock demo trader
        const fallbackUser: User = {
          id: role === "liquidity_bot" ? "00000000-0000-0000-0000-000000000002" : "00000000-0000-0000-0000-000000000001",
          username: role,
          email: `${role}@prophesy.market`,
          role: role === "liquidity_bot" ? "BOT" : "TRADER",
          balance_cents: role === "liquidity_bot" ? 5000000 : 1000000,
        };
        setUser(fallbackUser);
        localStorage.setItem("prophesy_demo_user", JSON.stringify(fallbackUser));
      }
    } catch {
      const fallbackUser: User = {
        id: "00000000-0000-0000-0000-000000000001",
        username: "demo_trader",
        email: "demo@prophesy.market",
        role: "TRADER",
        balance_cents: 1000000,
      };
      setUser(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("prophesy_token");
    localStorage.removeItem("prophesy_demo_user");
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser(token);
    } else if (user?.id) {
      try {
        const res = await fetch(`${API_URL}/api/user/portfolio`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.balance_cents !== undefined) {
            setUser((prev) => (prev ? { ...prev, balance_cents: data.balance_cents } : prev));
          }
        }
      } catch {
        // ignore
      }
    }
  };

  const claimFaucet = async (): Promise<number> => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/user/faucet`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        setUser((prev) => (prev ? { ...prev, balance_cents: data.balance_cents } : prev));
        return data.balance_cents;
      }
    } catch (err) {
      console.error("Faucet request error:", err);
    }
    // Optimistic fallback
    const newBal = (user?.balance_cents ?? 1000000) + 100000;
    setUser((prev) => (prev ? { ...prev, balance_cents: newBal } : prev));
    return newBal;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginDemo,
        logout,
        refreshUser,
        claimFaucet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
