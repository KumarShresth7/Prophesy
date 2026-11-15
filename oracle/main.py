"""Prophesy AI Oracle — FastAPI service for autonomous market resolution."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from agent import resolve_market
from backend_client import BackendClient
from config import settings
from worker import run_expired_market_worker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prophesy.oracle")

backend = BackendClient()
_worker_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _worker_task
    if settings.enable_worker:
        _worker_task = asyncio.create_task(run_expired_market_worker(backend))
        logger.info("Expired-market worker started (interval=%ss)", settings.poll_interval_sec)
    yield
    if _worker_task:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Prophesy Oracle", version="1.0.0", lifespan=lifespan)


class ResolveBody(BaseModel):
    market_id: int
    title: str
    description: str = ""


class ResolveResponse(BaseModel):
    market_id: int
    outcome: str = Field(pattern="^(YES|NO)$")
    evidence: str
    confidence: float = 0.0
    backend_status: str


class BatchResolveResponse(BaseModel):
    resolved: list[ResolveResponse]
    skipped: list[dict[str, Any]]


async def _resolve_and_settle(market_id: int, title: str, description: str) -> ResolveResponse:
    verdict = await asyncio.to_thread(resolve_market, market_id, title, description)
    outcome = verdict["outcome"].upper()
    if outcome not in ("YES", "NO"):
        raise HTTPException(status_code=500, detail="oracle returned invalid outcome")

    backend_resp = await backend.submit_resolution(
        market_id=market_id,
        outcome=outcome,
        evidence=verdict["evidence"],
    )
    return ResolveResponse(
        market_id=market_id,
        outcome=outcome,
        evidence=verdict["evidence"],
        confidence=float(verdict.get("confidence", 0.0)),
        backend_status=backend_resp.get("status", "ok"),
    )


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "prophesy-oracle",
        "openai_configured": bool(settings.openai_api_key),
        "worker_enabled": settings.enable_worker,
    }


@app.get("/markets/expired")
async def list_expired():
    """Proxy expired OPEN markets from the Go backend."""
    try:
        return await backend.list_expired_markets()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/markets/{market_id}")
async def get_market(market_id: int):
    try:
        return await backend.get_market(market_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/resolve", response_model=ResolveResponse)
async def resolve(body: ResolveBody):
    """Resolve a market from explicit title/description (manual or test)."""
    return await _resolve_and_settle(body.market_id, body.title, body.description)


@app.post("/resolve/{market_id}", response_model=ResolveResponse)
async def resolve_by_id(market_id: int):
    """Fetch market from backend, run oracle pipeline, and settle."""
    try:
        market = await backend.get_market(market_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"market not found: {exc}") from exc

    if market.get("status") == "RESOLVED":
        raise HTTPException(
            status_code=409,
            detail=f"market already resolved to {market.get('resolved_outcome')}",
        )

    return await _resolve_and_settle(
        market_id=market_id,
        title=market["title"],
        description=market.get("description", ""),
    )


@app.post("/resolve/expired", response_model=BatchResolveResponse)
async def resolve_all_expired():
    """Resolve every expired OPEN market (batch job)."""
    expired = await backend.list_expired_markets()
    resolved: list[ResolveResponse] = []
    skipped: list[dict[str, Any]] = []

    for market in expired:
        mid = market["id"]
        try:
            result = await _resolve_and_settle(
                market_id=mid,
                title=market["title"],
                description=market.get("description", ""),
            )
            resolved.append(result)
        except HTTPException as exc:
            skipped.append({"market_id": mid, "reason": exc.detail})
        except Exception as exc:
            skipped.append({"market_id": mid, "reason": str(exc)})

    return BatchResolveResponse(resolved=resolved, skipped=skipped)
