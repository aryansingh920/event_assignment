from service.helper.load_query import load_query
from service.helper.get_connection import get_connection
import psycopg2
import psycopg2.extras


def claim_event(user_id, event_id, redis_client, lock_key):
    query = load_query("update", "claim_event.sql")
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)

        cur.execute(query, (user_id, event_id,))
        result = cur.fetchone()

        print("Result", result)

        # IMPORTANT: result is None if the SQL 'WHERE' clause didn't match
        if result is None:
            print(f"DB Claim failed for {event_id}. Releasing Redis lock.")
            redis_client.delete(lock_key)
            return None

        conn.commit()
        print(f"Event {event_id} successfully claimed in DB.")
        return dict(result)

    except Exception as e:
        print(f"Database Error: {e}")
        if conn:
            conn.rollback()
        # Release lock on error so we don't block future attempts due to a crash
        redis_client.delete(lock_key)
        return None
    finally:
        if conn:
            cur.close()
            conn.close()
