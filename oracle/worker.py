"""Background worker that polls for expired markets and resolves them."""

from __future__ import annotations

import asyncio
import logging

from agent import resolve_market
from backend_client import BackendClient
from config import settings

logger = logging.getLogger("prophesy.oracle.worker")


async def run_expired_market_worker(client: BackendClient) -> None:
    while True:
        try:
            expired = await client.list_expired_markets()
            if expired:
                logger.info("Found %d expired market(s) to resolve", len(expired))
            for market in expired:
                mid = market["id"]
                try:
                    verdict = await asyncio.to_thread(
                        resolve_market,
                        mid,
                        market["title"],
                        market.get("description", ""),
                    )
                    await client.submit_resolution(
                        market_id=mid,
                        outcome=verdict["outcome"],
                        evidence=verdict["evidence"],
                    )
                    logger.info("Resolved market #%s → %s", mid, verdict["outcome"])
                except Exception as exc:
                    logger.error("Failed to resolve market #%s: %s", mid, exc)
        except Exception as exc:
            logger.error("Worker poll failed: %s", exc)

        await asyncio.sleep(settings.poll_interval_sec)
