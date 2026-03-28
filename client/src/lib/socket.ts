// REST API (node-api) and WS service run on DIFFERENT ports.
// Changed the fallback port from 8000 to 8001 to match your docker-compose ws_service
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";

/**
 * Shape of every message the Python broadcaster sends.
 * The broadcaster always emits all fields; null is used for unset timestamps.
 */
export interface EventSocketMessage {
  id: string;
  status: "available" | "claimed" | "acknowledged";
  region: string;
  claimed_by: string | null;
  claimed_at: string | null;
  acknowledged_at: string | null;
  // Present only when the server pushes a brand-new event
  content?: string;
  created_at?: string;
}

export type EventSocketHandler = (msg: EventSocketMessage) => void;

export class EventSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private region: string;
  private userId: string;
  private onMessage: EventSocketHandler;
  private onStatusChange?: (connected: boolean) => void;

  constructor(opts: {
    region: string;
    userId: string;
    onMessage: EventSocketHandler;
    onStatusChange?: (connected: boolean) => void;
  }) {
    this.region = opts.region;
    this.userId = opts.userId;
    this.onMessage = opts.onMessage;
    this.onStatusChange = opts.onStatusChange;
    this.connect();
  }

  private connect() {
    if (this.destroyed) return;

    // Ensure we are stripping 'http://' or 'https://' if NEXT_PUBLIC_WS_URL was misconfigured
    const cleanWsUrl = WS_URL.replace(/^http/, "ws");

    const url =
      `${cleanWsUrl}/ws/events` +
      `?region=${encodeURIComponent(this.region)}` +
      `&userId=${encodeURIComponent(this.userId)}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => this.onStatusChange?.(true);

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as EventSocketMessage;
        // Minimal guard — id and status are always present
        if (typeof msg.id === "string" && typeof msg.status === "string") {
          this.onMessage(msg);
        }
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = () => {
      this.onStatusChange?.(false);
      if (!this.destroyed) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    this.ws.onerror = () => this.ws?.close();
  }

  destroy() {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
  }
}
