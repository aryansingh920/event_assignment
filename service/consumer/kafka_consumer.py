# consumer.py

import os
import json
import threading
from dotenv import load_dotenv
from confluent_kafka import Consumer, KafkaException, KafkaError
from service.module.claim_event import claim_event
from service.cache.lock_redis_claim_event import process_claim
from service.cache.lock_expiry_listener import start_expiry_listener

load_dotenv()


def create_consumer():
    conf = {
        'bootstrap.servers': os.getenv('KAFKA_BROKERS', 'localhost:9092'),
        'group.id': f"{os.getenv('KAFKA_CLIENT_ID')}-group",
        'auto.offset.reset': 'earliest',
        'client.id': os.getenv('KAFKA_CLIENT_ID')
    }

    topic = os.getenv('KAFKA_TOPIC_NAME', 'event-commands')
    consumer = Consumer(conf)

    try:
        consumer.subscribe([topic])
        print(f"Subscribed to topic: {topic}")
        print("Waiting for messages... (Ctrl+C to exit)")

        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue

            if msg.error():
                if msg.error().code() in (KafkaError._PARTITION_EOF,
                                          KafkaError.UNKNOWN_TOPIC_OR_PART):
                    continue
                else:
                    raise KafkaException(msg.error())

            try:
                payload = json.loads(msg.value().decode('utf-8'))

                if payload["type"] == "CLAIM_EVENT":
                    result = process_claim(
                        user_id=payload["payload"]["userId"],
                        event_id=payload["payload"]["eventId"]
                    )
                    if result["status"] == "locked":
                        print(
                            f"Event {result['event_id']} is locked — try again later.")
                    elif result["status"] == "failed":
                        print("Claim failed at DB level.")
                    elif result["status"] == "success":
                        print(f"Claimed: {result['data']}")

            except json.JSONDecodeError:
                print(
                    f"Received non-JSON message: {msg.value().decode('utf-8')}")

    except KeyboardInterrupt:
        print("\nClosing consumer...")
    finally:
        consumer.close()


if __name__ == "__main__":
    # 👇 Start expiry listener in background, then run Kafka consumer as normal
    listener_thread = threading.Thread(
        target=start_expiry_listener, daemon=True)
    listener_thread.start()

    create_consumer() 
