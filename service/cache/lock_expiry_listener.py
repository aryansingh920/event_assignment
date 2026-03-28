# service/cache/lock_expiry_listener.py

import redis
import os
from service.module.release_event import release_event_if_claimed

r = redis.Redis(
    host=os.getenv('REDIS_HOST', 'redis'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    decode_responses=True
)


def start_expiry_listener():
    """
    Listens for Redis key expiry events.
    Redis must have keyspace notifications enabled:
      CONFIG SET notify-keyspace-events Ex
    """
    # Enable expired key notifications programmatically (idempotent)
    r.config_set("notify-keyspace-events", "Ex")

    pubsub = r.pubsub()

    # Subscribe to ALL key expiry events on DB 0
    pubsub.psubscribe("__keyevent@0__:expired")
    print("Listening for Redis key expiry events...")

    for message in pubsub.listen():
        if message["type"] != "pmessage":
            continue

        expired_key = message["data"]  # e.g. "lock:event:abc-123"

        # Filter only our lock keys
        if not expired_key.startswith("lock:event:"):
            continue

        event_id = expired_key.removeprefix("lock:event:")
        print(f"Lock expired for event: {event_id}. Checking DB status...")

        release_event_if_claimed(event_id)
