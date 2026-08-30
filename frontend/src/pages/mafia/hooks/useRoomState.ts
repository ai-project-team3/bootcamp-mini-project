import { useEffect, useState } from "react";
import { getRoomState } from "../api/client";
import type { RoomState } from "../api/types";

const POLL_INTERVAL_MS = 1000;

export function useRoomState(roomId: string | null) {
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const next = await getRoomState(roomId);
        if (!cancelled) {
          setState(next);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      }
    };

    poll();
    const intervalId = window.setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [roomId]);

  return { state, error };
}
