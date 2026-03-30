# service/module/release_acknowledge_event.py

from service.helper.load_query import load_query
from service.helper.get_connection import get_connection
from service.cache.release_redis_key import release_redis_lock
import psycopg2
import psycopg2.extras


def release_acknowledge_event_if_claimed(event_id):

    query = load_query("update", "release_acknowledge_event.sql")
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        # Only updates if status = 'claimed' — safe no-op if already 'completed' etc.
        cur.execute(query, (event_id,))
        result = cur.fetchone()
        


        if result is None:
            print(
                f"Event {event_id} was NOT in 'claimed' state — no change made.")
            return None

        conn.commit()


        release_redis_lock(event_id)

        print(f"Event {event_id} reset to 'available'.")

        print("Result Here", result)
        return dict(result)

    except Exception as e:
        print(f"DB Error while releasing event {event_id}: {e}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            cur.close()
            conn.close()
