# service/module/release_event.py

from service.helper.load_query import load_query
from service.helper.get_connection import get_connection
import psycopg2
import psycopg2.extras


def release_event_if_claimed(event_id):
    """
    If the event is still in 'claimed' status after the Redis lock expired,
    reset it back to 'available' so it can be claimed again.
    """
    query = load_query("update", "release_event.sql")
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
            return

        conn.commit()
        print(f"Event {event_id} reset to 'available'.")

    except Exception as e:
        print(f"DB Error while releasing event {event_id}: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()
