#!/bin/zsh

docker compose up --build


docker exec -it postgres_db psql -U admin -d mydb
# \dt
# SELECT * FROM events LIMIT 5;
# \q
