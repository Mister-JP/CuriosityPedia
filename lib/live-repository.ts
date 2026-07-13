import { MODELS, PERFORMERS } from "./catalog";
import type {
  JourneyDetail,
  LiveResearchRequest,
  ResearchPreset,
} from "./contracts";
import { getD1 } from "../db";
import type { ViewerContext } from "./viewer";
import {
  getJourney,
  RepositoryError,
} from "./repository";
import type { LiveTurnDraft, PreparedLiveResearch } from "./live-research";

const PRESETS: ResearchPreset[] = ["spark", "standard", "deep"];

export type LivePreparation =
  | { type: "ready"; prepared: PreparedLiveResearch }
  | { type: "replay"; journey: JourneyDetail; requestId: string };

export async function prepareLiveResearch(
  viewer: ViewerContext,
  request: LiveResearchRequest,
): Promise<LivePreparation> {
  validateIdempotencyKey(request?.idempotencyKey);
  const db = getD1();
  const normalized = await normalizeRequest(viewer, request);
  const payloadHash = await hashPayload(normalized.payload);

  const prior = await db
    .prepare(
      `SELECT id, payload_hash, status, result_journey_id
       FROM research_requests
       WHERE identity_id = ? AND idempotency_key = ? LIMIT 1`,
    )
    .bind(viewer.identityId, request.idempotencyKey)
    .first<{
      id: string;
      payload_hash: string;
      status: "reserved" | "researching" | "committed" | "failed";
      result_journey_id: string | null;
    }>();
  if (prior) {
    if (prior.payload_hash !== payloadHash) {
      throw new RepositoryError(
        "IDEMPOTENCY_CONFLICT",
        "That request key was already used for different research.",
        409,
      );
    }
    if (prior.status === "committed" && prior.result_journey_id) {
      return {
        type: "replay",
        journey: await getJourney(viewer, prior.result_journey_id),
        requestId: prior.id,
      };
    }
    throw new RepositoryError(
      "IDEMPOTENCY_CONFLICT",
      prior.status === "failed"
        ? "That research attempt ended without a saved turn. Retry with a new request key."
        : "That foreground research request is already in progress.",
      409,
      prior.status !== "failed",
    );
  }

  const liveLimit = viewer.mode === "guest" ? 4 : 20;
  const recent = await db
    .prepare(
      `SELECT COUNT(*) AS count FROM research_requests
       WHERE identity_id = ? AND created_at >= ?
         AND status IN ('reserved', 'researching', 'committed')`,
    )
    .bind(viewer.identityId, Date.now() - 86_400_000)
    .first<{ count: number }>();
  if ((recent?.count ?? 0) >= liveLimit) {
    throw new RepositoryError(
      "LIVE_RESEARCH_LIMIT",
      `This ${viewer.mode === "guest" ? "guest" : "account"} has reached its ${liveLimit}-run live research limit for the last 24 hours. The free demo remains available.`,
      429,
      true,
    );
  }

  const requestId = crypto.randomUUID();
  const prepared: PreparedLiveResearch = {
    requestId,
    identityId: viewer.identityId,
    kind: request.kind,
    question: normalized.question,
    seed: normalized.seed,
    depth: normalized.depth,
    performerId: normalized.performerId,
    modelId: "gpt-5.6-terra",
    researchPreset: normalized.researchPreset,
    contextTurns: [...normalized.contextTurns],
    journeyId: normalized.journeyId,
    fromTurnId: normalized.fromTurnId,
    selectedOptionId: normalized.selectedOptionId,
    action: normalized.action,
    branched: normalized.branched,
    expectedVersion: normalized.expectedVersion,
    idempotencyKey: request.idempotencyKey,
    payloadHash,
  };
  const now = Date.now();
  try {
    await db
      .prepare(
        `INSERT INTO research_requests
          (id, identity_id, kind, idempotency_key, payload_hash, request_json, status,
           started_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'researching', ?, ?)`,
      )
      .bind(
        requestId,
        viewer.identityId,
        request.kind,
        request.idempotencyKey,
        payloadHash,
        JSON.stringify(prepared),
        now,
        now,
      )
      .run();
  } catch (error) {
    console.error("Unable to reserve live research request", error);
    throw new RepositoryError(
      "IDEMPOTENCY_CONFLICT",
      "That foreground research request was already reserved.",
      409,
      true,
    );
  }
  return { type: "ready", prepared };
}

