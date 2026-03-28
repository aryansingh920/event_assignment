import { useEffect, useRef } from "react";
import { EventSocket, EventSocketMessage } from "@/lib/socket";

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

  const regionRef = useRef(region);
  const userIdRef = useRef(userId);
  regionRef.current = region;
  userIdRef.current = userId;

  const socketRef = useRef<EventSocket | null>(null);

  const ready = enabled && !!region && !!userId;

  useEffect(() => {
    if (!ready) return;

    // Destroy any previous socket (handles StrictMode double-mount)
    if (socketRef.current) {
      socketRef.current.destroy();
      socketRef.current = null;
    }

    socketRef.current = new EventSocket({
      getRegion: () => regionRef.current,
      getUserId: () => userIdRef.current,
      onMessage: (msg) => onEventUpdateRef.current(msg),
      onStatusChange: (connected) => onConnectionChangeRef.current?.(connected),
    });

    return () => {
      socketRef.current?.destroy();
      socketRef.current = null;
    };
  }, [ready]);
}
