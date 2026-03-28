"""
Listens on the `ws-events` topic for processed outcomes published by the
kafka_consumer service, then broadcasts the update to frontend WebSocket clients.

The consumer handles the claim logic (Redis lock + DB write).
Once it succeeds it publishes an EVENT_CLAIMED message here, and we broadcast it.
"""
import asyncio
import json
import logging
import os

from confluent_kafka import Consumer, KafkaError, KafkaException
from service.ws.broadcaster import broadcast

logger = logging.getLogger(__name__)

WS_TOPIC = os.getenv("KAFKA_WS_TOPIC", "ws-events")


def _make_consumer() -> Consumer:
    return Consumer({
        "bootstrap.servers": os.getenv("KAFKA_BROKERS", "localhost:9092"),
        "group.id": f"{os.getenv('KAFKA_CLIENT_ID', 'ws-service')}-ws-group",
        "auto.offset.reset": "earliest",
        "client.id": f"{os.getenv('KAFKA_CLIENT_ID', 'ws-service')}-ws",
    })


async def run_kafka_listener(loop: asyncio.AbstractEventLoop):
    """
    Runs the blocking confluent_kafka poll in a thread executor so it
    doesn't block the asyncio event loop.
    """
    consumer = _make_consumer()
    consumer.subscribe([WS_TOPIC])
    logger.info(f"[KAFKA-WS] Subscribed to topic={WS_TOPIC}")

    def poll_loop():
        while True:
            msg = consumer.poll(timeout=1.0)
            if msg is None:
                continue
            if msg.error():
                code = msg.error().code()
                if code in (KafkaError._PARTITION_EOF,
                            KafkaError.UNKNOWN_TOPIC_OR_PART):
                    continue
                raise KafkaException(msg.error())

            try:
                payload = json.loads(msg.value().decode("utf-8"))
            except json.JSONDecodeError:
                continue

            msg_type = payload.get("type")
            event_data = payload.get("data", {})

            # ── CLAIM ─────────────────────────────────────────────────────────
            if msg_type == "EVENT_CLAIMED":
                asyncio.run_coroutine_threadsafe(
                    broadcast(
                        region=event_data.get("region", ""),
                        event_id=event_data.get("id", ""),
                        status="claimed",
                        claimed_by=event_data.get("claimed_by"),
                        claimed_at=str(event_data.get("claimed_at", "")),
                    ),
                    loop,
                )
                logger.info(f"[KAFKA-WS] Broadcast claimed for event={event_data.get('id')}")

            # ── ACKNOWLEDGE ───────────────────────────────────────────────────
            elif msg_type == "EVENT_ACKNOWLEDGED":
                asyncio.run_coroutine_threadsafe(
                    broadcast(
                        region=event_data.get("region", ""),
                        event_id=event_data.get("id", ""),
                        status="acknowledged",
                        claimed_by=event_data.get("claimed_by"),
                        claimed_at=str(event_data.get("claimed_at", "")),
                        acknowledged_at=str(event_data.get("acknowledged_at", "")),
                    ),
                    loop,
                )
                logger.info(f"[KAFKA-WS] Broadcast acknowledged for event={event_data.get('id')}")

    await loop.run_in_executor(None, poll_loop)
