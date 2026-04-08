# Event AI Assignment


This guide provides detailed, step-by-step instructions on how to set up, run, and interact with the Protex backend and frontend services. The entire infrastructure is containerized and relies on Docker.

---

## Prerequisites

Before you begin, ensure you have the following installed on your machine:
*   **Git** (to clone the repository)
*   **Docker** & **Docker Compose** (to build and run the multi-container setup)

---

## Getting Started

### 1. Clone the Repository
Open your terminal and clone the project from GitHub, then navigate into the project directory:
```bash
git clone https://github.com/aryansingh920/event_assignment.git
cd event_assignment
```

### 2. Configure Environment Variables
Create a file named `.env` in the **root** directory of the project. This file is critical as all services (Node API, Python workers, React client, PostgreSQL, etc.) depend on it to communicate.

Paste the following configuration into your `.env` file:

```env
# API
API_PORT=8080

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=testuser
DB_PASSWORD=testpassword123
DB_NAME=testdb

# Kafka
KAFKA_BROKERS=kafka:9092
KAFKA_CLIENT_ID=event-producer-service
KAFKA_TOPIC_NAME=event-commands

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Client
CLIENT_PORT=3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_WS_URL=ws://localhost:8001

# WebSocket service
WS_HOST=0.0.0.0
WS_PORT=8001
```

### 3. Build and Start the Services
To spin up the entire architecture, run the following command in the root directory:

```bash
docker compose up --build
```

*Note: The initial build may take a few minutes as it downloads the base images (Postgres, Redis, Kafka, Node, Python) and installs dependencies for the client, API, and background workers.* 

Docker Compose will respect the `healthcheck` conditions, ensuring that databases and message brokers are fully initialized before the APIs and consumers attempt to connect.

---

## How to Use the Application

Because this application relies on a background ingestor service rather than manual user registration, you will need to retrieve a generated `user_id` to log into the frontend.

### Step 1: Get a Valid User ID
The `python-ingestor` service automatically populates the database with sample regions, events, and users. 
1. Open your browser or use a tool like cURL/Postman.
2. Navigate to: `http://localhost:8080/api/allUsers` or copy 

```bash
curl -s http://localhost:8080/api/allUsers | python -m json.tool   
``` 
to your terminal.


3. Copy one of the `id` values and note the associated `region` from the JSON response.

### Step 2: Access the Frontend
1. Open your browser and navigate to the React client: **`http://localhost:3000`**
2. Use the `user_id` you copied to log into the application.
3. You will now be authenticated and placed in the dashboard to view and claim events specific to that user's region.

---

## API Endpoints Reference

The Node.js backend exposes the following RESTful routes under the `/api` prefix (accessible at `http://localhost:8080/api/...`):

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/` | Health check / Hello world route. |
| **POST** | `/login` | Authenticates a user based on `user_id` and region. |
| **GET** | `/allAvailableRegions` | Retrieves a list of all active regions. |
| **GET** | `/allUsers` | Retrieves all ingested users (Useful for fetching mock login credentials). |
| **GET** | `/event` | Retrieves available, unexpired events scoped to the logged-in user's region. |
| **GET** | `/allEvents` | Retrieves a master list of all events in the system. |
| **POST** | `/claim` | Claims a specific event for a user. Publishes to Kafka and sets a 15-minute Redis lock. |
| **POST** | `/acknowledge`| Acknowledges a claimed event, marking the task as complete. |

---

## Architecture Overview

When you run `docker compose up`, the following services are spun up:

*   **postgres_db (`postgres:16`)**: The primary relational database holding users, events, and statuses. Initializes via `/database/schema/schema.sql`.
*   **redis_cache (`redis:7-alpine`)**: Handles the 15-minute distributed locks for claimed events.
*   **kafka_official (`apache/kafka:latest`)**: Message broker facilitating asynchronous event commands (Claims and Acknowledgements).
*   **api_service (`node-api`)**: The core Node.js/Express backend that serves the REST endpoints.
*   **ws_service (`ws-service`)**: Dedicated WebSocket server handling real-time, bi-directional updates to the frontend (e.g., live table updates and timer expirations).
*   **python_ingestor**: Background Python worker that continually mocks and loads region-specific events and users into the system.
*   **python_consumer**: Background Python worker that listens to Kafka topics to process claims, database updates, and Redis key expirations asynchronously.
*   **react_client (`client`)**: The frontend UI built to consume the API and WebSockets.

---

Submitted By - Aryan Singh
aryansingh920@outlook.com
www.aryan-singh.online
