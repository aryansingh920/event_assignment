# Protex: System Architecture & LLM Collaboration Strategy

This document outlines the technical design, architectural philosophy, and the strategic use of Generative AI in the development of the Protex Region-Aware Event Assignment System.

---

## Architectural Philosophy
The core of Protex is a **Resilient, Event-Driven Real-time System**. The architecture is designed to ensure data integrity and high availability across distributed services, managing the lifecycle of events (Available → Claimed → Acknowledged/Expired) with multi-layered validation.

### The Triple-Lock Validation Strategy
To prevent race conditions and ensure system reliability, checks are implemented at three distinct levels:
1.  **Node.js API Level:** Initial validation of user-region mapping and state integrity.
2.  **Kafka Consumer Level:** Distributed locking via Redis to ensure single-moderator assignment.
3.  **Database (SQL) Level:** Atomic transactions and conditional updates (`WHERE status = 'claimed'`) as the final source of truth.



---

## Technical Design & Flow

### 1. The Backend (Node.js & Express)
*   **Language:** TypeScript for compile-time type safety.
*   **Flow:** When a `claim` or `acknowledge` API is hit, the Node service acts as a producer, offloading the heavy business logic to Kafka to keep the API response times minimal and the system scalable.
*   **Observability:** Integrated Prometheus metrics to monitor service health and system throughput.

### 2. The Processing Layer (Python Consumer & Redis)
*   **Distributed Locking:** Uses a Redis pipeline to manage 15-minute event locks.
*   **State Management:** If a lock expires, a Redis Key-space notification listener triggers a SQL update to revert the event status to `available`.
*   **Asynchronous Flow:** The Python consumer updates the PostgreSQL database and immediately signals the WebSocket service to notify the frontend.

### 3. Real-time Synchronization (WebSockets & Next.js)
*   **Frontend:** Built with Next.js, TypeScript, and Mantine UI.
*   **No-Refresh UI:** The client maintains a persistent WebSocket connection. When an event state changes (Claimed/Acknowledged/Expired), the backend pushes a payload that updates the React DOM via `useEffect` hooks and local state management, eliminating the need for manual polling or page refreshes.

---

## GenAI & LLM Collaboration Disclosure

In the interest of meeting high-standard technical requirements within a condensed timeline, Generative AI was utilized strategically as a "Boilerplate Accelerator." 

### Human-Led Logic (Designed by Me)
*   **Core Business Logic:** Defining the conditions for state transitions and the logic within the Python and Node controllers.
*   **SQL Architecture:** Writing precise queries for atomic updates and complex joins.
*   **System Orchestration:** Designing the inter-service communication flow between Kafka, Redis, and WebSockets.
*   **Refactoring & Debugging:** Correcting and optimizing AI-generated code to ensure production readiness and fixing structural errors.
*   **Infrastructure Design:** Defining the Docker Compose orchestration and environment variable mapping.

### LLM-Assisted Components (Generated via AI)
*   **Boilerplate Scaffolding:** Initial setup of the Express `server.ts`, router structures, and basic controller templates.
*   **Configuration Logic:** Standard connection strings and setup code for `psycopg2` (Postgres), Redis clients, and Kafka producers.
*   **Frontend Components:** Standard HTML/CSS structures (Babel) and UI components via Mantine to expedite the visual build.
*   **Sample Data Ingestion:** The basic Python scripts used by the ingestor to populate the database with mock users and events.
*   **Initial Metrics Setup:** The base Prometheus configuration and `/metrics` endpoint boilerplate.



### Rationale
AI was used to handle repetitive, low-logic tasks (the "plumbing" of the application), allowing the developer to focus 100% on the **high-stakes logic, data integrity, and system resilience** that define a professional moderation platform.

---

## System Metrics & Health
The Node-API exposes a `/metrics` endpoint for Prometheus scraping. This tracks:
*   Device/Service Health.
*   Throughput of event claims.
*   System latency and response times.
