import { env } from "cloudflare:workers";
import { PERFORMERS } from "./catalog";
import type {
  AnswerBlock,
  PerformerId,
  ResearchEvent,
  ResearchPreset,
  Source,
} from "./contracts";
import { buildFixtureTurn, stableKey } from "./fixtures";
import { RepositoryError } from "./repository";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cloudflare augments this namespace.
  namespace Cloudflare {
    interface Env {
      OPENAI_API_KEY?: string;
    }
  }
}

type ResearchContextTurn = {
  question: string;
  topicLabel: string;
  transition: string;
};

export type PreparedLiveResearch = {
  requestId: string;
  identityId: string;
  kind: "create" | "advance";
  question: string;
  seed: string;
  depth: number;
  performerId: PerformerId;
  modelId: "gpt-5.6-terra";
  researchPreset: ResearchPreset;
  contextTurns: ResearchContextTurn[];
  journeyId?: string;
  fromTurnId?: string;
  selectedOptionId?: string;
  action?: "choose" | "delegate";
  branched?: boolean;
  expectedVersion?: number;
  idempotencyKey: string;
  payloadHash: string;
};

export type LiveTurnDraft = {
  topicLabel: string;
  answer: string;
  answerBlocks: AnswerBlock[];
  transition: string;
  researchSummary: string;
  preferredPosition: 0 | 1;
  options: Array<{ question: string; angle: string }>;
  sources: Source[];
  researchEvents: ResearchEvent[];
  interlude: {
    factKey: string;
    text: string;
    sourceTitle: string;
    sourceUrl: string;
  };
  providerResponseId: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    totalTokens: number;
    webSearchCalls: number;
    latencyMs: number;
  };
};

type ActivityEmitter = (event: ResearchEvent) => void;

type ProviderSource = {
  url: string;
  title: string;
  publisher: string;
};

type ModelTurn = {
  topicLabel: string;
  answerBlocks: Array<{ text: string; citationUrls: string[] }>;
  transition: string;
  researchSummary: string;
  preferredPosition: 0 | 1;
  options: Array<{ question: string; angle: string }>;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const PRESET_LIMITS = {
  spark: { maxToolCalls: 1, maxOutputTokens: 3_000, reasoning: "low", timeoutMs: 45_000 },
  standard: { maxToolCalls: 2, maxOutputTokens: 4_800, reasoning: "medium", timeoutMs: 70_000 },
  deep: { maxToolCalls: 3, maxOutputTokens: 6_400, reasoning: "high", timeoutMs: 90_000 },
} as const;

const TURN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "topicLabel",
    "answerBlocks",
    "transition",
    "researchSummary",
    "preferredPosition",
    "options",
  ],
  properties: {
    topicLabel: { type: "string", minLength: 2, maxLength: 56 },
    answerBlocks: {
      type: "array",
      minItems: 2,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "citationUrls"],
        properties: {
          text: { type: "string", minLength: 70, maxLength: 900 },
          citationUrls: {
            type: "array",
            minItems: 1,
            maxItems: 4,
            items: { type: "string", minLength: 8, maxLength: 2_048 },
          },
        },
      },
    },
    transition: { type: "string", minLength: 35, maxLength: 420 },
    researchSummary: { type: "string", minLength: 45, maxLength: 520 },
    preferredPosition: { type: "integer", enum: [0, 1] },
    options: {
      type: "array",
      minItems: 2,
      maxItems: 2,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "angle"],
        properties: {
          question: { type: "string", minLength: 12, maxLength: 220 },
          angle: { type: "string", minLength: 2, maxLength: 32 },
        },
      },
    },
  },
} as const;

