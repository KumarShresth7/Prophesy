package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL  string
	RedisURL     string
	Port         string
	CORSOrigin   string
	OracleSecret string
}

func Load() Config {
	_ = godotenv.Load()
	return Config{
		DatabaseURL:  getenv("DATABASE_URL", "postgres://prophesy:prophesy@localhost:5432/prophesy?sslmode=disable"),
		RedisURL:     getenv("REDIS_URL", "redis://localhost:6379"),
		Port:         getenv("PORT", "8080"),
		CORSOrigin:   getenv("CORS_ORIGIN", "http://localhost:3000"),
		OracleSecret: getenv("ORACLE_SECRET", "dev-oracle-secret"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
