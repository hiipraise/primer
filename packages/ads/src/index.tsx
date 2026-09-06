import type { CSSProperties } from "react";

export function AdSlot({
  position,
  width = 320,
  height = 100,
}: {
  position: string;
  width?: number;
  height?: number;
}) {
  if (process.env.ADS_ENABLED !== "true") return null;
  const style: CSSProperties = {
    width,
    height,
    border: "1px dashed #6B6656",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8A8574",
    fontSize: 12,
  };
  return (
    <div data-ad-position={position} style={style} aria-label="Advertisement" />
  );
}