export async function runLiveResearch(
  prepared: PreparedLiveResearch,
  emit: ActivityEmitter,
  externalSignal?: AbortSignal,
): Promise<LiveTurnDraft> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new RepositoryError(
      "PROVIDER_UNAVAILABLE",
      "Live research is not configured on this deployment. You can still use the free demo model.",
      503,
      true,
    );
  }

  const limits = PRESET_LIMITS[prepared.researchPreset];
  const performer = PERFORMERS.find((candidate) => candidate.id === prepared.performerId)!;
  const events: ResearchEvent[] = [];
  const startedAt = Date.now();
  let outputText = "";
  let completedResponse: OpenAIResponse | null = null;
  let searchStarted = false;
  let synthesisStarted = false;

  const addActivity = (kind: ResearchEvent["kind"], label: string, sourceId: string | null = null) => {
    const event: ResearchEvent = {
      id: crypto.randomUUID(),
      sequence: events.length,
      kind,
      label,
      sourceId,
    };
    events.push(event);
    emit(event);
  };

  addActivity("status", `Prepared a ${prepared.researchPreset} foreground research run`);

  const controller = new AbortController();
  const abortFromClient = () => controller.abort("WonderDrive client disconnected");
  externalSignal?.addEventListener("abort", abortFromClient, { once: true });
  const timeout = setTimeout(() => controller.abort("WonderDrive research timeout"), limits.timeoutMs);
  let response: Response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: prepared.modelId,
        instructions: buildInstructions(performer.name, performer.cue),
        input: buildResearchInput(prepared),
        tools: [{ type: "web_search" }],
        tool_choice: "required",
        include: ["web_search_call.action.sources"],
        max_tool_calls: limits.maxToolCalls,
        max_output_tokens: limits.maxOutputTokens,
        reasoning: { effort: limits.reasoning },
        text: {
          verbosity: "medium",
          format: {
            type: "json_schema",
            name: "wonderdrive_turn",
            strict: true,
            schema: TURN_SCHEMA,
          },
        },
        safety_identifier: `wd_${prepared.identityId}`.slice(0, 64),
        store: false,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const requestId = response.headers.get("x-request-id");
      const detail = await safeErrorDetail(response);
      console.error("OpenAI Responses request failed", {
        status: response.status,
        requestId,
        detail,
      });
      throw new RepositoryError(
        response.status === 401 || response.status === 403
          ? "PROVIDER_UNAVAILABLE"
          : "PROVIDER_ERROR",
        response.status === 429
          ? "Live research is busy or has reached its provider limit. Please try again shortly."
          : "Live research could not reach the provider. The journey was not committed; it is safe to retry.",
        response.status === 429 ? 429 : 502,
        true,
      );
    }

    if (!response.body) {
      throw new RepositoryError(
        "PROVIDER_ERROR",
        "The live research stream ended before it began. The journey was not committed.",
        502,
        true,
      );
    }

    for await (const event of readServerSentEvents(response.body)) {
      if (!event || typeof event !== "object") continue;
      const type = typeof event.type === "string" ? event.type : "";
      if (type.includes("web_search_call") && !searchStarted) {
        searchStarted = true;
        addActivity("search", "OpenAI began a live web search for relevant evidence");
      }
      if (type === "response.output_text.delta" && typeof event.delta === "string") {
        outputText += event.delta;
        if (!synthesisStarted) {
          synthesisStarted = true;
          addActivity("synthesis", "The performer began composing from the retrieved evidence");
        }
      }
      if (type === "response.completed" && isObject(event.response)) {
        completedResponse = event.response as OpenAIResponse;
      }
      if (type === "error" || type === "response.failed") {
        throw new RepositoryError(
          "PROVIDER_ERROR",
          "The provider interrupted live research. No partial journey was saved.",
          502,
          true,
        );
      }
    }
  } catch (error) {
    if (error instanceof RepositoryError) throw error;
    if (controller.signal.aborted) {
      throw new RepositoryError(
        "PROVIDER_ERROR",
        "Live research reached its foreground time limit. No partial journey was saved.",
        504,
        true,
      );
    }
    console.error("OpenAI Responses stream failed", error);
    throw new RepositoryError(
      "PROVIDER_ERROR",
      "Live research was interrupted. No partial journey was saved; it is safe to retry.",
      502,
      true,
    );
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromClient);
  }

  if (!completedResponse) {
    throw new RepositoryError(
      "PROVIDER_ERROR",
      "Live research finished without a complete provider response. Nothing was saved.",
      502,
      true,
    );
  }
  if (!outputText) outputText = extractOutputText(completedResponse);

  const providerSources = extractSources(completedResponse);
  if (providerSources.length < 2) {
    throw validationFailure("The research run did not return enough inspectable web sources.");
  }

  providerSources.slice(0, 6).forEach((source) => {
    addActivity("source", `Consulted ${source.publisher}: ${source.title}`, stableKey(source.url));
  });
  addActivity("check", "Checked that citations resolve to sources consulted in this run");

  const modelTurn = parseModelTurn(outputText);
  const draft = validateAndMapTurn(modelTurn, providerSources);
  const curatedInterlude = buildFixtureTurn({
    question: prepared.question,
    depth: prepared.depth,
    performerId: prepared.performerId,
  }).interlude;
  addActivity("synthesis", "Validated the sourced answer and exactly two distinct next paths");

  const usage = completedResponse.usage ?? {};
  const webSearchCalls = countWebSearchCalls(completedResponse);
  return {
    ...draft,
    interlude: curatedInterlude,
    researchEvents: events,
    providerResponseId: stringValue(completedResponse.id) || crypto.randomUUID(),
    usage: {
      inputTokens: numberValue(usage.input_tokens),
      outputTokens: numberValue(usage.output_tokens),
      reasoningTokens: numberValue(usage.output_tokens_details?.reasoning_tokens),
      totalTokens: numberValue(usage.total_tokens),
      webSearchCalls,
      latencyMs: Date.now() - startedAt,
    },
  };
}

