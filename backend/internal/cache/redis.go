package cache

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

var Client *redis.Client

func normalizeRedisURL(redisURL string) (string, error) {
	u, err := url.Parse(redisURL)
	if err != nil {
		return "", err
	}
	if strings.HasSuffix(u.Hostname(), ".upstash.io") && u.Scheme == "redis" {
		u.Scheme = "rediss"
		return u.String(), nil
	}
	return redisURL, nil
}

func InitRedis(redisURL string) error {
	redisURL, err := normalizeRedisURL(redisURL)
	if err != nil {
		return fmt.Errorf("invalid redis URL: %v", err)
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return fmt.Errorf("invalid redis URL: %v", err)
	}

	Client = redis.NewClient(opt)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_, err = Client.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("redis ping failed: %v", err)
	}

	fmt.Println("Redis connected successfully")
	return nil
}

