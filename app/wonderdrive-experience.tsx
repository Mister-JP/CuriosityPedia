"use client";

import {
  type Dispatch,
  type FormEvent,
  type KeyboardEvent,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  CaretRight,
  CornersOut,
  Crosshair,
  ListBullets,
  MagnifyingGlass,
  Minus,
  Path,
  Plus,
  TreeStructure,
  X,
} from "@phosphor-icons/react";
import {
  BOOTSTRAP_CATALOG,
  DEFAULT_PREFERENCES,
  PERFORMERS,
  STARTERS,
} from "../lib/catalog";
import type {
  AdvanceJourneyRequest,
  AnswerDensity,
  BootstrapCatalog,
  CompareResult,
  DiagnosticsReport,
  ApiFailure,
  ImagePreference,
  JourneyDetail,
  JourneySnapshot,
  JourneySummary,
  JourneyTurn,
  ModelId,
  PersonalizedStarter,
  PerformerId,
  ResearchPreset,
  TextSize,
  UsageSummary,
  UserPreferences,
  Viewer,
} from "../lib/contracts";
import { SUPPORTED_LOCALES, localeDirection } from "../lib/i18n";
import {
  api,
  errorCodeFrom,
  type LiveResearchState,
  messageFrom,
  starterRecommendationsUrl,
  streamLiveResearch,
} from "./client-api";
import { I18nProvider, translate, useI18n } from "./i18n";

type View = "start" | "journey" | "map" | "library" | "compare" | "usage" | "settings";

type SessionPayload = {
  journeys: JourneySummary[];
};

type BootstrapPayload = {
  catalog: BootstrapCatalog;
  preferences: UserPreferences;
};

type StarterPayload = { starters: PersonalizedStarter[] };
type JourneyViewOptions = {
  turnId?: string;
  view?: View;
  syncLibrary?: boolean;
};

const navItems: Array<{ id: View; label: string }> = [
  { id: "start", label: "New drive" },
  { id: "library", label: "Library" },
  { id: "compare", label: "Compare" },
  { id: "usage", label: "Usage" },
  { id: "settings", label: "Settings" },
];

