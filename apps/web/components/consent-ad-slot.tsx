"use client";

import { AdSlot } from "@primer/ads";
import { useConsent } from "./consent-provider";

export function ConsentAdSlot({ position, width, height }: { position: string; width?: number; height?: number }) {
  const { choice } = useConsent();
  return <AdSlot position={position} width={width} height={height} consentGranted={choice === "accepted"} />;
}
