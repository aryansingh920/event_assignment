import secrets
import psycopg2
import psycopg2.extras
import random
import os
from datetime import datetime
from dotenv import load_dotenv
from service.helper.load_query import load_query
from service.helper.get_connection import get_connection

load_dotenv()



REGIONS = [
    'Europe', 'US', 'Africa',
    'UK', 'Asia'
]

CONTENTS = [
    # Identity & Hate Speech
    "Flagged comment: Hate speech targeting religion",
    "Flagged comment: Racial slur detected in post",
    "Flagged post: Homophobic language reported",
    "Flagged message: Gender-based harassment",
    "Reported content: Xenophobic remarks in group",

    # Spam & Fraud
    "Spam detected: Mass DM campaign from account",
    "Phishing link reported in public post",
    "Suspected bot account sending bulk messages",
    "Fake giveaway post detected",
    "Fraudulent ad: Misleading product claims",
    "Duplicate account flagged for ban evasion",

    # Misinformation
    "Flagged article: Health misinformation about vaccines",
    "Viral post: Unverified election fraud claims",
    "Reported video: COVID-19 conspiracy theory",
    "Flagged post: Fake celebrity death news",
    "Deepfake video reported by multiple users",

    # Violence & Self-Harm
    "Reported image: Graphic violence in story",
    "Post flagged for self-harm content",
    "Livestream flagged: Potential suicide risk",
    "Reported video: Animal cruelty detected",
    "Comment thread: Escalating violent threats",

    # Copyright & IP
    "Copyright dispute on uploaded music video",
    "DMCA takedown request for streamed movie",
    "Flagged post: Unlicensed image usage",
    "Reported account: Selling pirated software",
    "IP violation: Brand logo misuse in ad",

    # Account & Security
    "Account verification request pending review",
    "Suspicious login attempt from unknown device",
    "Account takeover attempt detected",
    "2FA bypass attempt flagged",
    "Mass report campaign targeting user profile",
    "Review user profile photo for policy compliance",
    "Underage user account flagged for removal",
    "Impersonation complaint: Public figure",

    # Child Safety
    "CSAM report escalated to trust & safety",
    "Grooming behavior flagged in DM thread",
    "Minor account: Inappropriate content exposure",

    # Terrorism & Extremism
    "Flagged group: Extremist recruitment activity",
    "Post promoting terrorist organization content",
    "Reported content: Glorification of violence",
    "Radicalization pattern detected in activity log",
]


USER_PREFIXES = ['mod', 'admin', 'reviewer', 'safety_op', 'guard']

FIRST_NAMES = [
    'James', 'Maria', 'Liam', 'Sofia', 'Noah', 'Aisha', 'Ethan', 'Priya',
    'Lucas', 'Fatima', 'Oliver', 'Yuki', 'Mateo', 'Amara', 'Arjun', 'Chloe',
    'Wei', 'Layla', 'Carlos', 'Zara', 'Ravi', 'Elena', 'Jin', 'Nadia'
]

LAST_NAMES = [
    'Smith', 'Garcia', 'Chen', 'Patel', 'Nguyen', 'Kim', 'Okafor', 'Müller',
    'Santos', 'Ibrahim', 'Tanaka', 'Rossi', 'Ahmed', 'Johansson', 'Diallo',
    'Fernandez', 'Park', 'Sharma', 'Ali', 'Kowalski', 'Tremblay', 'Costa'
]


BASE_DIR = os.path.dirname(os.path.abspath(__file__))







def generate_random_username():
    prefix = random.choice(USER_PREFIXES)
    suffix = secrets.token_hex(4)
    return f"{prefix}_{suffix}"


def generate_random_full_name():
    return random.choice(USER_PREFIXES), random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
# then: (prefix, first_name, last_name) # (part_a, part_b, part_c) in random order


def ingest_event_bulk(count: int = 1000, batch_size: int = 100):
    query = load_query("insert","ingestorEventInsert.sql")
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        for batch_start in range(0, count, batch_size):
            batch_count = min(batch_size, count - batch_start)
            rows = [
                (random.choice(CONTENTS), random.choice(REGIONS), 'available')
                for _ in range(batch_count)
            ]

            # execute_values handles the VALUES %s expansion automatically
            psycopg2.extras.execute_values(cur, query, rows)
            conn.commit()

        print(f"Successfully ingested {count} events.")
    except Exception as e:
        print(f"Event Bulk Error: {e}")
    finally:
        if conn:
            conn.close()


def ingest_bulk_users(count: int = 50):
    query = load_query("insert","ingestorUserInsert.sql")
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        rows = []
        for _ in range(count):
            prefix, first, last = random.choice(USER_PREFIXES), random.choice(
                FIRST_NAMES), random.choice(LAST_NAMES)
            rows.append((
                f"{prefix}_{secrets.token_hex(4)}",
                prefix,
                first,
                last,
                random.choice(REGIONS)
            ))

        psycopg2.extras.execute_values(cur, query, rows)
        conn.commit()
        print(f"Successfully ingested {count} random moderators.")
    except Exception as e:
        print(f"User Bulk Error: {e}")
    finally:
        if conn:
            conn.close()
            
            
            
if __name__ == "__main__":
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "stream"

    if mode == "bulk":
        event_count = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
        user_count = int(sys.argv[3]) 
        
        # batch = int(sys.argv[3]) if len(sys.argv) > 3 else 100
        ingest_bulk_users(user_count)

        ingest_event_bulk(count=event_count, batch_size=100)

