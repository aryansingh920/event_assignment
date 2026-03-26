import psycopg2
import psycopg2.extras
import json
import random
import time
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
DB_CONFIG = {
    "dbname": os.getenv("DB_NAME", "postgres"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "password"),
    "host": os.getenv("DB_HOST", "localhost"),
    "port": os.getenv("DB_PORT", "5432")
}

REGIONS = [
    # Original
    'Asia', 'Europe', 'US', 'Africa', 'LATAM',
    # Extended
    'South Asia', 'Southeast Asia', 'East Asia', 'Central Asia',
    'Middle East', 'North Africa', 'Sub-Saharan Africa',
    'Western Europe', 'Eastern Europe', 'Northern Europe', 'Southern Europe',
    'North America', 'Central America', 'Caribbean',
    'South America', 'Oceania', 'Pacific Islands',
    'Scandinavia', 'Balkans', 'Caucasus',
    'UK', 'Canada', 'Australia', 'India', 'China', 'Brazil', 'Japan'
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

# ──────────────────────────────────────────────
# Single event ingestion (original behavior)
# ──────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def ingest_random_event():
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        region = random.choice(REGIONS)
        content = random.choice(CONTENTS)

        # Load SQL from file
        with open(os.path.join(BASE_DIR, "..", "database", "query", "ingestorInsert.sql"), "r") as f:
            insert_query = f.read()

        cur.execute(insert_query, (content, region))
        event_id = cur.fetchone()[0]
        conn.commit()

        print(
            f"[{datetime.now().strftime('%H:%M:%S')}] Injected: {region} | ID: {event_id}")

    except Exception as e:
        print(f"Ingestion Error: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()
# ──────────────────────────────────────────────
# Bulk ingestion using execute_values (fast)
# ──────────────────────────────────────────────


def ingest_bulk(count: int = 1000, batch_size: int = 100):
    """
    Insert `count` events in batches of `batch_size`.
    Uses psycopg2.extras.execute_values for high-speed bulk insert.
    """
    conn = None
    total_inserted = 0
    start = time.time()

    try:
        conn = get_connection()
        cur = conn.cursor()

        print(
            f"\n📦 Starting bulk ingestion: {count} events in batches of {batch_size}...")

        for batch_start in range(0, count, batch_size):
            batch_count = min(batch_size, count - batch_start)

            rows = [
                (random.choice(CONTENTS), random.choice(REGIONS), 'available')
                for _ in range(batch_count)
            ]

            psycopg2.extras.execute_values(
                cur,
                "INSERT INTO events (content, region, status) VALUES %s",
                rows
            )
            conn.commit()
            total_inserted += batch_count

            elapsed = time.time() - start
            rate = total_inserted / elapsed if elapsed > 0 else 0
            print(f"  ✅ Batch done | Inserted: {total_inserted}/{count} | "
                  f"Rate: {rate:.0f} rows/sec | Elapsed: {elapsed:.1f}s")

        elapsed = time.time() - start
        print(f"\n🎉 Bulk ingestion complete!")
        print(f"   Total inserted : {total_inserted}")
        print(f"   Total time     : {elapsed:.2f}s")
        print(f"   Avg rate       : {total_inserted / elapsed:.0f} rows/sec\n")

    except Exception as e:
        print(f"❌ Bulk Ingestion Error: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()


def get_connection():
    return psycopg2.connect(**DB_CONFIG)


# ──────────────────────────────────────────────
# Entry point — choose mode via env or arg
# ──────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    mode = sys.argv[1] if len(sys.argv) > 1 else "stream"

    if mode == "bulk":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
        batch = int(sys.argv[3]) if len(sys.argv) > 3 else 100
        ingest_bulk(count=count, batch_size=batch)

    else:
        print("✨ Starting Event Ingestor in STREAM mode (Ctrl+C to stop)...")
        while True:
            ingest_random_event()
            time.sleep(random.randint(1,5))