export async function commitLiveResearch(
  viewer: ViewerContext,
  prepared: PreparedLiveResearch,
  draft: LiveTurnDraft,
): Promise<JourneyDetail> {
  return prepared.kind === "create"
    ? commitLiveCreate(viewer, prepared, draft)
    : commitLiveAdvance(viewer, prepared, draft);
}

export async function markLiveResearchFailed(
  viewer: ViewerContext,
  requestId: string,
  error: unknown,
) {
  const repositoryError = error instanceof RepositoryError ? error : null;
  await getD1()
    .prepare(
      `UPDATE research_requests
       SET status = 'failed', error_code = ?, error_message = ?, completed_at = ?
       WHERE id = ? AND identity_id = ? AND status IN ('reserved', 'researching')`,
    )
    .bind(
      repositoryError?.code ?? "INTERNAL_ERROR",
      (repositoryError?.message ?? "Unexpected live research failure").slice(0, 500),
      Date.now(),
      requestId,
      viewer.identityId,
    )
    .run();
}

async function commitLiveCreate(
  viewer: ViewerContext,
  prepared: PreparedLiveResearch,
  draft: LiveTurnDraft,
) {
  const db = getD1();
  const now = Date.now();
  const journeyId = crypto.randomUUID();
  const turnId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO journeys
          (id, owner_identity_id, seed, title, performer_id, model_id, research_preset,
           current_turn_id, turn_count, source_count, last_action, status, version,
           created_at, updated_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 'created', 'active', 1, ?, ?
         WHERE EXISTS (
           SELECT 1 FROM research_requests
           WHERE id = ? AND identity_id = ? AND status = 'researching'
         )`,
      )
      .bind(
        journeyId,
        viewer.identityId,
        prepared.seed,
        titleFromSeed(prepared.seed),
        prepared.performerId,
        prepared.modelId,
        prepared.researchPreset,
        turnId,
        draft.sources.length,
        now,
        now,
        prepared.requestId,
        viewer.identityId,
      ),
    db
      .prepare(
        `INSERT INTO turns
          (id, journey_id, parent_turn_id, depth, question, status, answer, answer_json,
           transition, topic_label, research_summary, preferred_position, fixture_key,
           option_set_version, provider, model_id, prompt_version, created_at, ready_at)
         SELECT ?, ?, NULL, 0, ?, 'ready', ?, ?, ?, ?, ?, ?, NULL, 0,
                'openai', ?, 'phase-2-live-v1', ?, ?
         WHERE EXISTS (SELECT 1 FROM journeys WHERE id = ? AND owner_identity_id = ?)`,
      )
      .bind(
        turnId,
        journeyId,
        prepared.question,
        draft.answer,
        JSON.stringify(draft.answerBlocks),
        draft.transition,
        draft.topicLabel,
        draft.researchSummary,
        draft.preferredPosition,
        prepared.modelId,
        now,
        now,
        journeyId,
        viewer.identityId,
      ),
    ...liveOptionStatements(db, turnId, 0, draft),
    ...liveResearchStatements(db, prepared, draft, { journeyId, turnId, runId, now }),
    db
      .prepare(
        `UPDATE research_requests
         SET status = 'committed', provider_response_id = ?, result_journey_id = ?,
             result_turn_id = ?, input_tokens = ?, output_tokens = ?, reasoning_tokens = ?,
             total_tokens = ?, web_search_calls = ?, completed_at = ?
         WHERE id = ? AND identity_id = ? AND status = 'researching'
           AND EXISTS (SELECT 1 FROM turns WHERE id = ? AND journey_id = ?)`,
      )
      .bind(
        draft.providerResponseId,
        journeyId,
        turnId,
        draft.usage.inputTokens,
        draft.usage.outputTokens,
        draft.usage.reasoningTokens,
        draft.usage.totalTokens,
        draft.usage.webSearchCalls,
        now,
        prepared.requestId,
        viewer.identityId,
        turnId,
        journeyId,
      ),
  ];
  const results = await db.batch(statements);
  assertChanged(results.at(-1));
  return getJourney(viewer, journeyId);
}

async function commitLiveAdvance(
  viewer: ViewerContext,
  prepared: PreparedLiveResearch,
  draft: LiveTurnDraft,
) {
  const journeyId = prepared.journeyId;
  const fromTurnId = prepared.fromTurnId;
  const selectedOptionId = prepared.selectedOptionId;
  const expectedVersion = prepared.expectedVersion;
  if (!journeyId || !fromTurnId || !selectedOptionId || expectedVersion === undefined) {
    throw new RepositoryError("INTERNAL_ERROR", "The live turn reservation was incomplete.", 500);
  }
  const db = getD1();
  const now = Date.now();
  const childId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `UPDATE turn_options SET state = 'superseded'
         WHERE turn_id = ?
           AND EXISTS (SELECT 1 FROM journeys WHERE id = ? AND owner_identity_id = ?
             AND version = ? AND deleted_at IS NULL)`,
      )
      .bind(fromTurnId, journeyId, viewer.identityId, expectedVersion),
    db
      .prepare(
        `UPDATE turn_options SET state = 'chosen'
         WHERE id = ? AND turn_id = ?
           AND EXISTS (SELECT 1 FROM journeys WHERE id = ? AND owner_identity_id = ?
             AND version = ? AND deleted_at IS NULL)`,
      )
      .bind(selectedOptionId, fromTurnId, journeyId, viewer.identityId, expectedVersion),
    db
      .prepare(
        `INSERT INTO turns
          (id, journey_id, parent_turn_id, depth, question, status, answer, answer_json,
           transition, topic_label, research_summary, preferred_position, fixture_key,
           option_set_version, provider, model_id, prompt_version, created_at, ready_at)
         SELECT ?, ?, ?, ?, ?, 'ready', ?, ?, ?, ?, ?, ?, NULL, 0,
                'openai', ?, 'phase-2-live-v1', ?, ?
         WHERE EXISTS (SELECT 1 FROM journeys WHERE id = ? AND owner_identity_id = ?
           AND version = ? AND deleted_at IS NULL)`,
      )
      .bind(
        childId,
        journeyId,
        fromTurnId,
        prepared.depth,
        prepared.question,
        draft.answer,
        JSON.stringify(draft.answerBlocks),
        draft.transition,
        draft.topicLabel,
        draft.researchSummary,
        draft.preferredPosition,
        prepared.modelId,
        now,
        now,
        journeyId,
        viewer.identityId,
        expectedVersion,
      ),
    ...conditionalLiveOptionStatements(
      db,
      childId,
      draft,
      journeyId,
      viewer.identityId,
      expectedVersion,
    ),
    ...conditionalLiveResearchStatements(
      db,
      prepared,
      draft,
      { journeyId, turnId: childId, runId, now },
      viewer.identityId,
      expectedVersion,
    ),
    db
      .prepare(
        `INSERT INTO turn_actions
          (id, journey_id, turn_id, kind, option_id, idempotency_key, payload_hash,
           result_turn_id, metadata_json, created_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM journeys WHERE id = ? AND owner_identity_id = ?
           AND version = ? AND deleted_at IS NULL)`,
      )
      .bind(
        crypto.randomUUID(),
        journeyId,
        fromTurnId,
        prepared.action,
        selectedOptionId,
        prepared.idempotencyKey,
        prepared.payloadHash,
        childId,
        JSON.stringify({ branched: prepared.branched, live: true }),
        now,
        journeyId,
        viewer.identityId,
        expectedVersion,
      ),
    db
      .prepare(
        `UPDATE research_requests
         SET status = 'committed', provider_response_id = ?, result_journey_id = ?,
             result_turn_id = ?, input_tokens = ?, output_tokens = ?, reasoning_tokens = ?,
             total_tokens = ?, web_search_calls = ?, completed_at = ?
         WHERE id = ? AND identity_id = ? AND status = 'researching'
           AND EXISTS (SELECT 1 FROM journeys WHERE id = ? AND owner_identity_id = ?
             AND version = ? AND deleted_at IS NULL)`,
      )
      .bind(
        draft.providerResponseId,
        journeyId,
        childId,
        draft.usage.inputTokens,
        draft.usage.outputTokens,
        draft.usage.reasoningTokens,
        draft.usage.totalTokens,
        draft.usage.webSearchCalls,
        now,
        prepared.requestId,
        viewer.identityId,
        journeyId,
        viewer.identityId,
        expectedVersion,
      ),
    db
      .prepare(
        `UPDATE journeys
         SET current_turn_id = ?, turn_count = turn_count + 1,
             source_count = source_count + ?, version = version + 1,
             last_action = ?, status = 'active', updated_at = ?
         WHERE id = ? AND owner_identity_id = ? AND version = ? AND deleted_at IS NULL`,
      )
      .bind(
        childId,
        draft.sources.length,
        prepared.branched ? "branch" : prepared.action,
        now,
        journeyId,
        viewer.identityId,
        expectedVersion,
      ),
  ];
  const results = await db.batch(statements);
  assertChanged(results.at(-1));
  return getJourney(viewer, journeyId);
}

function liveOptionStatements(
  db: D1Database,
  turnId: string,
  setVersion: number,
  draft: LiveTurnDraft,
) {
  return draft.options.map((option, position) =>
    db
      .prepare(
        `INSERT INTO turn_options
          (id, turn_id, set_version, position, question, angle, state)
         VALUES (?, ?, ?, ?, ?, ?, 'proposed')`,
      )
      .bind(crypto.randomUUID(), turnId, setVersion, position, option.question, option.angle),
  );
}

function conditionalLiveOptionStatements(
  db: D1Database,
  turnId: string,
  draft: LiveTurnDraft,
  journeyId: string,
  identityId: string,
  expectedVersion: number,
) {
  return draft.options.map((option, position) =>
    db
      .prepare(
        `INSERT INTO turn_options
          (id, turn_id, set_version, position, question, angle, state)
         SELECT ?, ?, 0, ?, ?, ?, 'proposed'
         WHERE EXISTS (SELECT 1 FROM journeys WHERE id = ? AND owner_identity_id = ?
           AND version = ? AND deleted_at IS NULL)`,
      )
      .bind(
        crypto.randomUUID(),
        turnId,
        position,
        option.question,
        option.angle,
        journeyId,
        identityId,
        expectedVersion,
      ),
  );
}

function liveResearchStatements(
  db: D1Database,
  prepared: PreparedLiveResearch,
  draft: LiveTurnDraft,
  ids: { journeyId: string; turnId: string; runId: string; now: number },
) {
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO research_runs
          (id, journey_id, turn_id, provider, model_id, preset, status,
           provider_response_id, input_tokens, output_tokens, reasoning_tokens,
           total_tokens, web_search_calls, latency_ms, started_at, completed_at, created_at)
         VALUES (?, ?, ?, 'openai', ?, ?, 'ready', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        ids.runId,
        ids.journeyId,
        ids.turnId,
        prepared.modelId,
        prepared.researchPreset,
        draft.providerResponseId,
        draft.usage.inputTokens,
        draft.usage.outputTokens,
        draft.usage.reasoningTokens,
        draft.usage.totalTokens,
        draft.usage.webSearchCalls,
        draft.usage.latencyMs,
        ids.now - draft.usage.latencyMs,
        ids.now,
        ids.now,
      ),
  ];
  appendEvidenceStatements(statements, db, draft, ids, false);
  return statements;
}

function conditionalLiveResearchStatements(
  db: D1Database,
  prepared: PreparedLiveResearch,
  draft: LiveTurnDraft,
  ids: { journeyId: string; turnId: string; runId: string; now: number },
  identityId: string,
  expectedVersion: number,
) {
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO research_runs
          (id, journey_id, turn_id, provider, model_id, preset, status,
           provider_response_id, input_tokens, output_tokens, reasoning_tokens,
           total_tokens, web_search_calls, latency_ms, started_at, completed_at, created_at)
         SELECT ?, ?, ?, 'openai', ?, ?, 'ready', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
         WHERE EXISTS (SELECT 1 FROM journeys WHERE id = ? AND owner_identity_id = ?
           AND version = ? AND deleted_at IS NULL)`,
      )
      .bind(
        ids.runId,
        ids.journeyId,
        ids.turnId,
        prepared.modelId,
        prepared.researchPreset,
        draft.providerResponseId,
        draft.usage.inputTokens,
        draft.usage.outputTokens,
        draft.usage.reasoningTokens,
        draft.usage.totalTokens,
        draft.usage.webSearchCalls,
        draft.usage.latencyMs,
        ids.now - draft.usage.latencyMs,
        ids.now,
        ids.now,
        ids.journeyId,
        identityId,
        expectedVersion,
      ),
  ];
  appendEvidenceStatements(statements, db, draft, ids, true);
  return statements;
}

