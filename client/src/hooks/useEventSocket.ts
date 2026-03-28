import { useEffect, useRef } from "react";
import { EventSocket, EventSocketMessage } from "@/lib/socket";
// ← removed: import { Event } from "@/lib/api";  (was imported but never used)

interface Options {
  region: string;
  userId: string;
  enabled: boolean;
  onEventUpdate: (updated: EventSocketMessage) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useEventSocket({
  region,
  userId,
  enabled,
  onEventUpdate,
  onConnectionChange,
}: Options) {
  const onEventUpdateRef = useRef(onEventUpdate);
  const onConnectionChangeRef = useRef(onConnectionChange);
  onEventUpdateRef.current = onEventUpdate;
  onConnectionChangeRef.current = onConnectionChange;

  useEffect(() => {
    if (!enabled || !region || !userId) return;

    const socket = new EventSocket({
      region,
      userId,
      onMessage: (msg) => onEventUpdateRef.current(msg),
      onStatusChange: (connected) => onConnectionChangeRef.current?.(connected),
    });

    return () => socket.destroy();
  }, [enabled, region, userId]);
}
