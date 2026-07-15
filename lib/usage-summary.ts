import { getD1 } from "../db";
import type { UsageSummary } from "./contracts";
import {
  identitySpendLimitUsd,
  liveResearchLimit,
  ROLLING_USAGE_WINDOW_MS,
} from "./usage-policy";
import type { ViewerContext } from "./viewer";

type ResearchRequestRow = { created_at: number };
type SpendRow = { spent_microusd: number; oldest_paid_at: number | null };
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
        `SELECT COALESCE(SUM(estimated_cost_microusd), 0) AS spent_microusd,
                MIN(CASE WHEN estimated_cost_microusd > 0 THEN created_at END) AS oldest_paid_at
         FROM provider_usage_events WHERE identity_id = ? AND created_at >= ?`,
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
    spentMicrousd: numeric(spend?.spent_microusd),
    oldestPaidAt: spend?.oldest_paid_at == null ? null : numeric(spend.oldest_paid_at),
    savedJourneys: numeric(library?.count),
  });
}

function mapUsageSummary(input: {
  viewer: ViewerContext;
  now: number;
  researchCreatedAt: number[];
  spentMicrousd: number;
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
  const spentUsd = input.spentMicrousd / 1_000_000;

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
      usedUsd: spentUsd,
      limitUsd: spendLimitUsd,
      remainingUsd: Math.max(0, spendLimitUsd - spentUsd),
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
