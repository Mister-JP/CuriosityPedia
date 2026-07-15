import type { Viewer } from "./contracts";

export const ROLLING_USAGE_WINDOW_MS = 24 * 60 * 60 * 1_000;

export function liveResearchLimit(mode: Viewer["mode"]) {
  return mode === "guest" ? 25 : 100;
}

export function identitySpendLimitUsd(mode: Viewer["mode"]) {
  return mode === "guest" ? 1 : 5;
}
