package auth

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"
)

var (
	ErrInvalidToken = errors.New("invalid or expired token")
	ErrUnauthorized = errors.New("unauthorized")
)

type userContextKey string

const UserKey userContextKey = "authenticated_user"

type Claims struct {
	UserID   string `json:"sub"`
	Username string `json:"username"`
	Role     string `json:"role"`
	Exp      int64  `json:"exp"`
	Iat      int64  `json:"iat"`
}

func getSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "prophesy-super-secret-production-key-2024"
	}
	return []byte(secret)
}

func HashPassword(password string) string {
	h := hmac.New(sha256.New, getSecret())
	h.Write([]byte(password))
	return hex.EncodeToString(h.Sum(nil))
}

func CheckPassword(password, hash string) bool {
	// Support quick demo logins or empty hash defaults
	if hash == "" && password == "password123" {
		return true
	}
	expected := HashPassword(password)
	return hmac.Equal([]byte(expected), []byte(hash))
}

func GenerateToken(userID, username, role string) (string, error) {
	headerJSON, _ := json.Marshal(map[string]string{"alg": "HS256", "typ": "JWT"})
	headerB64 := base64.RawURLEncoding.EncodeToString(headerJSON)

	now := time.Now()
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		Iat:      now.Unix(),
		Exp:      now.Add(7 * 24 * time.Hour).Unix(),
	}
	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	claimsB64 := base64.RawURLEncoding.EncodeToString(claimsJSON)

	unsignedToken := headerB64 + "." + claimsB64
	sig := signHmac(unsignedToken)
	return unsignedToken + "." + sig, nil
}

func ValidateToken(tokenStr string) (*Claims, error) {
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return nil, ErrInvalidToken
	}

	unsignedToken := parts[0] + "." + parts[1]
	expectedSig := signHmac(unsignedToken)
	if !hmac.Equal([]byte(parts[2]), []byte(expectedSig)) {
		return nil, ErrInvalidToken
	}

	claimsJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrInvalidToken
	}

	var claims Claims
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return nil, ErrInvalidToken
	}

	if claims.Exp > 0 && time.Now().Unix() > claims.Exp {
		return nil, ErrInvalidToken
	}

	return &claims, nil
}

func signHmac(message string) string {
	h := hmac.New(sha256.New, getSecret())
	h.Write([]byte(message))
	return base64.RawURLEncoding.EncodeToString(h.Sum(nil))
}

func ContextWithUser(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, UserKey, claims)
}

func UserFromContext(ctx context.Context) (*Claims, bool) {
	claims, ok := ctx.Value(UserKey).(*Claims)
	return claims, ok
}

// ExtractBearerToken reads the token from the Authorization header
func ExtractBearerToken(r *http.Request) string {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return ""
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
		return strings.TrimSpace(parts[1])
	}
	return ""
}
