const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8001";

export interface EventSocketMessage {
  id: string;
  status: "available" | "claimed" | "acknowledged";
  region: string;
  claimed_by: string | null;
  claimed_at: string | null;
  acknowledged_at: string | null;
  content?: string;
  created_at?: string;
}

export type EventSocketHandler = (msg: EventSocketMessage) => void;

export class EventSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;
  private getRegion: () => string;
  private getUserId: () => string;
  private onMessage: EventSocketHandler;
  private onStatusChange?: (connected: boolean) => void;

  constructor(opts: {
    getRegion: () => string;
    getUserId: () => string;
    onMessage: EventSocketHandler;
    onStatusChange?: (connected: boolean) => void;
  }) {
    this.getRegion = opts.getRegion;
    this.getUserId = opts.getUserId;
    this.onMessage = opts.onMessage;
    this.onStatusChange = opts.onStatusChange;
    this.connect();
  }

  private connect() {
    if (this.destroyed) return;

    const cleanWsUrl = WS_URL.replace(/^http/, "ws");

    const url =
      `${cleanWsUrl}/ws/events` +
      `?region=${encodeURIComponent(this.getRegion())}` +
      `&userId=${encodeURIComponent(this.getUserId())}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => this.onStatusChange?.(true);

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as EventSocketMessage;
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