export function WonderDriveExperience() {
  const [view, setView] = useState<View>("start");
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [journeys, setJourneys] = useState<JourneySummary[]>([]);
  const [activeJourney, setActiveJourney] = useState<JourneyDetail | null>(null);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mutation, setMutation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ApiFailure["error"]["code"] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [liveResearch, setLiveResearch] = useState<LiveResearchState | null>(null);
  const [catalog, setCatalog] = useState<BootstrapCatalog>(BOOTSTRAP_CATALOG);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [nextModelId, setNextModelId] = useState<ModelId | null>(null);
  const [personalizedStarters, setPersonalizedStarters] = useState<PersonalizedStarter[]>(
    BOOTSTRAP_CATALOG.discoveryStarters,
  );
  const t = (key: string, values?: Record<string, string | number>) => translate(preferences.interfaceLocale, key, values);

  const refreshSession = useCallback(async () => {
    setError(null);
    setErrorCode(null);
    try {
      const [session, bootstrap] = await Promise.all([
        api<SessionPayload>("/api/session"),
        api<BootstrapPayload>("/api/bootstrap"),
      ]);
      setViewer(session.viewer);
      setJourneys(session.data.journeys);
      setCatalog(bootstrap.data.catalog);
      setPreferences(bootstrap.data.preferences);
      void api<StarterPayload>(starterRecommendationsUrl("sage"))
        .then((payload) => setPersonalizedStarters(payload.data.starters))
        .catch(() => setPersonalizedStarters(bootstrap.data.catalog.discoveryStarters));
    } catch (cause) {
      setError(messageFrom(cause));
      setErrorCode(errorCodeFrom(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUsage = useCallback(async () => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const payload = await api<UsageSummary>("/api/usage");
      setViewer(payload.viewer);
      setUsage(payload.data);
    } catch (cause) {
      setUsageError(messageFrom(cause));
    } finally {
      setUsageLoading(false);
    }
  }, []);

  const runMutation = useCallback(async <T,>(
    key: string,
    work: () => Promise<T>,
    onError?: (message: string) => void,
  ): Promise<T | undefined> => {
    setMutation(key);
    setError(null);
    setErrorCode(null);
    try {
      return await work();
    } catch (cause) {
      const message = messageFrom(cause);
      setError(message);
      setErrorCode(errorCodeFrom(cause));
      onError?.(message);
    } finally {
      setMutation(null);
    }
  }, []);

  /** Keeps every client projection of the selected journey in one atomic React update path. */
  const presentJourney = useCallback((
    detail: JourneyDetail,
    nextViewer: Viewer,
    { turnId = detail.currentTurnId, view = "journey", syncLibrary = true }: JourneyViewOptions = {},
  ) => {
    setViewer(nextViewer);
    setActiveJourney(detail);
    setNextModelId(detail.modelId);
    setActiveTurnId(turnId);
    setView(view);
    if (syncLibrary) setJourneys((current) => upsertSummary(current, detail));
  }, []);

  useEffect(() => {
    // The first client effect hydrates the durable server session; updates happen after fetch resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (view !== "usage") return;
    // The route transition intentionally refreshes server-owned rolling counters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUsage();
  }, [refreshUsage, view]);

  const openJourney = useCallback(async (journeyId: string, targetView: View = "journey") => {
    await runMutation(`open-${journeyId}`, async () => {
      const payload = await api<JourneyDetail>(`/api/journeys/${journeyId}`);
      presentJourney(payload.data, payload.viewer, { view: targetView, syncLibrary: false });
    });
  }, [presentJourney, runMutation]);

  async function create(config: {
    seed: string;
    performerId: PerformerId;
    modelId: ModelId;
    researchPreset: ResearchPreset;
    answerDensity: AnswerDensity;
    imagePreference: ImagePreference;
    outputLocale: UserPreferences["defaultOutputLocale"];
  }) {
    if (viewer && journeys.length >= viewer.journeyLimit) {
      setErrorCode("JOURNEY_LIMIT");
      setError(t("Your saved-journey library is full ({count}/{limit}). Delete one journey to make room.", {
        count: journeys.length,
        limit: viewer.journeyLimit,
      }));
      setView("library");
      return;
    }
    await runMutation("create", async () => {
      setView("journey");
      setLiveResearch({
        question: config.seed,
        performerId: config.performerId,
        message: t("Connecting to live foreground research…"),
        events: [],
        status: "running",
        result: null,
        error: null,
        errorCode: null,
        diagnosticId: null,
        retryAttempt: 0,
        maxRetries: 0,
      });
      const complete = await streamLiveResearch(
        { kind: "create", ...config, idempotencyKey: crypto.randomUUID() },
        setLiveResearch,
      );
      presentJourney(complete.data, complete.viewer);
      setLiveResearch((current) =>
        current
          ? { ...current, status: "complete", result: complete.data, message: t("Research committed") }
          : current,
      );
    }, (message) => {
      setLiveResearch((current) =>
        current ? { ...current, status: "error", error: message, message: t("Research stopped") } : null,
      );
    });
  }

  async function advance(
    action: AdvanceJourneyRequest["action"],
    input: { turnId: string; optionId?: string; adventure?: number; reason?: string },
  ) {
    if (!activeJourney) return;
    const modelId = nextModelId ?? activeJourney.modelId;
    await runMutation(action, async () => {
      if (action !== "reject") {
        const fromTurn = activeJourney.turns.find((turn) => turn.id === input.turnId);
        const selected =
          action === "delegate"
            ? fromTurn?.options.find((option) => option.position === fromTurn.preferredPosition)
            : fromTurn?.options.find((option) => option.id === input.optionId);
        if (!fromTurn || !selected) throw new Error(t("Choose one of the two current paths."));
        setView("journey");
        setLiveResearch({
          question: selected.question,
          performerId: activeJourney.performerId,
          message: t("Opening the next live research turn…"),
          events: [],
          status: "running",
          result: null,
          error: null,
          errorCode: null,
          diagnosticId: null,
          retryAttempt: 0,
          maxRetries: 0,
        });
        const complete = await streamLiveResearch(
          {
            kind: "advance",
            journeyId: activeJourney.id,
            fromTurnId: input.turnId,
            action,
            modelId,
            optionId: input.optionId,
            expectedVersion: activeJourney.version,
            idempotencyKey: crypto.randomUUID(),
          },
          setLiveResearch,
        );
        presentJourney(complete.data, complete.viewer);
        setLiveResearch((current) =>
          current
            ? { ...current, status: "complete", result: complete.data, message: t("Research committed") }
            : current,
        );
        return;
      }
      const payload = await api<JourneyDetail>(
        `/api/journeys/${activeJourney.id}/advance`,
        {
          method: "POST",
          body: JSON.stringify({
            fromTurnId: input.turnId,
            action,
            modelId,
            optionId: input.optionId,
            adventure: input.adventure,
            reason: input.reason,
            expectedVersion: activeJourney.version,
            idempotencyKey: crypto.randomUUID(),
          }),
        },
      );
      presentJourney(payload.data, payload.viewer, {
        turnId: action === "reject" ? input.turnId : payload.data.currentTurnId,
      });
    }, (message) => {
      setLiveResearch((current) =>
          current ? { ...current, status: "error", error: message, message: t("Research stopped") } : null,
      );
      if (message.toLowerCase().includes("another tab")) void openJourney(activeJourney.id);
    });
  }

  async function removeJourney(journeyId: string) {
    await runMutation(`delete-${journeyId}`, async () => {
      await api<{ id: string }>(`/api/journeys/${journeyId}`, { method: "DELETE" });
      setJourneys((current) => current.filter((journey) => journey.id !== journeyId));
      setCompareIds((current) => current.filter((id) => id !== journeyId));
      if (activeJourney?.id === journeyId) {
        setActiveJourney(null);
        setActiveTurnId(null);
        setView("library");
      }
    });
  }

  async function manageJourney(journeyId: string, changes: { title?: string; pinned?: boolean; hidden?: boolean }) {
    await runMutation(`manage-${journeyId}`, async () => {
      const payload = await api<JourneyDetail>(`/api/journeys/${journeyId}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });
      setViewer(payload.viewer);
      setJourneys((current) => upsertSummary(current, payload.data));
      if (activeJourney?.id === journeyId) setActiveJourney(payload.data);
    });
  }

  async function snapshotJourney(journeyId: string) {
    await runMutation(`snapshot-${journeyId}`, async () => {
      const payload = await api<JourneySnapshot>(`/api/journeys/${journeyId}/snapshots`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setNotice(`${payload.data.label}: ${payload.data.summary}`);
    });
  }

  async function compare() {
    if (compareIds.length !== 2) return;
    await runMutation("compare", async () => {
      const params = new URLSearchParams({ left: compareIds[0], right: compareIds[1] });
      const payload = await api<CompareResult>(`/api/compare?${params}`);
      setComparison(payload.data);
    });
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
    <I18nProvider locale={preferences.interfaceLocale}>
    <main className={`app-shell text-${preferences.textSize} ${preferences.reduceMotion ? "reduce-motion" : ""}`}>
      <header className="app-header">
        <button className="wordmark" type="button" onClick={() => navigate("start")}>
          <span className="wordmark-mark" aria-hidden="true">W</span>
          <span>
            WonderDrive
            <small>{t("curiosity, performed")}</small>
          </span>
        </button>

        <nav className="app-nav" aria-label={t("WonderDrive views")}>
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={view === item.id ? "active" : ""}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              {t(item.label)}
            </button>
          ))}
        </nav>

        <div className="identity-control">
          <span className={`identity-dot ${viewer?.mode ?? "loading"}`} aria-hidden="true" />
          {viewer?.mode === "chatgpt" ? (
            <span><strong>{viewer.displayName}</strong><small>{t("ChatGPT account")}</small></span>
          ) : (
            <span><strong>{viewer?.displayName ?? t("Opening library…")}</strong><small>{viewer ? t("{count}/{limit} saved", { count: journeys.length, limit: viewer.journeyLimit }) : t("durable session")}</small></span>
          )}
          {viewer?.mode === "guest" ? (
            <a className="identity-action" href="/signin-with-chatgpt?return_to=%2F">{t("Sign in")}</a>
          ) : viewer?.mode === "chatgpt" ? (
            <a className="identity-action" href="/signout-with-chatgpt?return_to=%2F">{t("Sign out")}</a>
          ) : null}
        </div>
      </header>

      {view !== "start" && (
        <div className="phase-ribbon" role="note">
          <span>{t("Research first")}</span>
          {t("Same selected model researches and performs · inspectable sources · durable branching graph")}
        </div>
      )}

      {viewer?.mode === "chatgpt" && viewer.hasGuestUpgrade && (
        <div className="upgrade-banner" role="status">
          <span>{t("Your guest library is still separate.")}</span>
          <button type="button" onClick={() => void upgradeGuestLibrary(setViewer, refreshSession, setError)}>
            {t("Move guest journeys into this account")}
          </button>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <div className="error-banner-actions">
            {errorCode === "JOURNEY_LIMIT" ? (
              <button type="button" onClick={() => { setError(null); setView("library"); }}>{t("Manage saved journeys")}</button>
            ) : errorCode === "LIVE_RESEARCH_LIMIT" || errorCode === "BUDGET_EXCEEDED" ? (
              <button type="button" onClick={() => { setError(null); setView("usage"); }}>{t("View usage")}</button>
            ) : (
              <button type="button" onClick={() => { setError(null); void refreshSession(); }}>{t("Reconnect")}</button>
            )}
          </div>
        </div>
      )}
      {notice && (
        <div className="notice-banner" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)}>{t("Dismiss")}</button>
        </div>
      )}

      {loading ? (
        <LoadingStage />
      ) : liveResearch ? (
        <JourneyBufferingStage
          state={liveResearch}
          errorCode={liveResearch.errorCode ?? errorCode}
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
            if ((liveResearch.errorCode ?? errorCode) === "JOURNEY_LIMIT") setView("library");
            else if (["LIVE_RESEARCH_LIMIT", "BUDGET_EXCEEDED"].includes(liveResearch.errorCode ?? errorCode ?? "")) setView("usage");
            else setView(activeJourney ? "journey" : "start");
          }}
        />
      ) : view === "start" ? (
        <StartStage
          onCreate={create}
          creating={mutation === "create"}
          journeyCount={journeys.length}
          catalog={catalog}
          preferences={preferences}
          starters={personalizedStarters}
        />
      ) : view === "library" ? (
        <Library
          journeys={journeys}
          viewer={viewer}
          busy={mutation}
          onOpen={(id) => void openJourney(id)}
          onDelete={(id) => void removeJourney(id)}
          onManage={(id, changes) => void manageJourney(id, changes)}
          onSnapshot={(id) => void snapshotJourney(id)}
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
      ) : view === "usage" ? (
        <UsageView
          usage={usage}
          viewer={viewer}
          loading={usageLoading}
          error={usageError}
          onRefresh={() => void refreshUsage()}
          onOpenLibrary={() => setView("library")}
        />
      ) : view === "settings" ? (
        <SettingsView
          viewer={viewer}
          preferences={preferences}
          busy={mutation === "preferences"}
          onSave={async (next) => {
            await runMutation("preferences", async () => {
              const payload = await api<UserPreferences>("/api/preferences", {
                method: "PUT",
                body: JSON.stringify(next),
              });
              setViewer(payload.viewer);
              setPreferences(payload.data);
              if (payload.data.defaultOutputLocale !== preferences.defaultOutputLocale) {
                void api<StarterPayload>(starterRecommendationsUrl("sage", true))
                  .then((startersPayload) => setPersonalizedStarters(startersPayload.data.starters));
              }
            });
          }}
        />
      ) : activeJourney && activeTurn ? (
        <div className="active-journey-shell">
          <nav className="journey-view-switcher" aria-label={t("Current journey views")}>
            <span>{activeJourney.title}</span>
            <label className="journey-model-switcher">
              <span>{t("Next turn model")}</span>
              <select
                aria-label={t("Model for the next research turn")}
                disabled={mutation !== null}
                value={nextModelId ?? activeJourney.modelId}
                onChange={(event) => setNextModelId(event.target.value as ModelId)}
              >
                {catalog.models.map((model) => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </label>
            <div>
              <button type="button" className={view === "journey" ? "active" : ""} aria-current={view === "journey" ? "page" : undefined} onClick={() => setView("journey")}>{t("Stage")}</button>
              <button type="button" className={view === "map" ? "active" : ""} aria-current={view === "map" ? "page" : undefined} onClick={() => setView("map")}>{t("Journey map")}</button>
            </div>
          </nav>
          {view === "map" ? (
            <JourneyMap
              journey={activeJourney}
              activeTurnId={activeTurn.id}
              onSelect={(turnId) => {
                setActiveTurnId(turnId);
              }}
              onContinue={(turnId) => {
                setActiveTurnId(turnId);
                setView("journey");
              }}
              onChoose={(turnId, optionId) => void advance("choose", { turnId, optionId })}
            />
          ) : (
            <PerformanceStage
              journey={activeJourney}
              turn={activeTurn}
              busy={mutation}
              onChoose={(optionId) => void advance("choose", { turnId: activeTurn.id, optionId })}
              onReject={(adventure, reason) => void advance("reject", { turnId: activeTurn.id, adventure, reason })}
              onDelegate={() => void advance("delegate", { turnId: activeTurn.id })}
              speechRate={preferences.speechRate}
              onSnapshot={() => void snapshotJourney(activeJourney.id)}
            />
          )}
        </div>
      ) : (
        <EmptyStage onOpenLibrary={() => setView("library")} />
      )}

      {view !== "start" && (
        <footer className="app-footer">
          <p><span aria-hidden="true">W/V3</span> {t("One performer. One researched turn. Exactly two ways forward.")}</p>
          <div>
            <a href="https://github.com/Mister-JP/WonderDrive">{t("Source")}</a>
            <a href="https://github.com/Mister-JP/WonderDrive/blob/main/docs/WonderDrive_Final_Product_and_Engineering_Blueprint_v3_Research_First.docx">{t("Product book")}</a>
          </div>
        </footer>
      )}
    </main>
    </I18nProvider>
  );
}

function StartStage({
  onCreate,
  creating,
  journeyCount,
  catalog,
  preferences,
  starters,
}: {
  onCreate: (config: {
    seed: string;
    performerId: PerformerId;
    modelId: ModelId;
    researchPreset: ResearchPreset;
    answerDensity: AnswerDensity;
    imagePreference: ImagePreference;
    outputLocale: UserPreferences["defaultOutputLocale"];
  }) => void;
  creating: boolean;
  journeyCount: number;
  catalog: BootstrapCatalog;
  preferences: UserPreferences;
  starters: PersonalizedStarter[];
}) {
  const { t } = useI18n();
  const [seed, setSeed] = useState("");
  const [performerId, setPerformerId] = useState<PerformerId>("sage");
  const [modelId, setModelId] = useState<ModelId>("gpt-5.6-luna");
  const performerIdRef = useRef<PerformerId>("sage");
  const starterCache = useRef(new Map<PerformerId, PersonalizedStarter[]>([["sage", starters]]));
  const [visibleStarters, setVisibleStarters] = useState<PersonalizedStarter[]>(
    () => recommendationsForPerformer("sage", starters),
  );
  const [startersLoading, setStartersLoading] = useState(false);
  const performer = catalog.performers.find((item) => item.id === performerId)!;
  const model = catalog.models.find((item) => item.id === modelId)!;
  const placeholderQuestions = useMemo(
    () => visibleStarters.slice(0, 8).map((starter) => starter.question),
    [visibleStarters],
  );
  const animatedPlaceholder = useQuestionPlaceholder(
    placeholderQuestions,
    seed.length === 0 && !preferences.reduceMotion,
  );
  const normalizedSeed = seed.trim().toLowerCase();
  const autocompleteMatch = normalizedSeed.length >= 3
    ? visibleStarters.find((starter) => {
        const question = starter.question.toLowerCase();
        return question.startsWith(normalizedSeed) && question !== normalizedSeed;
      })
    : undefined;
  const exactMatch = normalizedSeed
    ? visibleStarters.find((starter) => starter.question.toLowerCase() === normalizedSeed)
    : undefined;

  useEffect(() => {
    starterCache.current.set("sage", starters);
    if (performerId === "sage") {
      // The parent hydrates history-aware suggestions after the rest of the session shell.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisibleStarters(recommendationsForPerformer("sage", starters));
    }
  }, [performerId, starters]);

  async function choosePerformer(nextId: PerformerId) {
    performerIdRef.current = nextId;
    setPerformerId(nextId);
    const cached = starterCache.current.get(nextId);
    if (cached) {
      setStartersLoading(false);
      setVisibleStarters(recommendationsForPerformer(nextId, cached));
      return;
    }

    setVisibleStarters(recommendationsForPerformer(nextId, starters));
    setStartersLoading(true);
    try {
      const payload = await api<StarterPayload>(starterRecommendationsUrl(nextId));
      starterCache.current.set(nextId, payload.data.starters);
      if (performerIdRef.current === nextId) {
        setVisibleStarters(recommendationsForPerformer(nextId, payload.data.starters));
      }
    } catch {
      // The performer-specific catalog questions are already visible as a safe fallback.
    } finally {
      if (performerIdRef.current === nextId) setStartersLoading(false);
    }
  }

  async function refreshStarterQuestions() {
    setStartersLoading(true);
    try {
      const payload = await api<StarterPayload>(
        starterRecommendationsUrl(performerId, true),
      );
      starterCache.current.set(performerId, payload.data.starters);
      setVisibleStarters(recommendationsForPerformer(performerId, payload.data.starters));
    } catch {
      // Keep the current set visible if fresh discovery is temporarily unavailable.
    } finally {
      setStartersLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (seed.trim().length >= 3) {
      onCreate({
        seed,
        performerId,
        modelId,
        researchPreset: "standard",
        answerDensity: preferences.answerDensity,
        imagePreference: preferences.imagePreference,
        outputLocale: preferences.defaultOutputLocale,
      });
    }
  }

  function completeQuestion(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Tab" && autocompleteMatch) {
      event.preventDefault();
      setSeed(autocompleteMatch.question);
    }
  }

  return (
    <section className="start-stage-simple" aria-labelledby="start-title">
      <form className="start-console-simple" onSubmit={submit}>
        <div className="recommendation-heading">
          <div>
            <strong>{visibleStarters.length} {t("rabbit holes")}</strong>
            <span>{startersLoading ? t("Scanning what’s unfolding now…") : t("Current signals + {performer} + {context}", { performer: performer.name, context: t(journeyCount ? "your history" : "wild-card domains") })}</span>
          </div>
          <button type="button" className="refresh-starters" disabled={startersLoading} onClick={() => void refreshStarterQuestions()}>
            <span aria-hidden="true">↻</span>{t(startersLoading ? "Hunting…" : "Find new questions")}
          </button>
        </div>
        <div className="starter-marquee starter-marquee-simple" aria-label={t("Questions suggested for {performer}", { performer: performer.name })}>
          <div className="starter-marquee-window">
            <div className="starter-marquee-track">
              {[0, 1].map((copy) => (
                <div className="starter-marquee-set" key={copy} aria-hidden={copy === 1}>
                  {visibleStarters.map((starter, index) => (
                    <button
                      type="button"
                      key={`${copy}-${starter.question}-${index}`}
                      onClick={() => setSeed(starter.question)}
                      tabIndex={copy === 1 ? -1 : undefined}
                    >
                      <span>{starter.topic}</span>
                      {starter.question}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <h1 id="start-title">{t("What are you curious about?")}</h1>
        <div className="question-field-shell">
          <label className="question-input question-input-simple">
            <span className="sr-only">{t("Starting question")}</span>
            <textarea
              value={seed}
              onChange={(event) => setSeed(event.target.value)}
              onKeyDown={completeQuestion}
              minLength={3}
              maxLength={280}
              rows={2}
              required
              aria-controls="question-autocomplete"
              placeholder={preferences.reduceMotion ? placeholderQuestions[0] ?? t("Ask anything…") : animatedPlaceholder}
            />
            <small>{seed.length}/280</small>
          </label>
          <div className="question-autocomplete" id="question-autocomplete" aria-live="polite">
            {autocompleteMatch ? (
              <button type="button" onClick={() => setSeed(autocompleteMatch.question)}>
                <span>{t("Tab to complete")}</span>{autocompleteMatch.question}
              </button>
            ) : exactMatch ? (
              <span><strong>{t("Recommended match")}</strong>{exactMatch.topic}</span>
            ) : (
              <span className="question-autocomplete-idle">{t("Start typing for recommendation matches")}</span>
            )}
          </div>
        </div>

        <div className="start-selectors">
          <label>
            <span>{t("Performer")}</span>
            <span className="start-select-wrap">
              <span className="performer-mark" aria-hidden="true">{performer.mark}</span>
              <select value={performerId} onChange={(event) => void choosePerformer(event.target.value as PerformerId)}>
                {catalog.performers.map((item) => (
                  <option value={item.id} key={item.id}>{item.name} — {t(item.role)}</option>
                ))}
              </select>
            </span>
          </label>
          <label>
            <span>{t("Model")}</span>
            <span className="start-select-wrap model-select-wrap">
              <select value={modelId} onChange={(event) => setModelId(event.target.value as ModelId)}>
                {catalog.models.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name} — {item.speedBand} · ${item.inputUsdPerMillion}/$${item.outputUsdPerMillion}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>

        <div className={`performer-layer ${performer.accent}`}>
          <span>{t("{performer} will carry this question", { performer: performer.name })}</span>
          <p>{t(performer.cue)}</p>
          <small>{performer.voiceTraits.map((trait) => t(trait)).join(" · ")}</small>
        </div>

        <button className="launch-button launch-button-simple" type="submit" disabled={creating || seed.trim().length < 3}>
          <span>{t(creating ? "Researching in the foreground…" : "Begin the wonder")}</span>
          <i aria-hidden="true">→</i>
        </button>
        <p className="honesty-note">
          <span aria-hidden="true">◉</span>
          {t(model.disclosure)} {t("Input/output prices shown per 1M tokens; search is metered separately.")}
        </p>
      </form>
    </section>
  );
}

function recommendationsForPerformer(
  performerId: PerformerId,
  personalized: PersonalizedStarter[],
) {
  const performerQuestions = STARTERS[performerId].map((question) => ({
    question,
    topic: `${PERFORMERS.find((item) => item.id === performerId)?.name ?? "Performer"} pick`,
  }));
  const combined = [...personalized, ...performerQuestions];
  return combined.filter(
    (item, index) => combined.findIndex((candidate) => candidate.question.toLowerCase() === item.question.toLowerCase()) === index,
  ).slice(0, 24);
}

function useQuestionPlaceholder(questions: string[], active: boolean) {
  const [placeholder, setPlaceholder] = useState("");

  useEffect(() => {
    if (!active || questions.length === 0) return;
    let cancelled = false;
    let questionIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timer = 0;

    function tick() {
      if (cancelled) return;
      const question = questions[questionIndex] ?? "";
      characterIndex += deleting ? -1 : 1;
      setPlaceholder(question.slice(0, Math.max(0, characterIndex)));

      let delay = deleting ? 24 : 48;
      if (!deleting && characterIndex >= question.length) {
        deleting = true;
        delay = 1_450;
      } else if (deleting && characterIndex <= 0) {
        deleting = false;
        questionIndex = (questionIndex + 1) % questions.length;
        delay = 320;
      }
      timer = window.setTimeout(tick, delay);
    }

    timer = window.setTimeout(tick, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, questions]);

  return placeholder;
}

function JourneyBufferingStage({
  state,
  errorCode,
  onComplete,
  onBack,
}: {
  state: LiveResearchState;
  errorCode: ApiFailure["error"]["code"] | null;
  onComplete: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (state.status !== "complete") return;
    const timer = window.setTimeout(onComplete, 650);
    return () => window.clearTimeout(timer);
  }, [onComplete, state.status]);

  const performer = PERFORMERS.find((item) => item.id === state.performerId) ?? PERFORMERS[0];
  const capacityError = errorCode === "JOURNEY_LIMIT";
  const usageError = errorCode === "LIVE_RESEARCH_LIMIT" || errorCode === "BUDGET_EXCEEDED";
  const stoppedLabel = capacityError ? t("Library full") : usageError ? t("Usage limit reached") : t("Research stopped");

  return (
    <section className="performance-stage buffering-stage" aria-labelledby="buffering-title" aria-busy={state.status === "running"}>
      <header className="performance-header buffering-header">
        <div>
          <p className="eyebrow"><span /> {t("Next turn")} · {performer.name}</p>
          <h1 id="buffering-title">{state.question}</h1>
        </div>
        <div className={`buffering-status ${state.status}`} role="status" aria-live="polite">
          <span className="buffering-dot" aria-hidden="true" />
          <strong>{state.status === "complete" ? t("Answer ready") : state.status === "error" ? stoppedLabel : state.retryAttempt > 0 ? t("Retrying {attempt} of {max}", { attempt: state.retryAttempt, max: state.maxRetries }) : t("Buffering answer")}</strong>
          <small>{state.status === "running" ? state.message : state.status === "complete" ? t("Placing the answer into this card") : capacityError || usageError ? t("No research was started") : t("Nothing incomplete was saved")}</small>
        </div>
      </header>

      <article className="buffering-answer-card">
        <div className="buffering-byline">
          <span className={`performer-mark ${performer.accent}`}>{performer.mark}</span>
          <div><strong>{performer.name}</strong><small>{t("researching in this foreground turn")}</small></div>
          <span className="buffering-ellipsis" aria-hidden="true"><i /><i /><i /></span>
        </div>

        {state.status === "error" ? (
          <div className="buffering-error" role="alert">
            <span aria-hidden="true">!</span>
            <div>
              <strong>{capacityError ? t("Your saved-journey library is full") : usageError ? t("Your rolling usage limit is reached") : t("This turn was not committed")}</strong>
              <p>{state.error}</p>
              {state.diagnosticId && <code>Diagnostic {formatDiagnosticId(state.diagnosticId)}</code>}
            </div>
            <button type="button" onClick={onBack}>{capacityError ? t("Manage saved journeys") : usageError ? t("View usage") : t("Return safely")} →</button>
          </div>
        ) : (
          <>
            <div className="buffering-content-grid" aria-hidden="true">
              <div className="buffering-copy">
                <span className="skeleton-line title" />
                <span className="skeleton-line long" />
                <span className="skeleton-line medium" />
                <span className="skeleton-line short" />
                <div className="skeleton-tags"><i /><i /><i /></div>
              </div>
              <div className="skeleton-media"><i /><span /><span /></div>
            </div>
            <div className="buffering-evidence" aria-hidden="true"><span /><i /></div>
          </>
        )}
      </article>

      <section className="buffering-directions" aria-hidden="true">
        <p>{t("Choose the next direction")}</p>
        <h2>{t("Where should curiosity go next?")}</h2>
        <div><span /><span /></div>
        <small>{t("Two paths will appear here when the answer is ready.")}</small>
      </section>
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
  speechRate,
  onSnapshot,
}: {
  journey: JourneyDetail;
  turn: JourneyTurn;
  busy: string | null;
  onChoose: (optionId: string) => void;
  onReject: (adventure: number, reason?: string) => void;
  onDelegate: () => void;
  speechRate: number;
  onSnapshot: () => void;
}) {
  const { t, locale } = useI18n();
  const [adventure, setAdventure] = useState(50);
  const [reason, setReason] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [redrawOpen, setRedrawOpen] = useState(false);
  const deepDiveTriggerRef = useRef<HTMLButtonElement>(null);
  const deepDiveCloseRef = useRef<HTMLButtonElement>(null);
  const performer = PERFORMERS.find((item) => item.id === journey.performerId)!;
  const historical = turn.id !== journey.currentTurnId;
  const actionable = turn.options.filter((option) => option.state === "proposed").length > 0;

  useEffect(() => {
    if (!deepDiveOpen) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = deepDiveTriggerRef.current;
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setDeepDiveOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    window.requestAnimationFrame(() => deepDiveCloseRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [deepDiveOpen]);

  function citations(sourceIds: string[]) {
    return sourceIds.map((sourceId) => {
      const sourceIndex = turn.sources.findIndex((source) => source.id === sourceId);
      return sourceIndex >= 0 ? (
        <a
          className="citation"
          key={sourceId}
          href={turn.sources[sourceIndex].url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${t("Source")} ${sourceIndex + 1}: ${turn.sources[sourceIndex].title}`}
        >
          {sourceIndex + 1}
        </a>
      ) : null;
    });
  }

  function toggleSpeech() {
    if (!("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(`${turn.question}. ${turn.answer}. ${turn.transition}`);
    utterance.rate = speechRate;
    utterance.lang = turn.metadata.outputLocale;
    const voices = window.speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === turn.metadata.outputLocale.toLowerCase())
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(turn.metadata.outputLocale.split("-")[0].toLowerCase()))
      ?? null;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <section className="performance-stage article-journey-stage" aria-labelledby="performance-title" lang={turn.metadata.outputLocale} dir={localeDirection(turn.metadata.outputLocale)}>
      <header className="performance-header article-journey-header">
        <div>
          <p className="eyebrow"><span /> {t("Turn {number}", { number: turn.depth + 1 })} · {performer.name}</p>
          <h1 id="performance-title">{turn.question}</h1>
        </div>
        <div className="stage-metrics">
          <span>{t("{count} turns", { count: journey.turnCount })}</span>
          <span>{t("{count} sources", { count: journey.sourceCount })}</span>
        </div>
      </header>

      {historical && (
        <div className="branch-notice" role="note">
          <span aria-hidden="true">⑂</span>
          <p><strong>{t("You are revisiting an earlier turn.")}</strong> {t("Choosing a path here creates a visible branch; your existing turns stay in the map.")}</p>
        </div>
      )}

      <article className={`contained-answer-card ${turn.media.length ? "has-media" : "without-media"}`}>
        <div className="contained-answer-topline">
          <div className="answer-byline compact-byline">
            <span className={`performer-mark ${performer.accent}`}>{performer.mark}</span>
            <div><strong>{performer.name}</strong><small>{t("performed from live web research")}</small></div>
            <span className="ready-stamp">{t("COMPOSED")}</span>
          </div>
          <div className="contained-answer-tools">
            <button type="button" onClick={toggleSpeech}>{t(speaking ? "Stop reading" : "Read aloud")}</button>
            <details className="answer-overflow">
              <summary aria-label={t("Save and export options")}>•••</summary>
              <div>
                <button type="button" disabled={busy !== null} onClick={onSnapshot}>{t("Save snapshot")}</button>
                <a href={`/api/journeys/${journey.id}/export`}>{t("Export JSON")}</a>
              </div>
            </details>
          </div>
        </div>

        <div className="contained-answer-content">
          <div className="contained-answer-summary">
            <p className="card-kicker">{t("The answer")}</p>
            <h2>{turn.topicLabel}</h2>
            <div className="contained-answer-prose">
              {turn.answerBlocks.slice(0, 1).map((block, blockIndex) => (
                <p key={`${turn.id}-answer-${blockIndex}`}>{block.text} {citations(block.sourceIds)}</p>
              ))}
            </div>
            <div className="answer-tags" aria-label={t("Answer characteristics")}>
              <span>{turn.topicLabel}</span>
              <span>{t("{count} checked sources", { count: turn.sources.length })}</span>
              <span>{t("live research")}</span>
            </div>
            <button ref={deepDiveTriggerRef} className="evidence-research-row" type="button" onClick={() => setDeepDiveOpen(true)}>
              <span><strong>{t("Evidence & research details")}</strong></span>
              <span className="deep-dive-cta">{t("Deeper dive")} ↗</span>
            </button>
          </div>

          <AnswerVisual media={turn.media} />
        </div>
      </article>

      <section className="journey-directions" aria-labelledby="direction-title">
        <p className="panel-index">{t("Choose the next direction")}</p>
        <h2 id="direction-title">{t("Where should curiosity go next?")}</h2>
        <div className="journey-path-grid">
          {turn.options.map((option, index) => (
            <button
              type="button"
              className={`journey-path-card journey-path-${index + 1}`}
              key={option.id}
              disabled={!actionable || option.state !== "proposed" || busy !== null}
              onClick={() => onChoose(option.id)}
            >
              <span>{index === 0 ? "←" : "→"} {option.angle}</span>
              <strong>{option.question}</strong>
              <i aria-hidden="true">{index === 0 ? "←" : "→"}</i>
            </button>
          ))}
        </div>
        <div className="journey-secondary-actions">
          <button type="button" disabled={!actionable || busy !== null} onClick={onDelegate}>✦ {t("Let {performer} choose", { performer: performer.name.replace("The ", "") })}</button>
          <button type="button" aria-expanded={redrawOpen} onClick={() => setRedrawOpen((open) => !open)}>{t("Neither question works")} {redrawOpen ? "⌃" : "⌄"}</button>
        </div>
        {redrawOpen && (
          <div className="redraw-panel">
            <div className="redraw-modes" aria-label={t("Replacement question direction")}>
              <button type="button" className={adventure === 20 ? "active" : ""} onClick={() => setAdventure(20)}>{t("Practical")}</button>
              <button type="button" className={adventure === 78 ? "active" : ""} onClick={() => setAdventure(78)}>{t("Surprising")}</button>
              <button type="button" className={adventure === 50 ? "active" : ""} onClick={() => setAdventure(50)}>{t("Different direction")}</button>
            </div>
            <label className="redraw-note"><span>{t("Optional note")}</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={280} placeholder={t("What should change about the next two questions?")} /></label>
            <button className="redraw-submit" type="button" disabled={!actionable || busy !== null} onClick={() => onReject(adventure, reason.trim() || undefined)}>{t(busy === "reject" ? "Replacing…" : "Generate two new questions")}</button>
          </div>
        )}
      </section>

      {deepDiveOpen && (
        <div className="deep-dive-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeepDiveOpen(false); }}>
          <section className="deep-dive-dialog" role="dialog" aria-modal="true" aria-labelledby="deep-dive-title">
            <header>
              <div><p>{t("Deeper dive")} · {t("Turn {number}", { number: turn.depth + 1 })}</p><h2 id="deep-dive-title">{turn.question}</h2></div>
              <button ref={deepDiveCloseRef} type="button" onClick={() => setDeepDiveOpen(false)} aria-label={t("Close deeper dive")}>×</button>
            </header>
            <div className="deep-dive-layout has-media">
              <div className="deep-dive-answer">
                {turn.answerBlocks.map((block, blockIndex) => <p key={`${turn.id}-deep-${blockIndex}`}>{block.text} {citations(block.sourceIds)}</p>)}
              </div>
              <aside className="deep-dive-evidence">
                <AnswerVisual media={turn.media} compact />
                <h3>{t("Sources")}</h3>
                <ol>{turn.sources.map((source, index) => <li key={source.id}><span>{index + 1}</span><div dir="auto"><strong>{source.title}</strong><small>{source.publisher} · {source.relation}</small></div><a href={source.url} target="_blank" rel="noreferrer">{t("Open")} ↗</a></li>)}</ol>
              </aside>
            </div>
            <div className="deep-dive-research">
              <div><span>{t("Research summary")}</span><p>{turn.researchSummary}</p></div>
              <dl>
                <div><dt>{t("Model")}</dt><dd>{turn.metadata.provider} · {turn.metadata.modelId}</dd></div>
                <div><dt>{t("Research")}</dt><dd>{turn.metadata.researchPreset} · {turn.metadata.answerDensity}</dd></div>
                <div><dt>{t("Prompt")}</dt><dd>{turn.metadata.promptVersion}</dd></div>
                <div><dt>{t("Researched")}</dt><dd>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(turn.metadata.researchedAt)}</dd></div>
              </dl>
            </div>
            <footer><button type="button" onClick={() => setDeepDiveOpen(false)}>{t("Close and continue")}</button></footer>
          </section>
        </div>
      )}
    </section>
  );
}

function AnswerVisual({
  media,
  compact = false,
}: {
  media: JourneyTurn["media"];
  compact?: boolean;
}) {
  const { t } = useI18n();
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const visible = media
    .filter((item) => !failedUrls.includes(item.imageUrl))
    .slice(0, compact ? 4 : 8);
  if (!visible.length) return null;
  const activeIndex = Math.min(selectedIndex, visible.length - 1);
  const selected = visible[activeIndex];
  const noticeItems = selected.whatToNotice?.length ? selected.whatToNotice : [selected.caption];
  const roleLabel = (selected.role ?? "context").replace("-", " ");

  function selectImage(nextIndex: number) {
    setSelectedIndex((nextIndex + visible.length) % visible.length);
  }

  function selectFromKeyboard(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? visible.length - 1
        : event.key === "ArrowLeft"
          ? (index - 1 + visible.length) % visible.length
          : (index + 1) % visible.length;
    setSelectedIndex(nextIndex);
    window.requestAnimationFrame(() => thumbnailRefs.current[nextIndex]?.focus());
  }

  return (
    <section className={`answer-gallery ${compact ? "compact-visual" : ""}`} aria-label={t("Visual evidence")}>
      <figure className="answer-gallery-selected">
        <div className="answer-gallery-image-stage">
          <a href={selected.sourcePageUrl} target="_blank" rel="noreferrer" aria-label={`${selected.title ?? selected.caption}. ${t("Open")} ${t("Source")}.`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={selected.imageUrl}
              src={selected.imageUrl}
              alt={selected.alt}
              loading="eager"
              referrerPolicy="no-referrer"
              onError={(event) => {
                if (selected.thumbnailUrl && selected.thumbnailUrl !== selected.imageUrl && event.currentTarget.dataset.fallbackAttempted !== "true") {
                  event.currentTarget.dataset.fallbackAttempted = "true";
                  event.currentTarget.src = selected.thumbnailUrl;
                  return;
                }
                setFailedUrls((current) => current.includes(selected.imageUrl) ? current : [...current, selected.imageUrl]);
              }}
            />
          </a>
          {visible.length > 1 && (
            <div className="answer-gallery-arrows" aria-label={t("Browse visual evidence")}>
              <button type="button" onClick={() => selectImage(activeIndex - 1)} aria-label={t("Previous image")}>
                <ArrowLeft aria-hidden="true" weight="bold" />
              </button>
              <span aria-live="polite">{activeIndex + 1} / {visible.length}</span>
              <button type="button" onClick={() => selectImage(activeIndex + 1)} aria-label={t("Next image")}>
                <ArrowRight aria-hidden="true" weight="bold" />
              </button>
            </div>
          )}
        </div>
        <figcaption><span>{selected.title ?? selected.caption}</span><a href={selected.sourcePageUrl} target="_blank" rel="noreferrer">{t("Source")} ↗</a></figcaption>
      </figure>

      <aside className="answer-gallery-notes" aria-live="polite">
        <span className="answer-gallery-role">{roleLabel}</span>
        <h3>{selected.title ?? selected.caption}</h3>
        <div><strong>{t("Why it is here")}</strong><p>{selected.whyIncluded ?? selected.caption}</p></div>
        <div><strong>{t("What to notice")}</strong><ul>{noticeItems.map((item, index) => <li key={`${selected.imageUrl}-notice-${index}`}>{item}</li>)}</ul></div>
        <div><strong>{t("What it helps explain")}</strong><p>{selected.learning ?? selected.caption}</p></div>
      </aside>

      <div className="answer-gallery-strip" aria-label={t("Select an image")}>
        {visible.map((item, index) => (
          <button
            ref={(node) => { thumbnailRefs.current[index] = node; }}
            type="button"
            className={index === activeIndex ? "selected" : ""}
            key={`${item.imageUrl}-${index}`}
            aria-label={t("Show {title}", { title: item.title ?? item.caption })}
            aria-pressed={index === activeIndex}
            onClick={() => setSelectedIndex(index)}
            onKeyDown={(event) => selectFromKeyboard(index, event)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnailUrl || item.imageUrl}
              alt=""
              loading={index === 0 ? "eager" : "lazy"}
              referrerPolicy="no-referrer"
              onError={(event) => {
                if (item.thumbnailUrl && item.thumbnailUrl !== item.imageUrl && event.currentTarget.dataset.fallbackAttempted !== "true") {
                  event.currentTarget.dataset.fallbackAttempted = "true";
                  event.currentTarget.src = item.imageUrl;
                  return;
                }
                setFailedUrls((current) => current.includes(item.imageUrl) ? current : [...current, item.imageUrl]);
              }}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

type GraphDensity = "overview" | "topics" | "detail";
type GraphViewMode = "graph" | "outline";

type JourneyGraphNode = {
  id: string;
  parentId: string | null;
  kind: "turn" | "open" | "cluster";
  turn: JourneyTurn;
  option: JourneyTurn["options"][number] | null;
  branchPosition: 0 | 1;
  children: JourneyGraphNode[];
  turnCount: number;
  openCount: number;
};

type PositionedGraphNode = {
  node: JourneyGraphNode;
  x: number;
  y: number;
  width: number;
  height: number;
};

type GraphLayout = {
  nodes: PositionedGraphNode[];
  width: number;
  height: number;
  mobile: boolean;
};

function buildJourneyGraph(journey: JourneyDetail): JourneyGraphNode {
  const turnById = new Map(journey.turns.map((turn) => [turn.id, turn]));
  const childTurns = new Map<string, JourneyTurn[]>();
  for (const turn of journey.turns) {
    if (!turn.parentTurnId) continue;
    childTurns.set(turn.parentTurnId, [...(childTurns.get(turn.parentTurnId) ?? []), turn]);
  }
  const resultByOption = new Map(
    journey.actions
      .filter((action) => action.optionId && action.resultTurnId)
      .map((action) => [`${action.turnId}:${action.optionId}`, action.resultTurnId as string]),
  );
  const rootTurn = journey.turns.find((turn) => !turn.parentTurnId) ?? journey.turns[0];

  const buildTurn = (turn: JourneyTurn, parentId: string | null, branchPosition: 0 | 1): JourneyGraphNode => {
    const directChildren = childTurns.get(turn.id) ?? [];
    const usedChildren = new Set<string>();
    const children: JourneyGraphNode[] = [];

    for (const option of [...turn.options].sort((left, right) => left.position - right.position)) {
      const resultId = resultByOption.get(`${turn.id}:${option.id}`);
      const resultTurn = resultId ? turnById.get(resultId) : undefined;
      if (resultTurn && resultTurn.parentTurnId === turn.id) {
        usedChildren.add(resultTurn.id);
        children.push(buildTurn(resultTurn, turn.id, option.position));
      } else if (option.state === "proposed") {
        children.push({
          id: `open:${turn.id}:${option.id}`,
          parentId: turn.id,
          kind: "open",
          turn,
          option,
          branchPosition: option.position,
          children: [],
          turnCount: 0,
          openCount: 1,
        });
      }
    }

    for (const child of directChildren.filter((candidate) => !usedChildren.has(candidate.id))) {
      children.push(buildTurn(child, turn.id, children.length ? 1 : 0));
    }

    return {
      id: turn.id,
      parentId,
      kind: "turn",
      turn,
      option: null,
      branchPosition,
      children,
      turnCount: 1 + children.reduce((total, child) => total + child.turnCount, 0),
      openCount: children.reduce((total, child) => total + child.openCount, 0),
    };
  };

  return buildTurn(rootTurn, null, 0);
}

function findGraphNode(root: JourneyGraphNode, id: string): JourneyGraphNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const match = findGraphNode(child, id);
    if (match) return match;
  }
  return null;
}

function findGraphPath(root: JourneyGraphNode, id: string): JourneyGraphNode[] | null {
  if (root.id === id) return [root];
  for (const child of root.children) {
    const path = findGraphPath(child, id);
    if (path) return [root, ...path];
  }
  return null;
}

function visibleJourneyGraph(
  root: JourneyGraphNode,
  routeIds: Set<string>,
  density: GraphDensity,
  mobile: boolean,
  expanded: Set<string>,
): JourneyGraphNode {
  const children = root.children.map((child) => {
    const foldThreshold = mobile ? 1 : density === "overview" ? 2 : density === "topics" ? 5 : Number.POSITIVE_INFINITY;
    const shouldFold = child.kind === "turn"
      && !routeIds.has(child.id)
      && child.children.length > 0
      && child.turnCount > foldThreshold
      && !expanded.has(child.id);
    if (shouldFold) {
      return {
        ...child,
        id: `cluster:${child.id}`,
        kind: "cluster" as const,
        children: [],
      };
    }
    return visibleJourneyGraph(child, routeIds, density, mobile, expanded);
  });
  return { ...root, children };
}

function desktopGraphLayout(root: JourneyGraphNode, density: GraphDensity): GraphLayout {
  const dimensions = density === "overview"
    ? { width: 132, height: 58, column: 182, row: 82 }
    : density === "topics"
      ? { width: 190, height: 88, column: 244, row: 112 }
      : { width: 230, height: 124, column: 294, row: 150 };
  const nodes: PositionedGraphNode[] = [];
  let nextLeaf = 0;

  const place = (node: JourneyGraphNode, depth: number): number => {
    const childYs = node.children.map((child) => place(child, depth + 1));
    const y = childYs.length
      ? childYs.reduce((sum, value) => sum + value, 0) / childYs.length
      : 42 + nextLeaf++ * dimensions.row;
    const height = node.kind === "open" ? Math.max(54, dimensions.height - 10) : dimensions.height;
    nodes.push({ node, x: 44 + depth * dimensions.column, y, width: dimensions.width, height });
    return y;
  };

  place(root, 0);
  const maxRight = Math.max(...nodes.map((item) => item.x + item.width));
  const maxBottom = Math.max(...nodes.map((item) => item.y + item.height));
  return { nodes, width: Math.max(860, maxRight + 90), height: Math.max(560, maxBottom + 80), mobile: false };
}

function mobileGraphLayout(root: JourneyGraphNode, routeIds: Set<string>, density: GraphDensity): GraphLayout {
  const canvasWidth = 356;
  const nodeWidth = density === "overview" ? 132 : 154;
  const nodeHeight = density === "detail" ? 112 : density === "topics" ? 82 : 58;
  const rowGap = density === "detail" ? 154 : density === "topics" ? 126 : 100;
  const nodes: PositionedGraphNode[] = [];
  const positioned = new Set<string>();
  let routeNode: JourneyGraphNode | undefined = root;
  let row = 0;

  nodes.push({ node: root, x: (canvasWidth - nodeWidth) / 2, y: 28, width: nodeWidth, height: nodeHeight });
  positioned.add(root.id);

  while (routeNode) {
    const children = routeNode.children.slice(0, 2);
    if (!children.length) break;
    row += 1;
    const childY = 28 + row * rowGap;
    children.forEach((child, index) => {
      const childWidth = nodeWidth;
      const x = children.length === 1
        ? (canvasWidth - childWidth) / 2
        : index === 0 ? 10 : canvasWidth - childWidth - 10;
      nodes.push({ node: child, x, y: childY, width: childWidth, height: child.kind === "open" ? Math.max(54, nodeHeight - 8) : nodeHeight });
      positioned.add(child.id);
    });
    routeNode = children.find((child) => routeIds.has(child.id) && child.kind === "turn");
  }

  const maxBottom = Math.max(...nodes.map((item) => item.y + item.height));
  return { nodes: nodes.filter((item) => positioned.has(item.node.id)), width: canvasWidth, height: maxBottom + 88, mobile: true };
}

function JourneyMap({
  journey,
  activeTurnId,
  onSelect,
  onContinue,
  onChoose,
}: {
  journey: JourneyDetail;
  activeTurnId: string;
  onSelect: (id: string) => void;
  onContinue: (id: string) => void;
  onChoose: (turnId: string, optionId: string) => void;
}) {
  const { t } = useI18n();
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const responsiveInitializedRef = useRef(false);
  const [density, setDensity] = useState<GraphDensity>("topics");
  const [viewMode, setViewMode] = useState<GraphViewMode>("graph");
  const [focusRootId, setFocusRootId] = useState<string | null>(null);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(() => new Set());
  const [outlineExpanded, setOutlineExpanded] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [scale, setScale] = useState(.86);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [pendingBranch, setPendingBranch] = useState<{ turnId: string; optionId: string } | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const update = () => {
      setIsMobile(media.matches);
      if (!responsiveInitializedRef.current) {
        responsiveInitializedRef.current = true;
        if (media.matches) setInspectorOpen(false);
      }
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const fullGraph = useMemo(() => buildJourneyGraph(journey), [journey]);
  const turnIndex = useMemo(() => new Map(journey.turns.map((turn, index) => [turn.id, index + 1])), [journey.turns]);
  const activeTurn = journey.turns.find((turn) => turn.id === activeTurnId) ?? journey.turns[0];
  const focusRoot = focusRootId ? findGraphNode(fullGraph, focusRootId) ?? fullGraph : fullGraph;
  const currentPath = useMemo(() => findGraphPath(fullGraph, journey.currentTurnId) ?? [fullGraph], [fullGraph, journey.currentTurnId]);
  const currentPathIds = new Set(currentPath.map((node) => node.id));
  const focusedCurrentPath = useMemo(() => findGraphPath(focusRoot, journey.currentTurnId) ?? [focusRoot], [focusRoot, journey.currentTurnId]);
  const routeIds = useMemo(() => new Set(focusedCurrentPath.map((node) => node.id)), [focusedCurrentPath]);
  const visibleGraph = useMemo(
    () => visibleJourneyGraph(focusRoot, routeIds, density, isMobile, expandedBranches),
    [density, expandedBranches, focusRoot, isMobile, routeIds],
  );
  const layout = useMemo(
    () => isMobile ? mobileGraphLayout(visibleGraph, routeIds, density) : desktopGraphLayout(visibleGraph, density),
    [density, isMobile, routeIds, visibleGraph],
  );
  const positionById = new Map(layout.nodes.map((item) => [item.node.id, item]));
  const scaledWidth = isMobile ? layout.width : layout.width * scale;
  const scaledHeight = isMobile ? layout.height : layout.height * scale;
  const focusBreadcrumb = focusRootId ? findGraphPath(fullGraph, focusRootId) ?? [] : [];

  const openRouteIds = useMemo(() => {
    const ids = new Set<string>();
    const collect = (node: JourneyGraphNode): boolean => {
      const hasOpen = node.kind === "open" || node.children.some(collect);
      if (hasOpen) ids.add(node.kind === "cluster" ? node.turn.id : node.id);
      return hasOpen;
    };
    collect(fullGraph);
    return ids;
  }, [fullGraph]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return journey.turns.flatMap((turn) => {
      const turnMatch = `${turn.question} ${turn.topicLabel} ${turn.answer}`.toLocaleLowerCase().includes(normalizedQuery)
        ? [{ kind: "turn" as const, turn, option: null }]
        : [];
      const options = turn.options
        .filter((option) => option.question.toLocaleLowerCase().includes(normalizedQuery))
        .map((option) => ({ kind: "open" as const, turn, option }));
      return [...turnMatch, ...options];
    }).slice(0, 8);
  }, [journey.turns, normalizedQuery]);
  const matchingIds = new Set(searchResults.flatMap((result) => result.kind === "turn"
    ? [result.turn.id]
    : [`open:${result.turn.id}:${result.option?.id}`]));

  const fitGraph = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || isMobile) return;
    const nextScale = Math.max(.48, Math.min(1, (viewport.clientWidth - 28) / layout.width));
    setScale(nextScale);
    requestAnimationFrame(() => {
      viewport.scrollTo({ left: 0, top: Math.max(0, (layout.height * nextScale - viewport.clientHeight) / 2), behavior: "smooth" });
    });
  }, [isMobile, layout.height, layout.width]);

  const selectAndReveal = useCallback((turnId: string) => {
    const path = findGraphPath(fullGraph, turnId) ?? [];
    setExpandedBranches((current) => new Set([...current, ...path.map((node) => node.id)]));
    onSelect(turnId);
    setInspectorOpen(true);
    requestAnimationFrame(() => {
      const target = viewportRef.current?.querySelector<HTMLElement>(`[data-turn-id="${turnId}"]`);
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
  }, [fullGraph, onSelect]);

  function previewBranch(turnId: string, optionId: string) {
    onSelect(turnId);
    setPendingBranch({ turnId, optionId });
    setInspectorOpen(true);
  }

  function graphConnector(parent: PositionedGraphNode, child: PositionedGraphNode) {
    if (layout.mobile) {
      const startX = parent.x + parent.width / 2;
      const startY = parent.y + parent.height;
      const endX = child.x + child.width / 2;
      const endY = child.y;
      const middle = startY + (endY - startY) / 2;
      return `M ${startX} ${startY} V ${middle} H ${endX} V ${endY}`;
    }
    const startX = parent.x + parent.width;
    const startY = parent.y + parent.height / 2;
    const endX = child.x;
    const endY = child.y + child.height / 2;
    const middle = startX + (endX - startX) / 2;
    return `M ${startX} ${startY} H ${middle} V ${endY} H ${endX}`;
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (isMobile || event.button !== 0 || (event.target as HTMLElement).closest("button, input, a")) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    panRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add("panning");
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const pan = panRef.current;
    const viewport = viewportRef.current;
    if (!pan || !viewport || pan.pointerId !== event.pointerId) return;
    viewport.scrollLeft = pan.left - (event.clientX - pan.x);
    viewport.scrollTop = pan.top - (event.clientY - pan.y);
  }

  function endCanvasPan(event: React.PointerEvent<HTMLDivElement>) {
    if (panRef.current?.pointerId !== event.pointerId) return;
    viewportRef.current?.classList.remove("panning");
    panRef.current = null;
  }

  function handleOutlineKeys(event: KeyboardEvent<HTMLDivElement>) {
    const targets = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-outline-target]")].filter((item) => item.offsetParent !== null);
    const index = targets.indexOf(document.activeElement as HTMLElement);
    if (index < 0) return;
    if (["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) event.preventDefault();
    if (event.key === "ArrowDown") targets[Math.min(index + 1, targets.length - 1)]?.focus();
    if (event.key === "ArrowUp") targets[Math.max(index - 1, 0)]?.focus();
    if (event.key === "Home") targets[0]?.focus();
    if (event.key === "End") targets.at(-1)?.focus();
    const item = targets[index]?.closest<HTMLElement>("li[role='treeitem']");
    const nodeId = targets[index]?.dataset.outlineNodeId;
    if (event.key === "ArrowRight" && item?.getAttribute("aria-expanded") === "false" && nodeId) {
      setOutlineExpanded((current) => new Set([...current, nodeId]));
    } else if (event.key === "ArrowRight" && item?.getAttribute("aria-expanded") === "true") {
      item.querySelector<HTMLElement>("ul [data-outline-target]")?.focus();
    }
    if (event.key === "ArrowLeft" && item?.getAttribute("aria-expanded") === "true" && nodeId && !routeIds.has(nodeId)) {
      setOutlineExpanded((current) => { const next = new Set(current); next.delete(nodeId); return next; });
    } else if (event.key === "ArrowLeft") {
      item?.parentElement?.closest<HTMLElement>("li[role='treeitem']")?.querySelector<HTMLElement>("[data-outline-target]")?.focus();
    }
  }

  const renderOutlineNode = (node: JourneyGraphNode, level = 1): React.ReactNode => {
    const expanded = outlineExpanded.has(node.id) || routeIds.has(node.id);
    if (node.kind === "open") {
      return (
        <li role="treeitem" aria-level={level} aria-selected={false} key={node.id} className="journey-outline-open">
          <button type="button" data-outline-target onClick={() => previewBranch(node.turn.id, node.option?.id ?? "")}>
            <span>{t("Open path")}</span><strong>{node.option?.question}</strong>
          </button>
        </li>
      );
    }
    return (
      <li role="treeitem" aria-level={level} aria-selected={activeTurnId === node.turn.id} aria-expanded={node.children.length ? expanded : undefined} key={node.id}>
        <div className="journey-outline-row">
          {node.children.length ? (
            <button
              type="button"
              className="outline-expand"
              aria-label={t(expanded ? "Collapse branch" : "Expand branch")}
              onClick={() => setOutlineExpanded((current) => {
                const next = new Set(current);
                if (expanded) next.delete(node.id); else next.add(node.id);
                return next;
              })}
            >{expanded ? <CaretDown aria-hidden="true" /> : <CaretRight aria-hidden="true" />}</button>
          ) : <span className="outline-spacer" />}
          <button
            type="button"
            data-outline-target
            data-outline-node-id={node.id}
            className={activeTurnId === node.turn.id ? "selected" : ""}
            aria-current={journey.currentTurnId === node.turn.id ? "step" : undefined}
            onClick={() => selectAndReveal(node.turn.id)}
          >
            <span>{t("Turn {number}", { number: turnIndex.get(node.turn.id) ?? 1 })} · {node.turn.topicLabel}</span>
            <strong>{node.turn.question}</strong>
            <small>{node.openCount ? t("{count} open questions", { count: node.openCount }) : t("Explored")}</small>
          </button>
        </div>
        {expanded && node.children.length > 0 && <ul role="group">{node.children.map((child) => renderOutlineNode(child, level + 1))}</ul>}
      </li>
    );
  };

  const selectedParent = activeTurn.parentTurnId ? journey.turns.find((turn) => turn.id === activeTurn.parentTurnId) : null;
  const selectedNode = findGraphNode(fullGraph, activeTurn.id);
  const pendingOption = pendingBranch && pendingBranch.turnId === activeTurn.id
    ? activeTurn.options.find((option) => option.id === pendingBranch.optionId)
    : null;

  return (
    <section className="map-view journey-tree-view" aria-labelledby="map-title">
      <header className="map-header journey-tree-header">
        <div>
          <p className="eyebrow"><span /> {t("Journey tree")}</p>
          <h1 id="map-title">{journey.title}</h1>
          <p>{t("See the whole exploration, follow your current route, or grow a new branch from any open question.")}</p>
        </div>
        <dl aria-label={t("Journey overview")}>
          <div><dt>{t("Turns")}</dt><dd>{journey.turnCount}</dd></div>
          <div><dt>{t("Open paths")}</dt><dd>{journey.openBranchCount}</dd></div>
          <div><dt>{t("Sources")}</dt><dd>{journey.sourceCount}</dd></div>
        </dl>
      </header>

      <div className="journey-tree-controls" aria-label={t("Journey tree controls")}>
        <div className="journey-tree-search">
          <MagnifyingGlass aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder={t("Find a turn or open question")}
            aria-label={t("Find a turn or open question")}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && <button type="button" aria-label={t("Clear search")} onClick={() => setQuery("")}><X aria-hidden="true" /></button>}
          {normalizedQuery && (
            <div className="journey-tree-search-results">
              <span>{t("{count} matches", { count: searchResults.length })}</span>
              {searchResults.length ? searchResults.map((result) => (
                <button
                  type="button"
                  key={`${result.kind}-${result.turn.id}-${result.option?.id ?? "turn"}`}
                  onClick={() => {
                    setQuery("");
                    if (result.option) previewBranch(result.turn.id, result.option.id);
                    else selectAndReveal(result.turn.id);
                  }}
                >
                  <small>{result.option ? t("Open path") : `${t("Turn")} ${turnIndex.get(result.turn.id)}`}</small>
                  <strong>{result.option?.question ?? result.turn.question}</strong>
                </button>
              )) : <p>{t("No matching turns yet.")}</p>}
            </div>
          )}
        </div>
        <div className="journey-tree-control-group density-control" aria-label={t("Detail level")}>
          {(["overview", "topics", "detail"] as GraphDensity[]).map((level) => (
            <button type="button" key={level} className={density === level ? "active" : ""} aria-pressed={density === level} onClick={() => setDensity(level)}>
              {t(level === "overview" ? "Overview" : level === "topics" ? "Topics" : "Full cards")}
            </button>
          ))}
        </div>
        <div className="journey-tree-control-group">
          <button type="button" className={openOnly ? "active" : ""} aria-pressed={openOnly} onClick={() => setOpenOnly((current) => !current)}><Path aria-hidden="true" /> {t("Open paths")}</button>
          <button type="button" className={viewMode === "outline" ? "active" : ""} aria-pressed={viewMode === "outline"} onClick={() => setViewMode((current) => current === "graph" ? "outline" : "graph")}>
            {viewMode === "graph" ? <ListBullets aria-hidden="true" /> : <TreeStructure aria-hidden="true" />} {t(viewMode === "graph" ? "Outline" : "Graph")}
          </button>
        </div>
      </div>

      {focusRootId && (
        <nav className="journey-focus-bar" aria-label={t("Focused branch path")}>
          <button type="button" onClick={() => { setFocusRootId(null); setPendingBranch(null); }}><ArrowLeft aria-hidden="true" /> {t("Full tree")}</button>
          <ol>
            {focusBreadcrumb.map((node, index) => (
              <li key={node.id}>
                <button type="button" onClick={() => index === 0 ? setFocusRootId(null) : setFocusRootId(node.id)}>{node.turn.topicLabel}</button>
              </li>
            ))}
          </ol>
          <span>{t("Focused branch")}</span>
        </nav>
      )}

      <div className={`journey-tree-workspace ${viewMode}`}>
        {viewMode === "graph" ? (
          <div className="journey-graph-shell">
            <div className="journey-graph-statusbar">
              <span><Crosshair aria-hidden="true" /> {t("Turn {number}", { number: turnIndex.get(journey.currentTurnId) ?? journey.turnCount })} · {t("You are here")}</span>
              <span>{focusRootId ? t("Focused branch") : t("Whole tree")} · {t("{count} open questions", { count: journey.openBranchCount })}</span>
            </div>
            <div
              className="journey-graph-viewport"
              ref={viewportRef}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={endCanvasPan}
              onPointerCancel={endCanvasPan}
            >
              <div className="journey-graph-scale-stage" style={{ width: scaledWidth, height: scaledHeight }}>
                <div className="journey-graph-canvas" style={{ width: layout.width, height: layout.height, transform: isMobile ? undefined : `scale(${scale})` }}>
                  <svg className="journey-graph-edges" width={layout.width} height={layout.height} aria-hidden="true">
                    {layout.nodes.flatMap((parent) => parent.node.children.map((child) => {
                      const childPosition = positionById.get(child.id);
                      if (!childPosition) return null;
                      const active = routeIds.has(parent.node.id) && routeIds.has(child.id);
                      return <path key={`${parent.node.id}-${child.id}`} d={graphConnector(parent, childPosition)} className={`${active ? "active" : ""} ${child.kind === "open" ? "open" : ""}`} />;
                    }))}
                  </svg>
                  {layout.nodes.map(({ node, x, y, width, height }) => {
                    const realId = node.kind === "cluster" ? node.turn.id : node.id;
                    const selected = node.turn.id === activeTurn.id && node.kind !== "open";
                    const current = node.turn.id === journey.currentTurnId && node.kind === "turn";
                    const active = routeIds.has(realId);
                    const matched = matchingIds.has(node.id) || matchingIds.has(realId);
                    const dimmed = (openOnly && !openRouteIds.has(realId) && node.kind !== "open") || (normalizedQuery.length > 0 && !matched);
                    const preview = pendingBranch && node.kind === "open" && node.turn.id === pendingBranch.turnId && node.option?.id === pendingBranch.optionId;
                    const className = ["journey-graph-node", node.kind, selected && "selected", current && "current", active && "active-route", matched && "match", dimmed && "dimmed", preview && "preview"].filter(Boolean).join(" ");
                    if (node.kind === "cluster") {
                      return (
                        <button
                          type="button"
                          className={className}
                          key={node.id}
                          style={{ left: x, top: y, width, height }}
                          aria-label={t("Expand {topic}: {turns} turns and {open} open questions", { topic: node.turn.topicLabel, turns: node.turnCount, open: node.openCount })}
                          onClick={() => setExpandedBranches((currentSet) => new Set([...currentSet, node.turn.id]))}
                        >
                          <span className="journey-cluster-stack" aria-hidden="true" />
                          <small>{node.turn.topicLabel}</small>
                          <strong>{node.turnCount} {t("turns")} · {node.openCount} {t("open")}</strong>
                          <Plus aria-hidden="true" />
                        </button>
                      );
                    }
                    if (node.kind === "open") {
                      return (
                        <button
                          type="button"
                          className={className}
                          key={node.id}
                          style={{ left: x, top: y, width, height }}
                          aria-label={`${t("Open path")}: ${node.option?.question}`}
                          onClick={() => previewBranch(node.turn.id, node.option?.id ?? "")}
                        >
                          <span className="journey-node-number">{preview ? <Plus aria-hidden="true" /> : (node.option?.position ?? 0) + 1}</span>
                          <small>{preview ? t("New turn preview") : t("Open path")}</small>
                          <strong>{node.option?.question}</strong>
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        className={className}
                        key={node.id}
                        data-turn-id={node.turn.id}
                        style={{ left: x, top: y, width, height }}
                        aria-pressed={selected}
                        aria-current={current ? "step" : undefined}
                        onClick={() => { onSelect(node.turn.id); setInspectorOpen(true); setPendingBranch(null); }}
                      >
                        <span className="journey-node-number">{turnIndex.get(node.turn.id)}</span>
                        <small>{node.turn.topicLabel}</small>
                        {density !== "overview" && <strong>{node.turn.question}</strong>}
                        {density === "detail" && <p>{node.turn.answerBlocks[0]?.text ?? node.turn.answer}</p>}
                        {current && <em>{t("You are here")}</em>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {!isMobile && (
                <div className="journey-minimap" aria-hidden="true">
                  {layout.nodes.map((item) => (
                    <i
                      key={item.node.id}
                      className={`${routeIds.has(item.node.kind === "cluster" ? item.node.turn.id : item.node.id) ? "active" : ""} ${item.node.kind}`}
                      style={{ left: `${item.x / layout.width * 100}%`, top: `${item.y / layout.height * 100}%` }}
                    />
                  ))}
                  <span />
                </div>
              )}
              {!isMobile && (
                <div className="journey-zoom-controls" aria-label={t("Graph zoom controls")}>
                  <button type="button" aria-label={t("Zoom out")} onClick={() => setScale((current) => Math.max(.48, current - .1))}><Minus aria-hidden="true" /></button>
                  <button type="button" onClick={fitGraph}><CornersOut aria-hidden="true" /> {t("Fit all")}</button>
                  <button type="button" aria-label={t("Zoom in")} onClick={() => setScale((current) => Math.min(1.35, current + .1))}><Plus aria-hidden="true" /></button>
                  <output aria-label={t("Current zoom")}>{Math.round(scale * 100)}%</output>
                </div>
              )}
              {isMobile && focusedCurrentPath.length > 3 && (
                <button type="button" className="journey-offscreen-cue top" onClick={() => viewportRef.current?.scrollTo({ top: 0, behavior: "smooth" })}>
                  {t("{count} ancestors above", { count: focusedCurrentPath.length - 2 })}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="journey-outline" onKeyDown={handleOutlineKeys}>
            <header><ListBullets aria-hidden="true" /><div><span>{t("Accessible outline")}</span><strong>{t("The same journey, in reading order")}</strong></div></header>
            <ul role="tree" aria-label={t("Journey outline")}>{renderOutlineNode(focusRoot)}</ul>
          </div>
        )}

        {inspectorOpen && (
          <aside className={`journey-node-inspector ${pendingOption ? "confirming" : ""}`} aria-label={pendingOption ? t("Confirm new branch") : t("Selected turn details")}>
            <div className="journey-inspector-handle" aria-hidden="true" />
            <header>
              <div>
                <span>{pendingOption ? t("New branch preview") : t("Turn {number}", { number: turnIndex.get(activeTurn.id) ?? 1 })}</span>
                <strong>{pendingOption?.question ?? activeTurn.topicLabel}</strong>
              </div>
              <button type="button" aria-label={t("Close details")} onClick={() => { setInspectorOpen(false); setPendingBranch(null); }}><X aria-hidden="true" /></button>
            </header>
            {pendingOption ? (
              <div className="journey-branch-confirmation" role="dialog" aria-modal="false" aria-labelledby="branch-confirmation-title">
                <p id="branch-confirmation-title">{t("This will grow a new child from Turn {number}.", { number: turnIndex.get(activeTurn.id) ?? 1 })}</p>
                <ul>
                  <li>{t("Your current route stays intact.")}</li>
                  <li>{t("One live research turn will begin.")}</li>
                  <li>{t("The result will appear at the previewed position in this tree.")}</li>
                </ul>
                <div>
                  <button type="button" className="primary" onClick={() => { const branch = pendingBranch; setPendingBranch(null); if (branch) onChoose(branch.turnId, branch.optionId); }}>{t("Start research")}</button>
                  <button type="button" onClick={() => setPendingBranch(null)}>{t("Keep exploring")}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="journey-inspector-context">
                  {selectedParent ? <button type="button" onClick={() => selectAndReveal(selectedParent.id)}><ArrowLeft aria-hidden="true" /> {selectedParent.topicLabel}</button> : <span>{t("Journey root")}</span>}
                  <span>{currentPathIds.has(activeTurn.id) ? t("On current route") : t("Earlier branch")}</span>
                </div>
                <p className="journey-inspector-question">{activeTurn.question}</p>
                <p className="journey-inspector-answer">{activeTurn.answerBlocks[0]?.text ?? activeTurn.answer}</p>
                <div className="journey-inspector-actions">
                  <button type="button" className="primary" onClick={() => onContinue(activeTurn.id)}>{t("Open full answer")}</button>
                  <button type="button" onClick={() => { setFocusRootId(activeTurn.id); setPendingBranch(null); }}><Crosshair aria-hidden="true" /> {t("Focus branch")}</button>
                  {selectedNode && expandedBranches.has(selectedNode.id) && !currentPathIds.has(selectedNode.id) && (
                    <button type="button" onClick={() => setExpandedBranches((current) => { const next = new Set(current); next.delete(selectedNode.id); return next; })}>{t("Fold branch")}</button>
                  )}
                </div>
                <div className="journey-inspector-directions">
                  <span>{t("Two directions from here")}</span>
                  {activeTurn.options.map((option) => {
                    const action = journey.actions.find((item) => item.turnId === activeTurn.id && item.optionId === option.id && item.resultTurnId);
                    const resultTurn = action?.resultTurnId ? journey.turns.find((turn) => turn.id === action.resultTurnId) : null;
                    if (option.state === "proposed") {
                      return <button type="button" className="open" key={option.id} onClick={() => previewBranch(activeTurn.id, option.id)}><small>{t("Option")} {option.position === 0 ? "A" : "B"} · {t("Open")}</small><strong>{option.question}</strong><em>{t("Preview branch")}</em></button>;
                    }
                    return <button type="button" key={option.id} disabled={!resultTurn} onClick={() => resultTurn && selectAndReveal(resultTurn.id)}><small>{t("Option")} {option.position === 0 ? "A" : "B"} · {t(option.state === "chosen" ? "path taken" : option.state)}</small><strong>{option.question}</strong><em>{resultTurn ? t("Show result") : t("Closed")}</em></button>;
                  })}
                </div>
              </>
            )}
          </aside>
        )}
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
  onManage,
  onSnapshot,
  onNew,
}: {
  journeys: JourneySummary[];
  viewer: Viewer | null;
  busy: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onManage: (id: string, changes: { title?: string; pinned?: boolean; hidden?: boolean }) => void;
  onSnapshot: (id: string) => void;
  onNew: () => void;
}) {
  const { t } = useI18n();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [performerFilter, setPerformerFilter] = useState<PerformerId | "all">("all");
  const [showHidden, setShowHidden] = useState(false);
  const visibleJourneys = journeys
    .filter((journey) => showHidden || !journey.hidden)
    .filter((journey) => performerFilter === "all" || journey.performerId === performerFilter)
    .filter((journey) => `${journey.title} ${journey.seed} ${journey.topicLabels.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.updatedAt - left.updatedAt);
  return (
    <section className="library-view" aria-labelledby="library-title">
      <header className="view-heading">
        <div><p className="eyebrow"><span /> {t("Saved journeys")}</p><h1 id="library-title">{t("Questions worth returning to.")}</h1></div>
        <div><p>{t("{count} of {limit} journeys saved", { count: journeys.length, limit: viewer?.journeyLimit ?? "—" })}</p><button type="button" className="compact-action" onClick={onNew}>{t("New drive +")}</button></div>
      </header>
      <div className="library-filters" aria-label={t("Library filters")}>
        <label><span>{t("Search")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Title, question, or topic")} /></label>
        <label><span>{t("Performer")}</span><select value={performerFilter} onChange={(event) => setPerformerFilter(event.target.value as PerformerId | "all")}><option value="all">{t("All performers")}</option>{PERFORMERS.map((performer) => <option value={performer.id} key={performer.id}>{performer.name}</option>)}</select></label>
        <label className="check-setting"><input type="checkbox" checked={showHidden} onChange={(event) => setShowHidden(event.target.checked)} /><span>{t("Show hidden")}</span></label>
      </div>
      {journeys.length ? (
        <div className="library-grid">
          {visibleJourneys.map((journey, index) => {
            const performer = PERFORMERS.find((item) => item.id === journey.performerId)!;
            return (
              <article key={journey.id} className="library-card">
                <div className="library-card-top"><span>{journey.pinned ? t("PINNED") : String(index + 1).padStart(2, "0")}</span><i className={performer.accent}>{performer.mark}</i></div>
                <p>{journey.topicLabels.join(" · ") || t("unclassified journey")}</p>
                <h2>{journey.title}</h2>
                <dl><div><dt>{t("Turns")}</dt><dd>{journey.turnCount}</dd></div><div><dt>{t("Sources")}</dt><dd>{journey.sourceCount}</dd></div><div><dt>{t("Open")}</dt><dd>{journey.openBranchCount}</dd></div></dl>
                <div className="library-actions">
                  <button type="button" disabled={busy !== null} onClick={() => onOpen(journey.id)}>{t("Resume")} <span>↗</span></button>
                  {confirmDelete === journey.id ? (
                    <span className="delete-confirm"><button type="button" disabled={busy !== null} onClick={() => onDelete(journey.id)}>{t("Delete")}</button><button type="button" onClick={() => setConfirmDelete(null)}>{t("Keep")}</button></span>
                  ) : (
                    <button type="button" className="text-button" onClick={() => setConfirmDelete(journey.id)}>{t("Remove")}</button>
                  )}
                </div>
                <div className="library-manage">
                  <button type="button" onClick={() => { const title = window.prompt(t("Rename this journey"), journey.title); if (title) onManage(journey.id, { title }); }}>{t("Rename")}</button>
                  <button type="button" onClick={() => onManage(journey.id, { pinned: !journey.pinned })}>{t(journey.pinned ? "Unpin" : "Pin")}</button>
                  <button type="button" onClick={() => onManage(journey.id, { hidden: !journey.hidden })}>{t(journey.hidden ? "Unhide" : "Hide")}</button>
                  <button type="button" onClick={() => onSnapshot(journey.id)}>{t("Snapshot")}</button>
                  <a href={`/api/journeys/${journey.id}/export`}>{t("Export")}</a>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyStage onOpenLibrary={onNew} label={t("Start the first saved journey")} />
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
  const { t } = useI18n();
  return (
    <section className="compare-view" aria-labelledby="compare-title">
      <header className="view-heading">
        <div><p className="eyebrow"><span /> {t("Manual comparison / no provider call")}</p><h1 id="compare-title">{t("Two journeys. One closer look.")}</h1></div>
        <div><p>{t("Select two saved journeys. WonderDrive compares their committed paths, topics, and performers.")}</p></div>
      </header>
      {journeys.length >= 2 ? (
        <>
          <div className="compare-picker">
            {journeys.map((journey, index) => {
              const chosen = selected.includes(journey.id);
              return (
                <button type="button" key={journey.id} className={chosen ? "selected" : ""} aria-pressed={chosen} onClick={() => onToggle(journey.id)}>
                  <span>{String(index + 1).padStart(2, "0")}</span><strong>{journey.title}</strong><small>{t("{count} turns", { count: journey.turnCount })} · {journey.topicLabels.join(", ")}</small><i>{chosen ? "✓" : "+"}</i>
                </button>
              );
            })}
          </div>
          <button className="compare-action" type="button" disabled={selected.length !== 2 || busy} onClick={onCompare}>{t(busy ? "Reading the paths…" : "Compare selected journeys")} <span>↘</span></button>
          {comparison && <ComparisonReport result={comparison} />}
        </>
      ) : (
        <div className="compare-empty"><p>{t("Comparison begins after two journeys exist.")}</p><button type="button" onClick={onNew}>{t("Start another drive")} →</button></div>
      )}
    </section>
  );
}

function ComparisonReport({ result }: { result: CompareResult }) {
  const { t, locale } = useI18n();
  return (
    <section className="comparison-report" aria-labelledby="report-title">
      <div className="report-title"><span>{t("Comparison ready")}</span><h2 id="report-title">{t("The useful difference")}</h2></div>
      <div className="compare-columns">
        {[result.left, result.right].map((journey, index) => (
          <article key={journey.id}>
            <span>{t("Path")} {index === 0 ? "A" : "B"}</span><h3>{journey.title}</h3>
            <p>{journey.performerName} · {journey.modelName} · {journey.researchPreset}</p>
            <p>{t("{count} turns", { count: journey.turnCount })} · {t("{count} source appearances", { count: journey.sourceCount })} · {t("{count} open branches", { count: journey.openBranchCount })} · ${journey.totalEstimatedCostUsd.toFixed(4)}</p>
            <p>{t("{count} decisions", { count: journey.actionCount })} ({t("{count} redraws", { count: journey.rejectedCount })}, {t("{count} delegated", { count: journey.delegatedCount })})</p>
            <ol>{journey.timeline.map((turn) => <li key={turn.turnId}><strong>{turn.question}</strong><small>{turn.topicLabel} · {new Intl.DateTimeFormat(locale).format(turn.researchedAt)}</small></li>)}</ol>
            <div>{journey.topicLabels.map((topic) => <small key={topic}>{topic}</small>)}</div>
          </article>
        ))}
      </div>
      <div className="observations"><span>{t("What the saved data shows")}</span><ul>{result.observations.map((observation, index) => <li key={`${observation.key}-${index}`}>{t(observation.key, observation.values)}</li>)}</ul></div>
      {!!result.confounders.length && <div className="confounders"><span>{t("Comparison cautions")}</span><ul>{result.confounders.map((item, index) => <li key={`${item.key}-${index}`}>{t(item.key, item.values)}</li>)}</ul></div>}
    </section>
  );
}

function UsageView({
  usage,
  viewer,
  loading,
  error,
  onRefresh,
  onOpenLibrary,
}: {
  usage: UsageSummary | null;
  viewer: Viewer | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenLibrary: () => void;
}) {
  const { t, locale } = useI18n();
  const time = (value: number) => new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

  return (
    <section className="usage-view" aria-labelledby="usage-title">
      <header className="view-heading">
        <div><p className="eyebrow"><span /> {t("Rolling usage / 24 hours")}</p><h1 id="usage-title">{t("Know what is available.")}</h1></div>
        <div>
          <p>{usage ? t("{count} research runs ready", { count: usage.liveResearch.remaining }) : t("Reading your usage…")}</p>
          <span>{t("Every run returns exactly 24 hours after it starts.")}</span>
        </div>
      </header>

      {error ? (
        <div className="usage-load-error" role="alert"><p>{error}</p><button type="button" onClick={onRefresh}>{t("Try again")}</button></div>
      ) : loading && !usage ? (
        <div className="usage-loading" role="status">{t("Reading your rolling limits…")}</div>
      ) : usage ? (
        <div className="usage-ledger">
          <article className="usage-primary">
            <header><span>{t("Live research")}</span><strong>{usage.liveResearch.used}<i>/</i>{usage.liveResearch.limit}</strong></header>
            <progress value={usage.liveResearch.used} max={usage.liveResearch.limit} aria-label={t("Live research used in the last 24 hours")} />
            <div className="usage-primary-copy">
              <p>{t("{count} runs are available now.", { count: usage.liveResearch.remaining })}</p>
              {usage.liveResearch.nextSlotAt ? (
                <span>{t("Next slot returns {time}.", { time: time(usage.liveResearch.nextSlotAt) })}</span>
              ) : (
                <span>{t("You have not reached the rolling run limit.")}</span>
              )}
            </div>
            {!!usage.liveResearch.releasesAt.length && (
              <div className="usage-release-list">
                <span>{t("Upcoming slot returns")}</span>
                <ol>
                  {usage.liveResearch.releasesAt.slice(0, 5).map((releaseAt, index) => (
                    <li key={`${releaseAt}-${index}`}><b>+1</b><time dateTime={new Date(releaseAt).toISOString()}>{time(releaseAt)}</time></li>
                  ))}
                </ol>
              </div>
            )}
          </article>

          <article className="usage-secondary spend">
            <span>{t("Rolling provider spend")}</span>
            <strong>${usage.spend.usedUsd.toFixed(3)} <i>/ ${usage.spend.limitUsd.toFixed(2)}</i></strong>
            <progress value={usage.spend.usedUsd} max={usage.spend.limitUsd} aria-label={t("Provider spend used in the last 24 hours")} />
            <p>{usage.spend.nextReleaseAt
              ? t("Spend begins leaving the window {time}.", { time: time(usage.spend.nextReleaseAt) })
              : t("No metered provider spend in the current window.")}</p>
          </article>

          <article className="usage-secondary library-capacity">
            <span>{t("Saved journeys")}</span>
            <strong>{usage.library.used} <i>/ {usage.library.limit}</i></strong>
            <progress value={usage.library.used} max={usage.library.limit} aria-label={t("Saved journey capacity used")} />
            <p>{t("This capacity does not reset every 24 hours. Delete a journey to free a place.")}</p>
            <button type="button" onClick={onOpenLibrary}>{t("Manage saved journeys")}</button>
          </article>

          <aside className="usage-window-note">
            <div><span>{t("How rolling limits work")}</span><p>{t("There is no midnight reset. Each run and each dollar leaves the window 24 hours after it was recorded.")}</p></div>
            {viewer?.mode === "guest" ? (
              <div>
                <span>{t("Guest session")}</span>
                <p>{usage.guestSessionExpiresAt
                  ? t("This browser session is scheduled to remain available until {time}.", { time: time(usage.guestSessionExpiresAt) })
                  : t("This library belongs to this browser session.")}</p>
                <a href="/signin-with-chatgpt?return_to=%2F">{t("Sign in to keep more across devices")} →</a>
              </div>
            ) : (
              <div><span>{t("Account usage")}</span><p>{t("These limits follow your signed-in ChatGPT identity across devices.")}</p></div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function SettingsView({
  viewer,
  preferences,
  busy,
  onSave,
}: {
  viewer: Viewer | null;
  preferences: UserPreferences;
  busy: boolean;
  onSave: (next: UserPreferences) => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const [draft, setDraft] = useState(preferences);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsReport | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnosticsError, setDiagnosticsError] = useState<string | null>(null);

  const refreshDiagnostics = useCallback(async () => {
    if (viewer?.mode !== "chatgpt") return;
    setDiagnosticsLoading(true);
    setDiagnosticsError(null);
    try {
      const payload = await api<DiagnosticsReport>("/api/diagnostics");
      setDiagnostics(payload.data);
    } catch (cause) {
      setDiagnosticsError(messageFrom(cause));
    } finally {
      setDiagnosticsLoading(false);
    }
  }, [viewer?.mode]);

  useEffect(() => {
    if (viewer?.mode !== "chatgpt") return;
    let cancelled = false;
    void api<DiagnosticsReport>("/api/diagnostics")
      .then((payload) => {
        if (!cancelled) setDiagnostics(payload.data);
      })
      .catch((cause) => {
        if (!cancelled) setDiagnosticsError(messageFrom(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [viewer?.mode]);

  return (
    <section className="settings-view" aria-labelledby="settings-title">
      <header className="view-heading">
        <div><p className="eyebrow"><span /> {t("Audience controls")}</p><h1 id="settings-title">{t("Make the stage comfortable.")}</h1></div>
        <div><p>{t(viewer?.mode === "chatgpt" ? "Synced to your ChatGPT identity" : "Saved to this guest session")}</p><span>{t("These preferences change presentation and future turns, never evidence.")}</span></div>
      </header>
      <form className="settings-form" onSubmit={(event) => { event.preventDefault(); void onSave(draft); }}>
        <label className="language-setting"><span>{t("Experience language")}</span><select value={draft.interfaceLocale} onChange={(event) => { const interfaceLocale = event.target.value as UserPreferences["interfaceLocale"]; const next = { ...draft, interfaceLocale, defaultOutputLocale: interfaceLocale }; setDraft(next); void onSave(next); }}>{SUPPORTED_LOCALES.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select><small>{t("Changes the whole interface and future learning output.")}</small></label>
        <label><span>{t("Default answer density")}</span><select value={draft.answerDensity} onChange={(event) => setDraft({ ...draft, answerDensity: event.target.value as AnswerDensity })}><option value="brief">{t("Brief")}</option><option value="balanced">{t("Balanced")}</option><option value="rich">{t("Rich")}</option></select><small>{t("Separate from how deeply WonderDrive researches.")}</small></label>
        <label><span>{t("Text size")}</span><select value={draft.textSize} onChange={(event) => setDraft({ ...draft, textSize: event.target.value as TextSize })}><option value="s">{t("Small")}</option><option value="m">{t("Medium")}</option><option value="l">{t("Large")}</option><option value="xl">{t("Extra large")}</option></select></label>
        <label><span>{t("Factual images")}</span><select value={draft.imagePreference} onChange={(event) => setDraft({ ...draft, imagePreference: event.target.value as ImagePreference })}><option value="avoid">{t("Avoid")}</option><option value="when-useful">{t("When useful")}</option><option value="prefer">{t("Prefer when supported")}</option></select><small>{t("Decorative imagery is never substituted for factual media.")}</small></label>
        <label><span>{t("Read-aloud speed: {rate}×", { rate: draft.speechRate.toFixed(1) })}</span><input type="range" min="0.6" max="1.6" step="0.1" value={draft.speechRate} onChange={(event) => setDraft({ ...draft, speechRate: Number(event.target.value) })} /></label>
        <label className="check-setting"><input type="checkbox" checked={draft.reduceMotion} onChange={(event) => setDraft({ ...draft, reduceMotion: event.target.checked })} /><span>{t("Reduce interface motion")}</span></label>
        <button className="launch-button" type="submit" disabled={busy}>{t(busy ? "Saving…" : "Save preferences")}<i aria-hidden="true">↘</i></button>
      </form>
      <section className="diagnostics-console" aria-labelledby="diagnostics-title">
        <header>
          <div>
            <p className="eyebrow"><span /> {t("Private diagnostics")}</p>
            <h2 id="diagnostics-title">{t("What failed, where, and when.")}</h2>
          </div>
          {viewer?.mode === "chatgpt" && (
            <button type="button" disabled={diagnosticsLoading} onClick={() => void refreshDiagnostics()}>
              {t(diagnosticsLoading ? "Checking…" : "Refresh incidents")}
            </button>
          )}
        </header>
        {viewer?.mode !== "chatgpt" ? (
          <p className="diagnostics-empty">{t("Sign in with ChatGPT to keep private, identity-scoped diagnostic history.")}</p>
        ) : diagnosticsError ? (
          <p className="diagnostics-empty" role="alert">{diagnosticsError}</p>
        ) : !diagnostics ? (
          <p className="diagnostics-empty">{t("Loading privacy-safe request health…")}</p>
        ) : (
          <>
            <div className="diagnostics-summary">
              <div><strong>{diagnostics.summary.requests24h}</strong><span>{t("requests · 24h")}</span></div>
              <div><strong>{diagnostics.summary.failures24h}</strong><span>{t("failures · 24h")}</span></div>
              <div><strong>{Math.round(diagnostics.summary.failureRate24h * 100)}%</strong><span>{t("failure rate")}</span></div>
              <div><strong>{diagnostics.retentionDays}d</strong><span>{t("retention")}</span></div>
            </div>
            {!!diagnostics.repeatedFailures.length && (
              <div className="diagnostics-alert" role="status">
                <strong>{t("Repeated failure detected")}</strong>
                {diagnostics.repeatedFailures.map((item) => (
                  <span key={item.errorCode}>{t("{code} happened {count} times in ten minutes.", { code: item.errorCode, count: item.count })}</span>
                ))}
              </div>
            )}
            <div className="incident-list">
              {diagnostics.incidents.length ? diagnostics.incidents.map((incident) => (
                <details key={incident.diagnosticId} className="incident-row">
                  <summary>
                    <code>{formatDiagnosticId(incident.diagnosticId)}</code>
                    <strong>{incident.errorCode}</strong>
                    <span>{incident.modelId}</span>
                    <time dateTime={new Date(incident.createdAt).toISOString()}>{new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(incident.createdAt)}</time>
                  </summary>
                  <dl>
                    <div><dt>{t("Stage")}</dt><dd>{incident.stage}</dd></div>
                    <div><dt>{t("Last provider event")}</dt><dd>{incident.lastProviderEventType}</dd></div>
                    <div><dt>{t("Parsed events")}</dt><dd>{incident.providerEventCount}</dd></div>
                    <div><dt>{t("Malformed events")}</dt><dd>{incident.malformedEventCount}</dd></div>
                    <div><dt>{t("Output deltas")}</dt><dd>{incident.outputDeltaCount}</dd></div>
                    <div><dt>{t("Provider done marker")}</dt><dd>{t(incident.sawProviderDone ? "seen" : "not seen")}</dd></div>
                    <div><dt>{t("Latency")}</dt><dd>{incident.latencyMs ? `${(incident.latencyMs / 1000).toFixed(1)}s` : t("unrecorded")}</dd></div>
                    <div><dt>{t("HTTP status")}</dt><dd>{incident.httpStatus ?? t("unrecorded")}</dd></div>
                    <div><dt>{t("OpenAI request")}</dt><dd>{incident.providerRequestId ?? t("unrecorded")}</dd></div>
                    <div><dt>{t("Preset")}</dt><dd>{incident.researchPreset}</dd></div>
                  </dl>
                  <p>{incident.errorMessage}</p>
                </details>
              )) : <p className="diagnostics-empty">{t("No failed research requests in the retained window.")}</p>}
            </div>
            <p className="diagnostics-privacy">{t("Prompts, answers, API keys, cookies, and source contents are never included.")}</p>
          </>
        )}
      </section>
    </section>
  );
}

function LoadingStage() {
  const { t } = useI18n();
  return <section className="loading-stage" aria-live="polite"><span className="loading-orbit" /><p>{t("Opening your WonderDrive library…")}</p><small>{t("Resolving a durable guest identity")}</small></section>;
}

function EmptyStage({ onOpenLibrary, label = "Open the journey library" }: { onOpenLibrary: () => void; label?: string }) {
  const { t } = useI18n();
  return <section className="empty-stage"><span aria-hidden="true">?</span><h1>{t("No journey is on stage.")}</h1><p>{t("Start a new question or return to one you have already saved.")}</p><button type="button" onClick={onOpenLibrary}>{t(label)} →</button></section>;
}

function upsertSummary(current: JourneySummary[], detail: JourneyDetail): JourneySummary[] {
  const summary: JourneySummary = {
    id: detail.id,
    title: detail.title,
    seed: detail.seed,
    performerId: detail.performerId,
    modelId: detail.modelId,
    researchPreset: detail.researchPreset,
    answerDensity: detail.answerDensity,
    imagePreference: detail.imagePreference,
    outputLocale: detail.outputLocale,
    currentTurnId: detail.currentTurnId,
    turnCount: detail.turnCount,
    sourceCount: detail.sourceCount,
    openBranchCount: detail.openBranchCount,
    version: detail.version,
    pinned: detail.pinned,
    hidden: detail.hidden,
    updatedAt: detail.updatedAt,
    topicLabels: detail.topicLabels,
  };
  return [summary, ...current.filter((journey) => journey.id !== summary.id)];
}

function formatDiagnosticId(value: string) {
  return `WD-${value.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

async function upgradeGuestLibrary(
  setViewer: Dispatch<SetStateAction<Viewer | null>>,
  refresh: () => Promise<void>,
  setError: Dispatch<SetStateAction<string | null>>,
) {
  setError(null);
  try {
    const payload = await api<{ transferred: number }>("/api/session/upgrade", {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: crypto.randomUUID() }),
    });
    setViewer(payload.viewer);
    await refresh();
  } catch (cause) {
    setError(messageFrom(cause));
  }
}
