import asyncio
import logging
import os
from urllib.parse import urlparse, parse_qs

import websockets
from broadcaster import manager
from service.listeners.redis_listener import run_redis_listener
from service.listeners.kafka_listener import run_kafka_listener

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

WS_HOST = os.getenv("WS_HOST", "0.0.0.0")
WS_PORT = int(os.getenv("WS_PORT", 8000))


async def ws_handler(websocket):
    """
    Endpoint: ws://host:<WS_PORT>/ws/events?region=X&userId=Y
    """
    parsed = urlparse(websocket.request.path)
    params = parse_qs(parsed.query)

    region = (params.get("region") or [""])[0]
    user_id = (params.get("userId") or [""])[0]

    if not region or not user_id:
        await websocket.close(1008, "region and userId query params are required")
        return

    await manager.add(websocket, region, user_id)
    try:
        # Keep-alive — we only push; await here to detect client disconnect
        async for _ in websocket:
            pass
    finally:
        await manager.remove(websocket, region, user_id)


async def main():
    loop = asyncio.get_running_loop()

    kafka_task = asyncio.create_task(run_kafka_listener(loop))
    redis_task = asyncio.create_task(run_redis_listener(loop))

    logger.info(f"[WS] Server starting on ws://{WS_HOST}:{WS_PORT}")

    async with websockets.serve(ws_handler, WS_HOST, WS_PORT):
        logger.info(f"[WS] Listening on ws://{WS_HOST}:{WS_PORT}/ws/events")
        await asyncio.gather(kafka_task, redis_task)


if __name__ == "__main__":
    asyncio.run(main())
