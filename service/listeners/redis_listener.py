"""
Listens for Redis key expiry events. When a lock:event:<id> key expires,
it means the claim window timed out. We reset the event to 'available' in the
DB and broadcast the update to frontend WebSocket clients.

The existing lock_expiry_listener.py in the consumer service stays untouched;
this one runs inside the WS service and adds the broadcast on top.
"""
import asyncio
import logging
import os
import redis

# The ws/ directory is not a package — add the service root to sys.path
# so we can import from service.module
# sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from service.ws.broadcaster import broadcast
from service.module.release_event import release_event_if_claimed

logger = logging.getLogger(__name__)

r = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True,
)


async def run_redis_listener(loop: asyncio.AbstractEventLoop):
    """
    Runs the blocking Redis pubsub listen() in a thread executor so it
    doesn't block the asyncio event loop.
    """
    r.config_set("notify-keyspace-events", "Ex")
    pubsub = r.pubsub()
    pubsub.psubscribe("__keyevent@0__:expired")
    logger.info("[REDIS-WS] Listening for key expiry events...")

    def listen_loop():
        for message in pubsub.listen():
            if message["type"] != "pmessage":
                continue

            expired_key = message["data"]
            if not expired_key.startswith("lock:event:"):
                continue

            event_id = expired_key.removeprefix("lock:event:")
            logger.info(f"[REDIS-WS] Lock expired for event={event_id}")

            # Returns the updated row dict, or None if event wasn't in 'claimed' state
            released = release_event_if_claimed(event_id)

            if released:
                asyncio.run_coroutine_threadsafe(
                    broadcast(
                        region=released.get("region", ""),
                        event_id=event_id,
                        status="available",
                        claimed_by=None,
                        claimed_at=None,
                    ),
                    loop,
                )
                logger.info(f"[REDIS-WS] Broadcast available for event={event_id}")

    await loop.run_in_executor(None, listen_loop)
