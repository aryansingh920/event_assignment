"""
Single entry point for pushing event updates to WebSocket clients.
Import `broadcast` from here in your Kafka listener, Redis listener,
or anywhere else that needs to notify the frontend.
"""
import json
import logging
from service.ws.connection_manager import ConnectionManager

logger = logging.getLogger(__name__)

# Shared singleton — imported by all listeners
manager = ConnectionManager()


async def broadcast(
    region: str,
    event_id: str,
    status: str,                    # "available" | "claimed" | "acknowledged"
    claimed_by: str | None = None,
    claimed_at: str | None = None,
    acknowledged_at: str | None = None,
    # Optional full-event fields (include when a brand-new event appears)
    content: str | None = None,
    created_at: str | None = None,
):
    payload = json.dumps({
        "id": event_id,
        "status": status,
        "region": region,
        "claimed_by": claimed_by,
        "claimed_at": claimed_at,
        "acknowledged_at": acknowledged_at,
        **({"content": content} if content else {}),
        **({"created_at": created_at} if created_at else {}),
    })
    print("User id",claimed_at,claimed_by)
    logger.info(
        f"[BROADCAST] event={event_id} status={status} region={region}")

    # Fault-tolerance: if DB didn't return region, broadcast to all
    if not region:
        await manager.broadcast_to_all(payload)
    else:
        await manager.broadcast_to_region(region, payload)
