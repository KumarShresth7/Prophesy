"""HTTP client for the Prophesy Go backend."""

from __future__ import annotations

from typing import Any

import httpx

from config import settings


class BackendClient:
    def __init__(self) -> None:
        self._base = settings.backend_url
        self._headers = {"X-Oracle-Secret": settings.oracle_secret}

    async def list_markets(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(f"{self._base}/api/markets")
            resp.raise_for_status()
            return resp.json()

    async def get_market(self, market_id: int) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self._base}/api/markets/detail",
                params={"market_id": market_id},
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def list_expired_markets(self) -> list[dict[str, Any]]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self._base}/api/markets/expired",
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()

    async def submit_resolution(
        self,
        market_id: int,
        outcome: str,
        evidence: str,
    ) -> dict[str, Any]:
        payload = {
            "market_id": market_id,
            "outcome": outcome,
            "evidence": evidence,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self._base}/api/markets/resolve",
                json=payload,
                headers=self._headers,
            )
            resp.raise_for_status()
            return resp.json()