function appendEvidenceStatements(
  statements: D1PreparedStatement[],
  db: D1Database,
  draft: LiveTurnDraft,
  ids: { journeyId: string; turnId: string; runId: string; now: number },
  conditional: boolean,
) {
  for (const source of draft.sources) {
    statements.push(
      conditional
        ? db
            .prepare(
              `INSERT INTO sources (id, canonical_url, title, publisher, retrieved_at)
               SELECT ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM turns WHERE id = ? AND journey_id = ?)
               ON CONFLICT(canonical_url) DO UPDATE SET title = excluded.title,
                 publisher = excluded.publisher, retrieved_at = excluded.retrieved_at`,
            )
            .bind(
              source.id,
              source.url,
              source.title,
              source.publisher,
              ids.now,
              ids.turnId,
              ids.journeyId,
            )
        : db
            .prepare(
              `INSERT INTO sources (id, canonical_url, title, publisher, retrieved_at)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(canonical_url) DO UPDATE SET title = excluded.title,
                 publisher = excluded.publisher, retrieved_at = excluded.retrieved_at`,
            )
            .bind(source.id, source.url, source.title, source.publisher, ids.now),
      db
        .prepare(
          `INSERT OR IGNORE INTO turn_sources (turn_id, source_id, relation)
           SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM turns WHERE id = ? AND journey_id = ?)`,
        )
        .bind(ids.turnId, source.id, source.relation, ids.turnId, ids.journeyId),
    );
  }
  for (const event of draft.researchEvents) {
    statements.push(
      db
        .prepare(
          `INSERT INTO research_events
            (id, research_run_id, sequence, kind, label, source_id, created_at)
           SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM research_runs WHERE id = ?)`,
        )
        .bind(
          event.id,
          ids.runId,
          event.sequence,
          event.kind,
          event.label,
          event.sourceId,
          ids.now + event.sequence,
          ids.runId,
        ),
    );
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO turn_interludes
          (id, turn_id, fact_key, text, source_url, source_title, created_at)
         SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM turns WHERE id = ? AND journey_id = ?)`,
      )
      .bind(
        crypto.randomUUID(),
        ids.turnId,
        draft.interlude.factKey,
        draft.interlude.text,
        draft.interlude.sourceUrl,
        draft.interlude.sourceTitle,
        ids.now,
        ids.turnId,
        ids.journeyId,
      ),
  );
}

async function normalizeRequest(viewer: ViewerContext, request: LiveResearchRequest) {
  if (!request || typeof request !== "object") {
    throw new RepositoryError("BAD_REQUEST", "A live research configuration is required.", 400);
  }
  if (request.kind === "create") {
    const seed = normalizeSeed(request.seed);
    if (!PERFORMERS.some((performer) => performer.id === request.performerId)) {
      throw new RepositoryError("BAD_REQUEST", "Choose a supported performer.", 400);
    }
    if (
      request.modelId !== "gpt-5.6-terra" ||
      !MODELS.some((model) => model.id === request.modelId && model.mode === "live")
    ) {
      throw new RepositoryError("BAD_REQUEST", "Choose the supported live research model.", 400);
    }
    if (!PRESETS.includes(request.researchPreset)) {
      throw new RepositoryError("BAD_REQUEST", "Choose a supported research preset.", 400);
    }
    const count = await getD1()
      .prepare(
        "SELECT COUNT(*) AS count FROM journeys WHERE owner_identity_id = ? AND deleted_at IS NULL",
      )
      .bind(viewer.identityId)
      .first<{ count: number }>();
    if ((count?.count ?? 0) >= viewer.journeyLimit) {
      throw new RepositoryError(
        "JOURNEY_LIMIT",
        `This library currently keeps up to ${viewer.journeyLimit} journeys.`,
        409,
      );
    }
    return {
      payload: {
        kind: request.kind,
        seed,
        performerId: request.performerId,
        modelId: request.modelId,
        researchPreset: request.researchPreset,
      },
      question: seed,
      seed,
      depth: 0,
      performerId: request.performerId,
      researchPreset: request.researchPreset,
      contextTurns: [],
      journeyId: undefined,
      fromTurnId: undefined,
      selectedOptionId: undefined,
      action: undefined,
      branched: false,
      expectedVersion: undefined,
    } as const;
  }
  if (request.kind !== "advance") {
    throw new RepositoryError("BAD_REQUEST", "Choose a supported live research action.", 400);
  }
  assertId(request.journeyId, "journey");
  assertId(request.fromTurnId, "turn");
  if (request.action !== "choose" && request.action !== "delegate") {
    throw new RepositoryError("BAD_REQUEST", "Choose a path or delegate this turn.", 400);
  }
  if (!Number.isInteger(request.expectedVersion) || request.expectedVersion < 1) {
    throw new RepositoryError("BAD_REQUEST", "A valid journey version is required.", 400);
  }
  const journey = await getJourney(viewer, request.journeyId);
  if (journey.modelId !== "gpt-5.6-terra") {
    throw new RepositoryError("BAD_REQUEST", "This saved journey uses the free demo model.", 400);
  }
  if (journey.version !== request.expectedVersion) {
    throw new RepositoryError(
      "VERSION_CONFLICT",
      "This journey changed in another tab. Reload it before choosing again.",
      409,
      true,
    );
  }
  const fromTurn = journey.turns.find((turn) => turn.id === request.fromTurnId);
  if (!fromTurn || fromTurn.options.length !== 2) {
    throw new RepositoryError("BAD_REQUEST", "Choose from a valid saved turn.", 400);
  }
  const selected =
    request.action === "delegate"
      ? fromTurn.options.find((option) => option.position === fromTurn.preferredPosition)
      : fromTurn.options.find((option) => option.id === request.optionId);
  if (!selected || (fromTurn.id === journey.currentTurnId && selected.state !== "proposed")) {
    throw new RepositoryError("BAD_REQUEST", "Choose one of the two current paths.", 400);
  }
  const contextTurns = ancestorContext(journey, fromTurn.id);
  return {
    payload: {
      kind: request.kind,
      journeyId: journey.id,
      fromTurnId: fromTurn.id,
      action: request.action,
      optionId: selected.id,
      expectedVersion: request.expectedVersion,
    },
    question: selected.question,
    seed: journey.seed,
    depth: fromTurn.depth + 1,
    performerId: journey.performerId,
    researchPreset: journey.researchPreset,
    contextTurns,
    journeyId: journey.id,
    fromTurnId: fromTurn.id,
    selectedOptionId: selected.id,
    action: request.action,
    branched: fromTurn.id !== journey.currentTurnId,
    expectedVersion: request.expectedVersion,
  } as const;
}

function ancestorContext(journey: JourneyDetail, fromTurnId: string) {
  const byId = new Map(journey.turns.map((turn) => [turn.id, turn]));
  const chain = [];
  let current = byId.get(fromTurnId);
  while (current) {
    chain.push({
      question: current.question,
      topicLabel: current.topicLabel,
      transition: current.transition,
    });
    current = current.parentTurnId ? byId.get(current.parentTurnId) : undefined;
  }
  return chain.reverse().slice(-4);
}

function normalizeSeed(seed: unknown): string {
  if (typeof seed !== "string") {
    throw new RepositoryError("BAD_REQUEST", "Start with a question.", 400);
  }
  const normalized = seed.trim().replace(/\s+/g, " ");
  if (normalized.length < 3 || normalized.length > 280) {
    throw new RepositoryError(
      "BAD_REQUEST",
      "Keep the starting question between 3 and 280 characters.",
      400,
    );
  }
  return normalized;
}

function validateIdempotencyKey(value: unknown) {
  if (typeof value !== "string" || value.length < 8 || value.length > 100) {
    throw new RepositoryError("BAD_REQUEST", "A valid request key is required.", 400);
  }
}

function assertId(value: unknown, label: string) {
  if (typeof value !== "string" || value.length < 8 || value.length > 100) {
    throw new RepositoryError("BAD_REQUEST", `A valid ${label} ID is required.`, 400);
  }
}

function titleFromSeed(seed: string) {
  return seed.length <= 62 ? seed : `${seed.slice(0, 59).trimEnd()}…`;
}

function assertChanged(result: D1Result<unknown> | undefined) {
  if (!result || (result.meta.changes ?? 0) === 0) {
    throw new RepositoryError(
      "VERSION_CONFLICT",
      "This journey changed before the researched turn could be committed. No partial turn was saved.",
      409,
      true,
    );
  }
}

async function hashPayload(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
