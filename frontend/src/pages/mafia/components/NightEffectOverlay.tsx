import { useEffect } from "react";
import "./NightEffectOverlay.css";

export type NightEffectKind = "knife" | "angel" | "detective" | "executed" | "spared";

const EFFECT_DURATION_MS: Record<NightEffectKind, number> = {
  knife: 700,
  angel: 1400,
  detective: 1300,
  executed: 1800,
  spared: 1800,
};

interface NightEffectOverlayProps {
  kind: NightEffectKind;
  imageSrc: string;
  onDone: () => void;
}

export function NightEffectOverlay({ kind, imageSrc, onDone }: NightEffectOverlayProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, EFFECT_DURATION_MS[kind]);
    return () => window.clearTimeout(timer);
  }, [kind, onDone]);

  return (
    <div className={`night-effect-overlay night-effect-overlay--${kind}`}>
      <img src={imageSrc} alt="" />
    </div>
  );
}
