import { getD1 } from "../db";
import { RepositoryError } from "./errors";
import type { ViewerContext } from "./viewer";

export async function getResearchStatus(viewer: ViewerContext, requestId: string) {
  const row = await getD1()
    .prepare(
      `SELECT status, result_journey_id, result_turn_id, error_code, error_message, completed_at
       FROM research_requests WHERE id = ? AND identity_id = ? LIMIT 1`,
    )
    .bind(requestId, viewer.identityId)
    .first<{
      status: string;
      result_journey_id: string | null;
      result_turn_id: string | null;
      error_code: string | null;
      error_message: string | null;
      completed_at: number | null;
    }>();
  if (!row) throw new RepositoryError("NOT_FOUND", "That research run was not found.", 404);
  return {
    status: row.status,
    journeyId: row.result_journey_id,
    turnId: row.result_turn_id,
    error: row.error_code ? { code: row.error_code, message: row.error_message } : null,
    completedAt: row.completed_at,
  };
}
