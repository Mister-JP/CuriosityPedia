"use client";

import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MODELS, PERFORMERS, PRESET_LABELS, STARTER_QUESTIONS } from "../lib/catalog";
import type {
  AdvanceJourneyRequest,
  ApiFailure,
  ApiSuccess,
  CompareResult,
  JourneyDetail,
  JourneySummary,
  JourneyTurn,
  Interlude,
  LiveResearchRequest,
  LiveResearchStreamEvent,
  ModelId,
  PerformerId,
  ResearchEvent,
  ResearchPreset,
  Viewer,
} from "../lib/contracts";

type View = "start" | "journey" | "map" | "library" | "compare";

type SessionPayload = {
  journeys: JourneySummary[];
};

type LiveResearchState = {
  question: string;
  message: string;
  events: ResearchEvent[];
  status: "running" | "complete" | "error";
  result: JourneyDetail | null;
  interlude: Omit<Interlude, "id"> | null;
  error: string | null;
};

const navItems: Array<{ id: View; label: string }> = [
  { id: "start", label: "New drive" },
  { id: "journey", label: "Stage" },
  { id: "map", label: "Journey map" },
  { id: "library", label: "Library" },
  { id: "compare", label: "Compare" },
];

export function WonderDriveExperience() {
  const [view, setView] = useState<View>("start");
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [activeJourney, setActiveJourney] = useState<JourneyDetail | null>(null);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mutation, setMutation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [liveResearch, setLiveResearch] = useState<LiveResearchState | null>(null);

  const refreshSession = useCallback(async () => {
    setError(null);
    try {
      const payload = await api<SessionPayload>("/api/session");
      setViewer(payload.viewer);
      setJourneys(payload.data.journeys);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The first client effect hydrates the durable server session; updates happen after fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSession();
  }, [refreshSession]);

  const openJourney = useCallback(async (journeyId: string, targetView: View = "journey") => {
    setMutation(`open-${journeyId}`);
    setError(null);
    try {
      const payload = await api<JourneyDetail>(`/api/journeys/${journeyId}`);
      setViewer(payload.viewer);
      setActiveJourney(payload.data);
      setActiveTurnId(payload.data.currentTurnId);
      setReplaying(false);
      setView(targetView);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setMutation(null);
    }
  }, []);

  async function create(config: {
    seed: string;
    performerId: PerformerId;
    modelId: ModelId;
    researchPreset: ResearchPreset;
  }) {
    setMutation("create");
    setError(null);
    try {
      if (config.modelId === "gpt-5.6-terra") {
        setView("journey");
        setLiveResearch({
          question: config.seed,
          message: "Connecting to live foreground research…",
          events: [],
          status: "running",
          result: null,
          interlude: null,
          error: null,
        });
        const complete = await streamLiveResearch(
          {
            kind: "create",
            ...config,
            modelId: "gpt-5.6-terra",
            idempotencyKey: crypto.randomUUID(),
          },
          setLiveResearch,
        );
        setViewer(complete.viewer);
        setActiveJourney(complete.data);
        setActiveTurnId(complete.data.currentTurnId);
        setJourneys((current) => upsertSummary(current, complete.data));
        setLiveResearch((current) =>
          current
            ? { ...current, status: "complete", result: complete.data, message: "Research committed" }
            : current,
        );
        setReplaying(false);
        return;
      }
      const payload = await api<JourneyDetail>("/api/journeys", {
        method: "POST",
        body: JSON.stringify({
          ...config,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setViewer(payload.viewer);
      setActiveJourney(payload.data);
      setActiveTurnId(payload.data.currentTurnId);
      setJourneys((current) => upsertSummary(current, payload.data));
      setView("journey");
      setReplaying(true);
    } catch (cause) {
      const message = messageFrom(cause);
      setError(message);
      setLiveResearch((current) =>
        current ? { ...current, status: "error", error: message, message: "Research stopped" } : null,
      );
    } finally {
      setMutation(null);
    }
  }

  async function advance(
    action: AdvanceJourneyRequest["action"],
    input: { turnId: string; optionId?: string; adventure?: number },
  ) {
    if (!activeJourney) return;
    setMutation(action);
    setError(null);
    try {
      if (activeJourney.modelId === "gpt-5.6-terra" && action !== "reject") {
        const fromTurn = activeJourney.turns.find((turn) => turn.id === input.turnId);
        const selected =
          action === "delegate"
            ? fromTurn?.options.find((option) => option.position === fromTurn.preferredPosition)
            : fromTurn?.options.find((option) => option.id === input.optionId);
        if (!fromTurn || !selected) throw new Error("Choose one of the two current paths.");
        setView("journey");
        setLiveResearch({
          question: selected.question,
          message: "Opening the next live research turn…",
          events: [],
          status: "running",
          result: null,
          interlude: null,
          error: null,
        });
        const complete = await streamLiveResearch(
          {
            kind: "advance",
            journeyId: activeJourney.id,
            fromTurnId: input.turnId,
            action,
            optionId: input.optionId,
            expectedVersion: activeJourney.version,
            idempotencyKey: crypto.randomUUID(),
          },
          setLiveResearch,
        );
        setViewer(complete.viewer);
        setActiveJourney(complete.data);
        setActiveTurnId(complete.data.currentTurnId);
        setJourneys((current) => upsertSummary(current, complete.data));
        setLiveResearch((current) =>
          current
            ? { ...current, status: "complete", result: complete.data, message: "Research committed" }
            : current,
        );
        setReplaying(false);
        return;
      }
      const payload = await api<JourneyDetail>(
        `/api/journeys/${activeJourney.id}/advance`,
        {
          method: "POST",
          body: JSON.stringify({
            fromTurnId: input.turnId,
            action,
            optionId: input.optionId,
            adventure: input.adventure,
            expectedVersion: activeJourney.version,
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
      setViewer(payload.viewer);
      setActiveJourney(payload.data);
      setJourneys((current) => upsertSummary(current, payload.data));
      if (action === "reject") {
        setActiveTurnId(input.turnId);
      } else {
        setActiveTurnId(payload.data.currentTurnId);
        setReplaying(true);
      }
      setView("journey");
    } catch (cause) {
      const message = messageFrom(cause);
      setError(message);
      setLiveResearch((current) =>
        current ? { ...current, status: "error", error: message, message: "Research stopped" } : null,
      );
      if (message.toLowerCase().includes("another tab")) void openJourney(activeJourney.id);
    } finally {
      setMutation(null);
    }
  }

  async function removeJourney(journeyId: string) {
    setMutation(`delete-${journeyId}`);
    setError(null);
    try {
      await api<{ id: string }>(`/api/journeys/${journeyId}`, { method: "DELETE" });
      setJourneys((current) => current.filter((journey) => journey.id !== journeyId));
      setCompareIds((current) => current.filter((id) => id !== journeyId));
      if (activeJourney?.id === journeyId) {
        setActiveJourney(null);
        setActiveTurnId(null);
        setView("library");
      }
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setMutation(null);
    }
  }

  async function compare() {
    if (compareIds.length !== 2) return;
    setMutation("compare");
    setError(null);
    try {
      const params = new URLSearchParams({ left: compareIds[0], right: compareIds[1] });
      const payload = await api<CompareResult>(`/api/compare?${params}`);
      setComparison(payload.data);
    } catch (cause) {
      setError(messageFrom(cause));
    } finally {
      setMutation(null);
    }
  }

  const activeTurn = useMemo(
    () => activeJourney?.turns.find((turn) => turn.id === activeTurnId) ?? null,
    [activeJourney, activeTurnId],
  );

  function navigate(next: View) {
    if ((next === "journey" || next === "map") && !activeJourney) {
      setView(journeys.length ? "library" : "start");
      return;
    }
    setView(next);
    setLiveResearch(null);
    if (next === "compare") setComparison(null);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <button className="wordmark" type="button" onClick={() => navigate("start")}>
          <span className="wordmark-mark" aria-hidden="true">W</span>
          <span>
            WonderDrive
            <small>curiosity, performed</small>
          </span>
        </button>

        <nav className="app-nav" aria-label="WonderDrive views">
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="identity-control">
          <span className={`identity-dot ${viewer?.mode ?? "loading"}`} aria-hidden="true" />
          {viewer?.mode === "chatgpt" ? (
            <span><strong>{viewer.displayName}</strong><small>ChatGPT account</small></span>
          ) : (
            <span><strong>{viewer?.displayName ?? "Opening library…"}</strong><small>{viewer ? `${journeys.length}/${viewer.journeyLimit} saved` : "durable session"}</small></span>
          )}
          {viewer?.mode === "guest" && (
            <a href="/signin-with-chatgpt?return_to=%2F">Sign in</a>
          )}
        </div>
      </header>

      <div className="phase-ribbon" role="note">
        <span>Phase 2</span>
        Live foreground web research · cited performances · D1-saved journeys · no background jobs
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => { setError(null); void refreshSession(); }}>Reconnect</button>
        </div>
      )}

      {loading ? (
        <LoadingStage />
      ) : liveResearch ? (
        <LiveResearchStage
          state={liveResearch}
          onComplete={() => {
            if (liveResearch.result) {
              setActiveJourney(liveResearch.result);
              setActiveTurnId(liveResearch.result.currentTurnId);
            }
            setLiveResearch(null);
            setView("journey");
          }}
          onBack={() => {
            setLiveResearch(null);
            setView(activeJourney ? "journey" : "start");
          }}
        />
      ) : view === "start" ? (
        <StartStage onCreate={create} creating={mutation === "create"} journeyCount={journeys.length} />
      ) : view === "library" ? (
        <Library
          journeys={journeys}
          viewer={viewer}
          busy={mutation}
          onOpen={(id) => void openJourney(id)}
          onDelete={(id) => void removeJourney(id)}
          onNew={() => setView("start")}
        />
      ) : view === "compare" ? (
        <CompareView
          journeys={journeys}
          selected={compareIds}
          comparison={comparison}
          busy={mutation === "compare"}
          onToggle={(id) => {
            setComparison(null);
            setCompareIds((current) =>
              current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current.slice(-1), id],
            );
          }}
          onCompare={() => void compare()}
          onNew={() => setView("start")}
        />
      ) : activeJourney && activeTurn ? (
        view === "map" ? (
          <JourneyMap
            journey={activeJourney}
            activeTurnId={activeTurn.id}
            onSelect={(turnId) => {
              setActiveTurnId(turnId);
              setReplaying(false);
            }}
            onContinue={(turnId) => {
              setActiveTurnId(turnId);
              setReplaying(false);
              setView("journey");
            }}
          />
        ) : replaying ? (
          <ResearchReplay turn={activeTurn} onComplete={() => setReplaying(false)} />
        ) : (
          <PerformanceStage
            journey={activeJourney}
            turn={activeTurn}
            busy={mutation}
            onChoose={(optionId) => void advance("choose", { turnId: activeTurn.id, optionId })}
            onReject={(adventure) => void advance("reject", { turnId: activeTurn.id, adventure })}
            onDelegate={() => void advance("delegate", { turnId: activeTurn.id })}
            onMap={() => setView("map")}
          />
        )
      ) : (
        <EmptyStage onOpenLibrary={() => setView("library")} />
      )}

      <footer className="app-footer">
        <p><span aria-hidden="true">W/02</span> One performer. One researched turn. Exactly two ways forward.</p>
        <div>
          <a href="https://github.com/Mister-JP/WonderDrive">Source</a>
          <a href="https://github.com/Mister-JP/WonderDrive/blob/main/docs/WonderDrive_Final_Product_and_Engineering_Blueprint_v3_Research_First.docx">Product book</a>
        </div>
      </footer>
    </main>
  );
}

function StartStage({
  onCreate,
  creating,
  journeyCount,
}: {
  onCreate: (config: {
    seed: string;
    performerId: PerformerId;
    modelId: ModelId;
    researchPreset: ResearchPreset;
  }) => void;
  creating: boolean;
  journeyCount: number;
}) {
  const [seed, setSeed] = useState<string>(STARTER_QUESTIONS[0]);
  const [performerId, setPerformerId] = useState<PerformerId>("archivist");
  const [modelId, setModelId] = useState<ModelId>("gpt-5.6-terra");
  const [preset, setPreset] = useState<ResearchPreset>("standard");
  const performer = PERFORMERS.find((item) => item.id === performerId)!;
  const model = MODELS.find((item) => item.id === modelId)!;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (seed.trim().length >= 3) {
      onCreate({ seed, performerId, modelId, researchPreset: preset });
    }
  }

  return (
    <section className="start-stage" aria-labelledby="start-title">
      <div className="start-intro">
        <p className="eyebrow"><span /> Live research performance</p>
        <h1 id="start-title">Give curiosity<br /><em>a direction.</em></h1>
        <p className="lede">
          Bring one honest question. Choose who will carry it. WonderDrive will
          research the open web, perform a sourced answer, and return exactly two
          next questions to you.
        </p>
        <div className="contract-strip" aria-label="Phase 2 product contract">
          <span><strong>01</strong> saved to D1</span>
          <span><strong>02</strong> inspectable sources</span>
          <span><strong>03</strong> user-directed path</span>
        </div>
      </div>

      <form className="drive-console" onSubmit={submit}>
        <div className="console-heading">
          <span>New journey / {String(journeyCount + 1).padStart(2, "0")}</span>
          <span className="console-status"><i /> ready for a question</span>
        </div>

        <fieldset className="performer-fieldset">
          <legend><span>1</span> Choose a performer</legend>
          <div className="performer-grid">
            {PERFORMERS.map((item) => (
              <label key={item.id} className={`performer-card ${item.id === performerId ? "selected" : ""} ${item.accent}`}>
                <input
                  type="radio"
                  name="performer"
                  value={item.id}
                  checked={item.id === performerId}
                  onChange={() => setPerformerId(item.id)}
                />
                <span className="performer-mark" aria-hidden="true">{item.mark}</span>
                <span><strong>{item.name}</strong><small>{item.role}</small></span>
                <i aria-hidden="true">↗</i>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="selected-cue">
          <span>{performer.name}’s stage note</span>
          <p>“{performer.cue}”</p>
        </div>

        <fieldset>
          <legend><span>2</span> Set the research</legend>
          <div className="config-row">
            <div className="model-selector" aria-label="Research model">
              {MODELS.map((item) => (
                <button
                  type="button"
                  className={`model-ticket ${modelId === item.id ? "selected" : ""}`}
                  key={item.id}
                  aria-pressed={modelId === item.id}
                  onClick={() => setModelId(item.id)}
                >
                  <span className="ticket-logo">{item.mode === "live" ? "LIVE" : "DEMO"}</span>
                  <span><strong>{item.name}</strong><small>{item.disclosure}</small></span>
                </button>
              ))}
            </div>
            <div className="preset-tabs" aria-label="Research depth">
              {(Object.keys(PRESET_LABELS) as ResearchPreset[]).map((id) => (
                <button
                  type="button"
                  key={id}
                  className={preset === id ? "active" : ""}
                  aria-pressed={preset === id}
                  title={PRESET_LABELS[id].description}
                  onClick={() => setPreset(id)}
                >
                  {PRESET_LABELS[id].name}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend><span>3</span> Bring a question</legend>
          <div className="starter-chips" aria-label="Question starters">
            {STARTER_QUESTIONS.slice(0, 4).map((question) => (
              <button type="button" key={question} onClick={() => setSeed(question)}>
                {question}
              </button>
            ))}
          </div>
          <label className="question-input">
            <span className="sr-only">Starting question</span>
            <textarea
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              minLength={3}
              maxLength={280}
              rows={3}
              required
              placeholder="What are you curious about?"
            />
            <small>{seed.length}/280</small>
          </label>
        </fieldset>

        <button className="launch-button" type="submit" disabled={creating || seed.trim().length < 3}>
          <span>{creating ? "Researching in the foreground…" : model.mode === "live" ? "Begin live research" : "Begin the free demo"}</span>
          <i aria-hidden="true">↘</i>
        </button>
        <p className="honesty-note">
          <span aria-hidden="true">◉</span>
          {model.mode === "live"
            ? "Live mode uses metered OpenAI tokens and web search. Keep this page open; no work continues in the background."
            : "The free demo uses reviewed fixtures and makes no provider request."}
        </p>
      </form>
    </section>
  );
}

function LiveResearchStage({
  state,
  onComplete,
  onBack,
}: {
  state: LiveResearchState;
  onComplete: () => void;
  onBack: () => void;
}) {
  const resultTurn = state.result?.turns.find(
    (turn) => turn.id === state.result?.currentTurnId,
  );
  const interlude = resultTurn?.interlude ?? state.interlude;
  const progress = state.status === "complete" ? 100 : Math.min(92, 12 + state.events.length * 11);
  return (
    <section className="research-stage" aria-labelledby="live-research-title">
      <div className="research-topline">
        <p><span className="live-dot" /> Research Trail / live foreground run</p>
        {state.status === "complete" ? (
          <button type="button" onClick={onComplete}>Open performance <span>→</span></button>
        ) : state.status === "error" ? (
          <button type="button" onClick={onBack}>Return safely <span>→</span></button>
        ) : (
          <span className="foreground-note">Keep this page open</span>
        )}
      </div>
      <div className="research-question">
        <span>{state.message}</span>
        <h1 id="live-research-title">{state.question}</h1>
      </div>
      <div className="research-layout">
        <ol className="research-feed" aria-live="polite">
          {state.events.length ? (
            state.events.map((event) => (
              <li key={event.id} className="visible">
                <span>{String(event.sequence + 1).padStart(2, "0")}</span>
                <i className={`event-icon ${event.kind}`} aria-hidden="true" />
                <div><small>{event.kind}</small><p>{event.label}</p></div>
                <strong aria-label="complete">✓</strong>
              </li>
            ))
          ) : (
            <li className="visible">
              <span>01</span>
              <i className="event-icon status" aria-hidden="true" />
              <div><small>status</small><p>Reserving one foreground run—no background job is created…</p></div>
            </li>
          )}
          {state.status === "error" && (
            <li className="research-error visible">
              <span>!</span>
              <i className="event-icon check" aria-hidden="true" />
              <div><small>not committed</small><p>{state.error}</p></div>
            </li>
          )}
        </ol>
        {interlude ? (
          <aside className="interlude-card revealed">
            <span>Curiosity interlude / sourced fact</span>
            <blockquote>“{interlude.text}”</blockquote>
            <a href={interlude.sourceUrl} target="_blank" rel="noreferrer">
              {interlude.sourceTitle} ↗
            </a>
          </aside>
        ) : (
          <aside className="interlude-card research-holding-card">
            <span>Evidence is arriving</span>
            <blockquote>Sources and one thought-provoking fact will appear here after validation.</blockquote>
            <small>WonderDrive shows activity and evidence—not private chain-of-thought.</small>
          </aside>
        )}
      </div>
      <div className="research-progress" aria-label={`${progress}% of live research complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="fixture-disclosure">
        Live mode makes a metered OpenAI Responses request with web search. A turn is saved only after its source links, answer blocks, and exactly two paths pass validation.
      </p>
    </section>
  );
}

function ResearchReplay({ turn, onComplete }: { turn: JourneyTurn; onComplete: () => void }) {
  const [visible, setVisible] = useState(1);
  const total = turn.researchEvents.length;

  useEffect(() => {
    if (visible >= total) return;
    const timer = window.setTimeout(() => setVisible((value) => value + 1), 620);
    return () => window.clearTimeout(timer);
  }, [visible, total]);

  const complete = visible >= total;
  const progress = Math.round((visible / total) * 100);

  return (
    <section className="research-stage" aria-labelledby="research-title">
      <div className="research-topline">
        <p><span className="live-dot" /> Research Trail / {turn.research.mode === "live" ? "saved live activity" : "fixture replay"}</p>
        <button type="button" onClick={onComplete}>{complete ? "Open performance" : "Skip replay"} <span>→</span></button>
      </div>
      <div className="research-question">
        <span>Rehearsing question</span>
        <h1 id="research-title">{turn.question}</h1>
      </div>
      <div className="research-layout">
        <ol className="research-feed" aria-live="polite">
          {turn.researchEvents.map((event, index) => (
            <li key={event.id} className={index < visible ? "visible" : "waiting"}>
              <span>{String(event.sequence + 1).padStart(2, "0")}</span>
              <i className={`event-icon ${event.kind}`} aria-hidden="true" />
              <div><small>{event.kind}</small><p>{index < visible ? event.label : "Waiting for previous check…"}</p></div>
              {index < visible && <strong aria-label="complete">✓</strong>}
            </li>
          ))}
        </ol>
        <aside className={`interlude-card ${visible >= 3 ? "revealed" : ""}`}>
          <span>Curiosity interlude / sourced fact</span>
          <blockquote>“{turn.interlude.text}”</blockquote>
          <a href={turn.interlude.sourceUrl} target="_blank" rel="noreferrer">{turn.interlude.sourceTitle} ↗</a>
        </aside>
      </div>
      <div className="research-progress" aria-label={`${progress}% of replay complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <p className="fixture-disclosure">
        {turn.research.mode === "live"
          ? "This replays observable provider activity and sources saved with the turn. It never exposes private model reasoning."
          : "This is a deterministic replay of stored, reviewed material. It demonstrates the research UX without claiming a live search or exposing private model reasoning."}
      </p>
    </section>
  );
}

function PerformanceStage({
  journey,
  turn,
  busy,
  onChoose,
  onReject,
  onDelegate,
  onMap,
}: {
  journey: JourneyDetail;
  turn: JourneyTurn;
  busy: string | null;
  onChoose: (optionId: string) => void;
  onReject: (adventure: number) => void;
  onDelegate: () => void;
  onMap: () => void;
}) {
  const [adventure, setAdventure] = useState(50);
  const performer = PERFORMERS.find((item) => item.id === journey.performerId)!;
  const historical = turn.id !== journey.currentTurnId;
  const actionable = turn.options.length === 2;

  return (
    <section className="performance-stage" aria-labelledby="performance-title">
      <header className="performance-header">
        <div>
          <p className="eyebrow"><span /> Turn {turn.depth + 1} · {performer.name}</p>
          <h1 id="performance-title">{turn.question}</h1>
        </div>
        <div className="stage-metrics">
          <span><strong>{journey.turnCount}</strong> turns</span>
          <span><strong>{journey.sourceCount}</strong> sources</span>
          <button type="button" onClick={onMap}>Open map ↗</button>
        </div>
      </header>

      {historical && (
        <div className="branch-notice" role="note">
          <span aria-hidden="true">⑂</span>
          <p><strong>You are revisiting an earlier turn.</strong> Choosing a path here creates a visible branch; your existing turns stay in the map.</p>
        </div>
      )}

      <div className="performance-grid">
        <article className="answer-panel">
          <div className="answer-byline">
            <span className={`performer-mark ${performer.accent}`}>{performer.mark}</span>
            <div><strong>{performer.name}</strong><small>{turn.research.mode === "live" ? "performed from live web research" : "performed from a reviewed fixture"}</small></div>
            <span className="ready-stamp">COMPOSED</span>
          </div>
          <div className="answer-copy">
            {turn.answerBlocks.map((block, blockIndex) => (
              <p key={`${turn.id}-${blockIndex}`}>
                {block.text}{" "}
                {block.sourceIds.map((sourceId) => {
                  const sourceIndex = turn.sources.findIndex((source) => source.id === sourceId);
                  return sourceIndex >= 0 ? (
                    <a
                      className="citation"
                      key={sourceId}
                      href={turn.sources[sourceIndex].url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Source ${sourceIndex + 1}: ${turn.sources[sourceIndex].title}`}
                    >
                      {sourceIndex + 1}
                    </a>
                  ) : null;
                })}
              </p>
            ))}
          </div>
          <p className="transition-line"><span>Where this leaves us</span>{turn.transition}</p>

          <details className="evidence-drawer">
            <summary><span>Sources &amp; evidence</span><strong>{turn.sources.length} inspectable links</strong></summary>
            <ol>
              {turn.sources.map((source, index) => (
                <li key={source.id}>
                  <span>{index + 1}</span>
                  <div><strong>{source.title}</strong><small>{source.publisher} · {source.relation}</small></div>
                  <a href={source.url} target="_blank" rel="noreferrer">Open ↗</a>
                </li>
              ))}
            </ol>
          </details>
          <details className="evidence-drawer research-summary">
            <summary><span>Research Trail</span><strong>activity, not private reasoning</strong></summary>
            <p>{turn.researchSummary}</p>
            <ul>
              {turn.researchEvents.map((event) => <li key={event.id}>{event.label}</li>)}
            </ul>
            {turn.research.mode === "live" && (
              <dl className="usage-strip">
                <div><dt>Input</dt><dd>{turn.research.usage.inputTokens.toLocaleString()} tokens</dd></div>
                <div><dt>Output</dt><dd>{turn.research.usage.outputTokens.toLocaleString()} tokens</dd></div>
                <div><dt>Web</dt><dd>{turn.research.usage.webSearchCalls} searches</dd></div>
                <div><dt>Elapsed</dt><dd>{Math.round(turn.research.usage.latencyMs / 1000)}s</dd></div>
              </dl>
            )}
          </details>
        </article>

        <aside className="direction-panel" aria-labelledby="direction-title">
          <p className="panel-index">Audience direction / 02 paths</p>
          <h2 id="direction-title">Where should<br />curiosity go next?</h2>
          <p>Each path becomes its own researched turn. Nothing continues until you decide.</p>

          <div className="path-stack">
            {turn.options.map((option, index) => (
              <button
                type="button"
                className={`path-card path-${index + 1}`}
                key={option.id}
                disabled={!actionable || busy !== null}
                onClick={() => onChoose(option.id)}
              >
                <span><i>{index === 0 ? "A" : "B"}</i>{option.angle}</span>
                <strong>{option.question}</strong>
                <small>{historical ? "Branch from here" : "Take this path"} <b aria-hidden="true">↘</b></small>
              </button>
            ))}
          </div>

          <button className="delegate-button" type="button" disabled={busy !== null} onClick={onDelegate}>
            <span aria-hidden="true">✦</span>
            <span><strong>Let {performer.name.replace("The ", "")} choose</strong><small>Delegate this turn only</small></span>
            <i aria-hidden="true">→</i>
          </button>

          <div className="reject-control">
            <div><strong>Neither path?</strong><span>Free deterministic redraw</span></div>
            <label>
              <span>Grounded</span>
              <input
                type="range"
                min="0"
                max="100"
                value={adventure}
                onChange={(event) => setAdventure(Number(event.target.value))}
                aria-label="Replacement path adventure level"
              />
              <span>Adventurous</span>
            </label>
            <button type="button" disabled={busy !== null} onClick={() => onReject(adventure)}>
              {busy === "reject" ? "Replacing…" : "Reject both & redraw"}
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function JourneyMap({
  journey,
  activeTurnId,
  onSelect,
  onContinue,
}: {
  journey: JourneyDetail;
  activeTurnId: string;
  onSelect: (id: string) => void;
  onContinue: (id: string) => void;
}) {
  const activeTurn = journey.turns.find((turn) => turn.id === activeTurnId) ?? journey.turns[0];
  const childCount = journey.turns.filter((turn) => turn.parentTurnId === activeTurn.id).length;
  return (
    <section className="map-view" aria-labelledby="map-title">
      <header className="view-heading">
        <div><p className="eyebrow"><span /> Saved journey / version {journey.version}</p><h1 id="map-title">The path is<br /><em>part of the answer.</em></h1></div>
        <div><p>{journey.title}</p><span>{journey.turnCount} turns · {journey.sourceCount} sources</span></div>
      </header>
      <div className="map-layout">
        <div className="turn-tree" role="tree" aria-label="Journey turns">
          <div className="map-legend"><span><i className="current" /> current</span><span><i className="visited" /> visited</span><span><i className="selected" /> selected</span></div>
          {journey.turns.map((turn, index) => {
            const current = turn.id === journey.currentTurnId;
            const selected = turn.id === activeTurnId;
            return (
              <button
                type="button"
                role="treeitem"
                aria-selected={selected}
                key={turn.id}
                className={`turn-node ${current ? "current" : "visited"} ${selected ? "selected" : ""}`}
                style={{ marginInlineStart: `${Math.min(turn.depth, 6) * 46}px` }}
                onClick={() => onSelect(turn.id)}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <i aria-hidden="true" />
                <div><small>{turn.topicLabel}{current ? " · current" : ""}</small><strong>{turn.question}</strong></div>
                <b aria-hidden="true">→</b>
              </button>
            );
          })}
        </div>
        <aside className="map-inspector">
          <span>Selected turn / {activeTurn.depth + 1}</span>
          <h2>{activeTurn.question}</h2>
          <p>{activeTurn.researchSummary}</p>
          <dl><div><dt>Topic</dt><dd>{activeTurn.topicLabel}</dd></div><div><dt>Branches from here</dt><dd>{childCount}</dd></div><div><dt>Sources</dt><dd>{activeTurn.sources.length}</dd></div></dl>
          <button type="button" onClick={() => onContinue(activeTurn.id)}>{activeTurn.id === journey.currentTurnId ? "Return to this turn" : "Revisit & branch"} <span>↗</span></button>
          <small>Earlier turns remain saved even when you choose a new direction.</small>
        </aside>
      </div>
    </section>
  );
}

function Library({
  journeys,
  viewer,
  busy,
  onOpen,
  onDelete,
  onNew,
}: {
  journeys: JourneySummary[];
  viewer: Viewer | null;
  busy: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  return (
    <section className="library-view" aria-labelledby="library-title">
      <header className="view-heading">
        <div><p className="eyebrow"><span /> Durable library / D1</p><h1 id="library-title">Questions worth<br /><em>returning to.</em></h1></div>
        <div><p>{journeys.length} of {viewer?.journeyLimit ?? "—"} journeys saved</p><button type="button" className="compact-action" onClick={onNew}>New drive +</button></div>
      </header>
      {journeys.length ? (
        <div className="library-grid">
          {journeys.map((journey, index) => {
            const performer = PERFORMERS.find((item) => item.id === journey.performerId)!;
            return (
              <article key={journey.id} className="library-card">
                <div className="library-card-top"><span>{String(index + 1).padStart(2, "0")}</span><i className={performer.accent}>{performer.mark}</i></div>
                <p>{journey.topicLabels.join(" · ") || "unclassified journey"}</p>
                <h2>{journey.title}</h2>
                <dl><div><dt>Turns</dt><dd>{journey.turnCount}</dd></div><div><dt>Sources</dt><dd>{journey.sourceCount}</dd></div><div><dt>Performer</dt><dd>{performer.name.replace("The ", "")}</dd></div></dl>
                <div className="library-actions">
                  <button type="button" disabled={busy !== null} onClick={() => onOpen(journey.id)}>Resume <span>↗</span></button>
                  {confirmDelete === journey.id ? (
                    <span className="delete-confirm"><button type="button" disabled={busy !== null} onClick={() => onDelete(journey.id)}>Delete</button><button type="button" onClick={() => setConfirmDelete(null)}>Keep</button></span>
                  ) : (
                    <button type="button" className="text-button" onClick={() => setConfirmDelete(journey.id)}>Remove</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyStage onOpenLibrary={onNew} label="Start the first saved journey" />
      )}
    </section>
  );
}

function CompareView({
  journeys,
  selected,
  comparison,
  busy,
  onToggle,
  onCompare,
  onNew,
}: {
  journeys: JourneySummary[];
  selected: string[];
  comparison: CompareResult | null;
  busy: boolean;
  onToggle: (id: string) => void;
  onCompare: () => void;
  onNew: () => void;
}) {
  return (
    <section className="compare-view" aria-labelledby="compare-title">
      <header className="view-heading">
        <div><p className="eyebrow"><span /> Manual comparison / no provider call</p><h1 id="compare-title">Two journeys.<br /><em>One closer look.</em></h1></div>
        <div><p>Select two saved journeys. WonderDrive compares their committed paths, topics, and performers.</p></div>
      </header>
      {journeys.length >= 2 ? (
        <>
          <div className="compare-picker">
            {journeys.map((journey, index) => {
              const chosen = selected.includes(journey.id);
              return (
                <button type="button" key={journey.id} className={chosen ? "selected" : ""} aria-pressed={chosen} onClick={() => onToggle(journey.id)}>
                  <span>{String(index + 1).padStart(2, "0")}</span><strong>{journey.title}</strong><small>{journey.turnCount} turns · {journey.topicLabels.join(", ")}</small><i>{chosen ? "✓" : "+"}</i>
                </button>
              );
            })}
          </div>
          <button className="compare-action" type="button" disabled={selected.length !== 2 || busy} onClick={onCompare}>{busy ? "Reading the paths…" : "Compare selected journeys"} <span>↘</span></button>
          {comparison && <ComparisonReport result={comparison} />}
        </>
      ) : (
        <div className="compare-empty"><p>Comparison begins after two journeys exist.</p><button type="button" onClick={onNew}>Start another drive →</button></div>
      )}
    </section>
  );
}

function ComparisonReport({ result }: { result: CompareResult }) {
  return (
    <section className="comparison-report" aria-labelledby="report-title">
      <div className="report-title"><span>Comparison ready</span><h2 id="report-title">The useful difference</h2></div>
      <div className="compare-columns">
        {[result.left, result.right].map((journey, index) => (
          <article key={journey.id}>
            <span>Path {index === 0 ? "A" : "B"}</span><h3>{journey.title}</h3><p>{journey.turnCount} turns with {journey.sourceCount} cited source appearances.</p><div>{journey.topicLabels.map((topic) => <small key={topic}>{topic}</small>)}</div>
          </article>
        ))}
      </div>
      <div className="observations"><span>What the saved data shows</span><ul>{result.observations.map((observation) => <li key={observation}>{observation}</li>)}</ul></div>
    </section>
  );
}

function LoadingStage() {
  return <section className="loading-stage" aria-live="polite"><span className="loading-orbit" /><p>Opening your WonderDrive library…</p><small>Resolving a durable guest identity</small></section>;
}

function EmptyStage({ onOpenLibrary, label = "Open the journey library" }: { onOpenLibrary: () => void; label?: string }) {
  return <section className="empty-stage"><span aria-hidden="true">?</span><h1>No journey is on stage.</h1><p>Start a new question or return to one you have already saved.</p><button type="button" onClick={onOpenLibrary}>{label} →</button></section>;
}

async function streamLiveResearch(
  request: LiveResearchRequest,
  setState: Dispatch<SetStateAction<LiveResearchState | null>>,
) {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const payload = (await response.json()) as ApiFailure;
    throw new Error(payload.error?.message ?? "Live research could not start.");
  }
  if (!response.body) throw new Error("Live research did not return a readable stream.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete: Extract<LiveResearchStreamEvent, { type: "complete" }> | null = null;
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line) as LiveResearchStreamEvent;
        if (event.type === "started") {
          setState((current) =>
            current
              ? { ...current, question: event.question, message: event.message }
              : current,
          );
        } else if (event.type === "activity") {
          setState((current) =>
            current
              ? {
                  ...current,
                  events: current.events.some((item) => item.id === event.event.id)
                    ? current.events
                    : [...current.events, event.event],
                }
              : current,
          );
        } else if (event.type === "interlude") {
          setState((current) =>
            current ? { ...current, interlude: event.interlude } : current,
          );
        } else if (event.type === "error") {
          throw new Error(event.error.message);
        } else if (event.type === "complete") {
          complete = event;
        }
      }
      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }
  if (!complete) throw new Error("Live research ended before a turn was committed.");
  return complete;
}

async function api<T>(url: string, init?: RequestInit): Promise<ApiSuccess<T>> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json()) as ApiSuccess<T> | ApiFailure;
  if (!response.ok || "error" in payload) {
    throw new Error("error" in payload ? payload.error.message : "The request failed.");
  }
  return payload;
}

function upsertSummary(current: JourneySummary[], detail: JourneyDetail): JourneySummary[] {
  const summary: JourneySummary = {
    id: detail.id,
    title: detail.title,
    seed: detail.seed,
    performerId: detail.performerId,
    modelId: detail.modelId,
    researchPreset: detail.researchPreset,
    currentTurnId: detail.currentTurnId,
    turnCount: detail.turnCount,
    sourceCount: detail.sourceCount,
    version: detail.version,
    updatedAt: detail.updatedAt,
    topicLabels: detail.topicLabels,
  };
  return [summary, ...current.filter((journey) => journey.id !== summary.id)];
}

function messageFrom(cause: unknown): string {
  return cause instanceof Error ? cause.message : "WonderDrive could not complete that request.";
}
