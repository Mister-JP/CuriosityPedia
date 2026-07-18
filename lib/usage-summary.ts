import { getD1 } from "../db";
import type { UsageSummary } from "./contracts";
import {
  identitySpendLimitUsd,
  liveResearchLimit,
  ROLLING_USAGE_WINDOW_MS,
} from "./usage-policy";
import type { ViewerContext } from "./viewer";

type ResearchRequestRow = { created_at: number };
type SpendRow = {
  settled_microusd: number;
  held_microusd: number;
  accounted_microusd: number;
  oldest_paid_at: number | null;
};
type CountRow = { count: number };

export async function getUsageSummary(viewer: ViewerContext): Promise<UsageSummary> {
  const db = getD1();
  const now = Date.now();
  const windowStart = now - ROLLING_USAGE_WINDOW_MS;
  const [research, spend, library] = await Promise.all([
    db
      .prepare(
        `SELECT created_at FROM research_requests
         WHERE identity_id = ? AND created_at >= ?
           AND status IN ('reserved', 'researching', 'committed')
         ORDER BY created_at ASC`,
      )
      .bind(viewer.identityId, windowStart)
      .all<ResearchRequestRow>(),
    db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN status = 'settled'
             THEN COALESCE(settled_microusd, reserved_microusd) ELSE 0 END), 0) AS settled_microusd,
           COALESCE(SUM(CASE WHEN status IN ('reserved', 'uncertain')
             THEN reserved_microusd ELSE 0 END), 0) AS held_microusd,
           COALESCE(SUM(CASE
             WHEN status = 'settled' THEN COALESCE(settled_microusd, reserved_microusd)
             WHEN status IN ('reserved', 'uncertain') THEN reserved_microusd
             ELSE 0 END), 0) AS accounted_microusd,
           MIN(CASE WHEN status != 'released' AND
             COALESCE(settled_microusd, reserved_microusd) > 0 THEN window_started_at END) AS oldest_paid_at
         FROM provider_cost_reservations WHERE identity_id = ? AND window_started_at >= ?`,
      )
      .bind(viewer.identityId, windowStart)
      .first<SpendRow>(),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM journeys WHERE owner_identity_id = ? AND deleted_at IS NULL",
      )
      .bind(viewer.identityId)
      .first<CountRow>(),
  ]);

  return mapUsageSummary({
    viewer,
    now,
    researchCreatedAt: (research.results ?? []).map((row) => numeric(row.created_at)),
    settledMicrousd: numeric(spend?.settled_microusd),
    heldMicrousd: numeric(spend?.held_microusd),
    accountedMicrousd: numeric(spend?.accounted_microusd),
    oldestPaidAt: spend?.oldest_paid_at == null ? null : numeric(spend.oldest_paid_at),
    savedJourneys: numeric(library?.count),
  });
}

function mapUsageSummary(input: {
  viewer: ViewerContext;
  now: number;
  researchCreatedAt: number[];
  settledMicrousd?: number;
  spentMicrousd?: number;
  heldMicrousd?: number;
  accountedMicrousd?: number;
  oldestPaidAt: number | null;
  savedJourneys: number;
}): UsageSummary {
  const limit = liveResearchLimit(input.viewer.mode);
  const releasesAt = input.researchCreatedAt
    .map((createdAt) => createdAt + ROLLING_USAGE_WINDOW_MS)
    .filter((releaseAt) => releaseAt > input.now)
    .sort((left, right) => left - right);
  const used = releasesAt.length;
  const spendLimitUsd = identitySpendLimitUsd(input.viewer.mode);
  const settledUsd = numeric(input.settledMicrousd ?? input.spentMicrousd) / 1_000_000;
  const heldUsd = numeric(input.heldMicrousd) / 1_000_000;
  const accountedUsd = input.accountedMicrousd === undefined
    ? settledUsd + heldUsd
    : numeric(input.accountedMicrousd) / 1_000_000;

  return {
    asOf: input.now,
    windowHours: 24,
    liveResearch: {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      nextSlotAt: used >= limit ? releasesAt[0] ?? null : null,
      releasesAt,
    },
    spend: {
      usedUsd: settledUsd,
      heldUsd,
      accountedUsd,
      limitUsd: spendLimitUsd,
      remainingUsd: Math.max(0, spendLimitUsd - accountedUsd),
      nextReleaseAt: input.oldestPaidAt == null
        ? null
        : input.oldestPaidAt + ROLLING_USAGE_WINDOW_MS,
    },
    library: {
      used: input.savedJourneys,
      limit: input.viewer.journeyLimit,
      remaining: Math.max(0, input.viewer.journeyLimit - input.savedJourneys),
    },
    guestSessionExpiresAt: input.viewer.mode === "guest"
      ? input.viewer.guestExpiresAt ?? null
      : null,
  };
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export const usageSummaryTestHooks = { mapUsageSummary };
