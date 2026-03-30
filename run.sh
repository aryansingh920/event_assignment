#!/bin/zsh

docker compose down -v
docker compose up --build

clear && docker compose down && sudo rm -rf ./postgres_data && docker compose up --build

docker exec -it postgres_db psql -U admin -d mydb
# \dt
# SELECT COUNT(*) FROM events;
# SELECT * FROM events LIMIT 5;
# \q

# rebuild just 1 service
docker compose up -d --build python-consumer
docker compose up -d --build ws-service
docker compose up -d --build node-api
docker compose up -d --build client