function buildInstructions(performerName: string, cue: string): string {
  return [
    `You are ${performerName}, a curiosity performer inside WonderDrive.`,
    cue,
    "Research before performing. Use live web search and synthesize what the retrieved evidence supports.",
    "Do not expose chain-of-thought, hidden reasoning, or private scratch work. researchSummary must describe observable research actions and evidence categories only.",
    "Write a clear, vivid, intellectually honest answer for a general audience. Separate evidence from metaphor and flag uncertainty in the prose when it matters.",
    "For every answer block, copy one or more exact source URLs that the web search actually consulted into citationUrls.",
    "Return exactly two genuinely different next questions. They should continue curiosity, not restate each other or merely ask for more detail.",
  ].join("\n");
}

function buildResearchInput(prepared: PreparedLiveResearch): string {
  const context = prepared.contextTurns.length
    ? prepared.contextTurns
        .map(
          (turn, index) =>
            `${index + 1}. Question: ${turn.question}\nTopic: ${turn.topicLabel}\nWhere it left us: ${turn.transition}`,
        )
        .join("\n\n")
    : "No earlier turns. This is the opening question.";
  return [
    `Opening seed: ${prepared.seed}`,
    `Question to research now: ${prepared.question}`,
    `Turn depth: ${prepared.depth}`,
    "Recent committed journey context:",
    context,
    "Produce one complete WonderDrive turn using the required JSON schema.",
  ].join("\n\n");
}

function parseModelTurn(outputText: string): ModelTurn {
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    console.error("OpenAI structured output was not JSON", error);
    throw validationFailure("The provider response could not be validated as a WonderDrive turn.");
  }
  if (!isObject(parsed)) throw validationFailure("The provider response was not a turn object.");
  return parsed as ModelTurn;
}

function validateAndMapTurn(modelTurn: ModelTurn, providerSources: ProviderSource[]) {
  const topicLabel = boundedString(modelTurn.topicLabel, 2, 56, "topic label");
  const transition = boundedString(modelTurn.transition, 35, 420, "transition");
  const researchSummary = boundedString(
    modelTurn.researchSummary,
    45,
    520,
    "research summary",
  );
  if (modelTurn.preferredPosition !== 0 && modelTurn.preferredPosition !== 1) {
    throw validationFailure("The preferred path was invalid.");
  }
  if (!Array.isArray(modelTurn.options) || modelTurn.options.length !== 2) {
    throw validationFailure("The performance did not return exactly two paths.");
  }
  const options = modelTurn.options.map((option, index) => {
    if (!isObject(option)) throw validationFailure(`Path ${index + 1} was invalid.`);
    return {
      question: boundedString(option.question, 12, 220, `path ${index + 1}`),
      angle: boundedString(option.angle, 2, 32, `path ${index + 1} angle`),
    };
  });
  if (normalizeText(options[0].question) === normalizeText(options[1].question)) {
    throw validationFailure("The two next paths were not distinct.");
  }
  if (!Array.isArray(modelTurn.answerBlocks) || modelTurn.answerBlocks.length < 2) {
    throw validationFailure("The performance did not return enough answer blocks.");
  }

  const citedSourceIds = new Set<string>();
  const answerBlocks: AnswerBlock[] = modelTurn.answerBlocks.slice(0, 4).map((block, index) => {
    if (!isObject(block) || !Array.isArray(block.citationUrls)) {
      throw validationFailure(`Answer block ${index + 1} had invalid citations.`);
    }
    const matches = block.citationUrls
      .map((url) => matchSource(stringValue(url), providerSources))
      .filter((source): source is ProviderSource => Boolean(source));
    const uniqueMatches = dedupeSources(matches).slice(0, 4);
    if (!uniqueMatches.length) {
      throw validationFailure(`Answer block ${index + 1} did not cite a consulted source.`);
    }
    const sourceIds = uniqueMatches.map((source) => stableKey(source.url));
    sourceIds.forEach((id) => citedSourceIds.add(id));
    return {
      text: boundedString(block.text, 70, 900, `answer block ${index + 1}`),
      sourceIds,
    };
  });

  const sources: Source[] = providerSources.slice(0, 16).map((source) => ({
    id: stableKey(source.url),
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    relation: citedSourceIds.has(stableKey(source.url)) ? "cited" : "consulted",
  }));

  return {
    topicLabel,
    answer: answerBlocks.map((block) => block.text).join("\n\n"),
    answerBlocks,
    transition,
    researchSummary,
    preferredPosition: modelTurn.preferredPosition,
    options,
    sources,
  };
}

