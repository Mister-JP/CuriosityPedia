import assert from "node:assert/strict";
import test from "node:test";
import { env } from "cloudflare:workers";
import { getResearchStatus } from "../lib/research-status-repository.ts";

const viewer = {
  identityId: "identity-owner",
  mode: "chatgpt",
  displayName: "Owner",
  journeyLimit: 20,
};

function createScriptedD1(row) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const call = { sql, bindings: [] };
      calls.push(call);
      return {
        bind(...bindings) {
          call.bindings = bindings;
          return this;
        },
        async first() {
          return row;
        },
      };
    },
  };
}

function normalizedSql(call) {
  return call.sql.replace(/\s+/g, " ").trim();
}

test("research status preserves its identity-bound query and ready projection", async () => {
  const db = createScriptedD1({
    status: "ready",
    result_journey_id: "journey-alpha",
    result_turn_id: "turn-alpha",
    error_code: null,
    error_message: null,
    completed_at: 1234,
  });
  env.DB = db;

  assert.deepEqual(await getResearchStatus(viewer, "request-alpha"), {
    status: "ready",
    journeyId: "journey-alpha",
    turnId: "turn-alpha",
    error: null,
    completedAt: 1234,
  });
  assert.equal(db.calls.length, 1);
  assert.match(
    normalizedSql(db.calls[0]),
    /^SELECT status, result_journey_id, result_turn_id, error_code, error_message, completed_at FROM research_requests WHERE id = \? AND identity_id = \? LIMIT 1$/,
  );
  assert.deepEqual(db.calls[0].bindings, ["request-alpha", viewer.identityId]);
});

test("research status preserves pending and failed field projection", async () => {
  const pendingDb = createScriptedD1({
    status: "running",
    result_journey_id: null,
    result_turn_id: null,
    error_code: null,
    error_message: "ignored without a code",
    completed_at: null,
  });
  env.DB = pendingDb;
  assert.deepEqual(await getResearchStatus(viewer, "request-pending"), {
    status: "running",
    journeyId: null,
    turnId: null,
    error: null,
    completedAt: null,
  });

  const failedDb = createScriptedD1({
    status: "failed",
    result_journey_id: null,
    result_turn_id: null,
    error_code: "PROVIDER_TIMEOUT",
    error_message: null,
    completed_at: 5678,
  });
  env.DB = failedDb;
  assert.deepEqual(await getResearchStatus(viewer, "request-failed"), {
    status: "failed",
    journeyId: null,
    turnId: null,
    error: { code: "PROVIDER_TIMEOUT", message: null },
    completedAt: 5678,
  });
});

test("research status returns the same not-found error when no owned row is visible", async () => {
  const db = createScriptedD1(null);
  env.DB = db;

  await assert.rejects(
    () => getResearchStatus(viewer, "request-other-owner"),
    (error) => error?.code === "NOT_FOUND"
      && error?.status === 404
      && error?.retryable === false
      && error?.message === "That research run was not found.",
  );
  assert.deepEqual(db.calls[0].bindings, ["request-other-owner", viewer.identityId]);
});
