import { useEffect, useState } from "react";

export function useCountdown(deadlineSeconds: number | null): number {
  const [remaining, setRemaining] = useState(() => computeRemaining(deadlineSeconds));

  useEffect(() => {
    setRemaining(computeRemaining(deadlineSeconds));
    if (deadlineSeconds === null) return;

    const intervalId = window.setInterval(() => {
      setRemaining(computeRemaining(deadlineSeconds));
    }, 250);
    return () => window.clearInterval(intervalId);
  }, [deadlineSeconds]);

  return remaining;
}

function computeRemaining(deadlineSeconds: number | null): number {
  if (deadlineSeconds === null) return 0;
  return Math.max(0, Math.ceil(deadlineSeconds - Date.now() / 1000));
}