async function* readServerSentEvents(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data || data === "[DONE]") continue;
        try {
          yield JSON.parse(data) as Record<string, unknown>;
        } catch {
          // Ignore non-JSON keepalive frames from the upstream stream.
        }
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
}

type OpenAIResponse = {
  id?: unknown;
  output?: unknown;
  usage?: {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
    output_tokens_details?: { reasoning_tokens?: unknown };
  };
};

function extractOutputText(response: OpenAIResponse): string {
  if (!Array.isArray(response.output)) return "";
  const chunks: string[] = [];
  for (const item of response.output) {
    if (!isObject(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isObject(content) && content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("");
}

function extractSources(response: OpenAIResponse): ProviderSource[] {
  if (!Array.isArray(response.output)) return [];
  const candidates: ProviderSource[] = [];
  for (const item of response.output) {
    if (!isObject(item)) continue;
    if (item.type === "web_search_call" && isObject(item.action) && Array.isArray(item.action.sources)) {
      for (const value of item.action.sources) addProviderSource(candidates, value);
    }
    if (Array.isArray(item.content)) {
      for (const content of item.content) {
        if (!isObject(content) || !Array.isArray(content.annotations)) continue;
        for (const annotation of content.annotations) {
          if (isObject(annotation) && annotation.type === "url_citation") {
            addProviderSource(candidates, annotation);
          }
        }
      }
    }
  }
  return dedupeSources(candidates).slice(0, 16);
}

function addProviderSource(target: ProviderSource[], value: unknown) {
  if (!isObject(value)) return;
  const canonical = canonicalUrl(stringValue(value.url));
  if (!canonical) return;
  const host = new URL(canonical).hostname.replace(/^www\./, "");
  target.push({
    url: canonical,
    title: stringValue(value.title) || host,
    publisher: host,
  });
}

function countWebSearchCalls(response: OpenAIResponse): number {
  return Array.isArray(response.output)
    ? response.output.filter((item) => isObject(item) && item.type === "web_search_call").length
    : 0;
}

function matchSource(value: string, sources: ProviderSource[]): ProviderSource | null {
  const canonical = canonicalUrl(value);
  if (!canonical) return null;
  const exact = sources.find((source) => source.url === canonical);
  if (exact) return exact;
  const wanted = new URL(canonical);
  return (
    sources.find((source) => {
      const candidate = new URL(source.url);
      return candidate.hostname === wanted.hostname && candidate.pathname === wanted.pathname;
    }) ?? null
  );
}

function dedupeSources<T extends ProviderSource>(sources: T[]): T[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}

function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_") || key === "gclid" || key === "fbclid") url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function boundedString(value: unknown, min: number, max: number, label: string): string {
  const normalized = stringValue(value).trim().replace(/\s+/g, " ");
  if (normalized.length < min || normalized.length > max) {
    throw validationFailure(`The ${label} was outside its allowed length.`);
  }
  return normalized;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function validationFailure(detail: string) {
  console.error("WonderDrive live response validation failed", detail);
  return new RepositoryError(
    "RESEARCH_VALIDATION_FAILED",
    "The live result did not pass WonderDrive’s evidence and two-path checks. Nothing was saved; please retry.",
    502,
    true,
  );
}

async function safeErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.slice(0, 1_000);
  } catch {
    return "unreadable provider error";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export const liveResearchTestHooks = {
  extractSources,
  validateAndMapTurn,
};
