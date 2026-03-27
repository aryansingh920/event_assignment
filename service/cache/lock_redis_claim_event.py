import redis
import os
from service.module.claim_event import claim_event

# Connect to Redis (assuming 'redis' is the service name in docker-compose)
r = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'),
                port=os.getenv('REDIS_PORT',6379), decode_responses=True)


def process_claim(user_id, event_id):
    lock_key = f"lock:event:{event_id}"
    is_locked = r.set(lock_key, user_id, ex=900, nx=True)

    if not is_locked:
        return {"status": "locked", "event_id": event_id, "data": None}

    event_data = claim_event(user_id, event_id)

    if not event_data:
        r.delete(lock_key)
        return {"status": "failed", "event_id": event_id, "data": None}

    return {"status": "success", "event_id": event_id, "data": event_data}
