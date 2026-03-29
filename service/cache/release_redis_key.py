"""
service/cache/release_redis_key.py

Single Redis client instance + shared lock-release utility.
Import `redis_client` wherever a raw Redis connection is needed,
and `release_redis_lock` wherever a lock:event:<id> key must be deleted.
"""
import logging
import os
import redis

logger = logging.getLogger(__name__)

# One shared client — imported by both this module's consumers
redis_client = redis.Redis(
    host=os.getenv("REDIS_HOST", "redis"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    decode_responses=True,
)


def release_redis_lock(event_id: str) -> bool:
    """
    Deletes the lock:event:<event_id> key from Redis.

    Returns:
        True  — key existed and was deleted.
        False — key was already gone (no-op, not an error).
    """
    key = f"lock:event:{event_id}"
    # returns number of keys deleted (0 or 1)
    deleted = redis_client.delete(key)

    if deleted:
        logger.info(f"[REDIS] Released lock key '{key}'")
        return True

    logger.debug(f"[REDIS] Lock key '{key}' was already absent — no-op")
    return False
