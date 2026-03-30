#!/bin/zsh


# Build the service
docker compose up --build


# Get Users
 curl -s http://localhost:8080/api/allUsers | python -m json.tool   
