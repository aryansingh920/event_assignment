import os
import json
import threading
from dotenv import load_dotenv
from confluent_kafka import Consumer, Producer, KafkaException, KafkaError
from service.cache.lock_redis_claim_event import process_claim
from service.module.release_event import release_event_if_claimed
from service.module.release_acknowledge_event import release_acknowledge_event_if_claimed

load_dotenv()

WS_TOPIC = os.getenv("KAFKA_WS_TOPIC", "ws-events")


def _make_producer() -> Producer:
    return Producer({
        "bootstrap.servers": os.getenv("KAFKA_BROKERS", "localhost:9092"),
        "client.id": f"{os.getenv('KAFKA_CLIENT_ID', 'consumer')}-producer",
    })


def _publish_ws_event(producer: Producer, event_type: str, data: dict):
    """Publish a processed result to the ws-events topic for the WS service."""
    # ADDED: default=str to correctly serialize datetime objects
    payload = json.dumps({"type": event_type, "data": data},
                         default=str).encode("utf-8")
    producer.produce(WS_TOPIC, value=payload)
    producer.poll(0)  # trigger delivery callbacks without blocking


def create_consumer():
    conf = {
        "bootstrap.servers": os.getenv("KAFKA_BROKERS", "localhost:9092"),
        "group.id": f"{os.getenv('KAFKA_CLIENT_ID')}-group",
        "auto.offset.reset": "earliest",
        "client.id": os.getenv("KAFKA_CLIENT_ID"),
    }

    topic = os.getenv("KAFKA_TOPIC_NAME", "event-commands")
    consumer = Consumer(conf)
    producer = _make_producer()

    try:
        consumer.subscribe([topic])
        print(f"Subscribed to topic: {topic}")
        print("Waiting for messages... (Ctrl+C to exit)")

        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue

            if msg.error():
                if msg.error().code() in (
                    KafkaError._PARTITION_EOF,
                    KafkaError.UNKNOWN_TOPIC_OR_PART,
                ):
                    continue
                else:
                    raise KafkaException(msg.error())

            try:
                payload = json.loads(msg.value().decode("utf-8"))
            except json.JSONDecodeError:
                print(
                    f"Received non-JSON message: {msg.value().decode('utf-8')}")
                continue

            if payload["type"] == "CLAIM_EVENT":
                user_id = payload["payload"]["userId"]
                event_id = payload["payload"]["eventId"]

                result = process_claim(user_id=user_id, event_id=event_id)

                if result["status"] == "locked":
                    print(f"Event {event_id} is locked — try again later.")
                elif result["status"] == "failed":
                    print("Claim failed at DB level.")
                elif result["status"] == "success":
                    print(f"Claimed: {result['data']}")
                    _publish_ws_event(
                        producer, "EVENT_CLAIMED", result["data"])

            if payload["type"] == "ACKNOWLEDGE_EVENT":
                user_id = payload["payload"]["userId"]
                event_id = payload["payload"]["eventId"]
                result = release_acknowledge_event_if_claimed(
                    event_id=event_id)
                print("result", result)
                if result:
                    _publish_ws_event(producer, "EVENT_ACKNOWLEDGED", result)




    except KeyboardInterrupt:
        print("\nClosing consumer...")
    finally:
        producer.flush()
        consumer.close()


if __name__ == "__main__":
    # listener_thread = threading.Thread(
    #     target=start_expiry_listener, daemon=True)
    # listener_thread.start()

    create_consumer()
