import asyncio
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # region -> set of (websocket, user_id)
        self._clients: dict[str, set] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def add(self, ws, region: str, user_id: str):
        async with self._lock:
            self._clients[region].add((ws, user_id))
        logger.info(f"[WS] Connected user={user_id} region={region} "
                    f"total_in_region={len(self._clients[region])}")

    async def remove(self, ws, region: str, user_id: str):
        async with self._lock:
            self._clients[region].discard((ws, user_id))
            if not self._clients[region]:
                del self._clients[region]
        logger.info(f"[WS] Disconnected user={user_id} region={region}")

    async def broadcast_to_region(self, region: str, payload: str):
        """Push a JSON string to every client in the region."""
        async with self._lock:
            targets = set(self._clients.get(region, set()))  # snapshot

        if not targets:
            logger.debug(
                f"[WS] No clients in region={region}, skipping broadcast")
            return

        await self._send_to_targets(targets, region, payload)

    async def broadcast_to_all(self, payload: str):
        """Push a JSON string to every client across all regions."""
        async with self._lock:
            targets = set()
            for clients in self._clients.values():
                targets.update(clients)

        if not targets:
            logger.debug("[WS] No clients connected, skipping broadcast")
            return

        await self._send_to_targets(targets, "ALL_REGIONS", payload)

    async def _send_to_targets(self, targets, region_label, payload):
        """Helper to send payloads and clean up dead connections."""
        dead = []
        for ws, uid in targets:
            try:
                await ws.send(payload)
                logger.debug(f"[WS] Sent to user={uid} region={region_label}")
            except Exception:
                dead.append((ws, uid))

        if dead:
            async with self._lock:
                for r, clients in self._clients.items():
                    for item in dead:
                        clients.discard(item)
                # Clean up empty regions
                empty_regions = [
                    r for r, clients in self._clients.items() if not clients]
                for r in empty_regions:
                    del self._clients[r]

    def stats(self):
        return {
            r: len(clients)
            for r, clients in self._clients.items()
        }
