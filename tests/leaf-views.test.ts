import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

import { BOOTSTRAP_CATALOG, DEFAULT_PREFERENCES } from "../lib/catalog";
import type { JourneyDetail, JourneySummary, TextSize, UsageSummary, UserPreferences, Viewer } from "../lib/contracts";
import { buttonByText, elements, find, HookHarness, text, type TestElement } from "./leaf-view-harness";

register(new URL("./journey-map-loader.mjs", import.meta.url));

const hooks = new HookHarness();
(globalThis as typeof globalThis & { __CURIOSITYPEDIA_JOURNEY_MAP_HARNESS__: HookHarness })
  .__CURIOSITYPEDIA_JOURNEY_MAP_HARNESS__ = hooks;

type UsageViewComponent = (props: {
  usage: UsageSummary | null;
  viewer: Viewer | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onOpenLibrary: () => void;
}) => TestElement;

type LibraryComponent = (props: {
  journeys: JourneySummary[];
  viewer: Viewer | null;
  busy: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onManage: (id: string, changes: { title?: string; pinned?: boolean; hidden?: boolean }) => void;
  onSnapshot: (id: string) => void;
  onNew: () => void;
}) => TestElement;

type BookmarksComponent = (props: {
  journeys: JourneySummary[];
  bookmarks: Record<string, number>;
  onOpen: (journeyId: string, turnId?: string) => void;
  onToggle: (journeyId: string, turnId: string) => void;
  onPin: (journeyId: string, pinned: boolean) => void;
  onNew: () => void;
}) => TestElement;

type SettingsComponent = (props: {
  viewer: Viewer | null;
  savedJourneyCount: number;
  preferences: UserPreferences;
  catalog: typeof BOOTSTRAP_CATALOG;
  busy: boolean;
  onPreviewTextSize: (textSize: TextSize) => void;
  onSave: (next: UserPreferences) => Promise<void>;
}) => TestElement;

const { UsageView } = await import("../app/experience/usage-view") as unknown as {
  UsageView: UsageViewComponent;
};
const { Library } = await import("../app/experience/library-view") as unknown as {
  Library: LibraryComponent;
};
const { BookmarksView } = await import("../app/experience/bookmarks-view") as unknown as {
  BookmarksView: BookmarksComponent;
};
const { SettingsView } = await import("../app/experience/settings-view") as unknown as {
  SettingsView: SettingsComponent;
};

test.beforeEach(() => hooks.clear());

const viewer: Viewer = {
  mode: "guest",
  displayName: "Guest Explorer",
  journeyLimit: 12,
  guestExpiresAt: 2_000_000_000_000,
};

const usage: UsageSummary = {
  asOf: 1_800_000_000_000,
  windowHours: 24,
  liveResearch: {
    used: 3,
    limit: 3,
    remaining: 0,
    nextSlotAt: 1_800_003_600_000,
    releasesAt: [1_800_003_600_000, 1_800_007_200_000],
  },
  spend: {
    usedUsd: 1.234,
    heldUsd: 0.125,
    accountedUsd: 1.359,
    limitUsd: 5,
    remainingUsd: 3.641,
    nextReleaseAt: 1_800_003_600_000,
  },
  library: {
    used: 12,
    limit: 12,
    remaining: 0,
  },
  guestSessionExpiresAt: 2_000_000_000_000,
};

function journeySummary(
  id: string,
  changes: Partial<JourneySummary> = {},
): JourneySummary {
  return {
    id,
    title: `Journey ${id}`,
    seed: `Seed ${id}`,
    performerId: "atlas",
    modelId: "gpt-5.4-mini",
    researchPreset: "standard",
    answerDensity: "balanced",
    imagePreference: "prefer",
    outputLocale: "en",
    currentTurnId: `${id}-turn`,
    turnCount: 2,
    sourceCount: 4,
    openBranchCount: 2,
    version: 1,
    pinned: false,
    hidden: false,
    updatedAt: 100,
    topicLabels: [`Topic ${id}`],
    ...changes,
  };
}

function renderLibrary(journeys: JourneySummary[], overrides: Partial<Parameters<LibraryComponent>[0]> = {}) {
  const opened: string[] = [];
  const deleted: string[] = [];
  const managed: Array<[string, { title?: string; pinned?: boolean; hidden?: boolean }]> = [];
  const snapshots: string[] = [];
  let newCount = 0;
  const props = {
    journeys,
    viewer,
    busy: null,
    onOpen: (id: string) => opened.push(id),
    onDelete: (id: string) => deleted.push(id),
    onManage: (id: string, changes: { title?: string; pinned?: boolean; hidden?: boolean }) => managed.push([id, changes]),
    onSnapshot: (id: string) => snapshots.push(id),
    onNew: () => { newCount += 1; },
    ...overrides,
  };
  const rerender = () => {
    hooks.reset();
    return Library(props);
  };
  return { props, opened, deleted, managed, snapshots, get newCount() { return newCount; }, rerender, root: rerender() };
}

function bookmarkedDetail(journey: JourneySummary, turnId: string): JourneyDetail {
  return {
    ...journey,
    status: "active",
    actions: [],
    turns: [{
      id: turnId,
      question: `Saved question for ${journey.id}`,
      topicLabel: `Saved topic ${journey.id}`,
      sources: [{ id: "source-1" }, { id: "source-2" }],
    }],
  } as unknown as JourneyDetail;
}

function renderBookmarks(journeys: JourneySummary[], bookmarks: Record<string, number>) {
  const opened: Array<[string, string | undefined]> = [];
  const toggled: Array<[string, string]> = [];
  const pinned: Array<[string, boolean]> = [];
  let newCount = 0;
  const props = {
    journeys,
    bookmarks,
    onOpen: (journeyId: string, turnId?: string) => opened.push([journeyId, turnId]),
    onToggle: (journeyId: string, turnId: string) => toggled.push([journeyId, turnId]),
    onPin: (journeyId: string, nextPinned: boolean) => pinned.push([journeyId, nextPinned]),
    onNew: () => { newCount += 1; },
  };
  const rerender = () => {
    hooks.reset();
    return BookmarksView(props);
  };
  return { opened, toggled, pinned, get newCount() { return newCount; }, rerender, root: rerender() };
}

test("UsageView preserves loading and error accessibility states", () => {
  const loading = UsageView({ usage: null, viewer, loading: true, error: null, onRefresh() {}, onOpenLibrary() {} });
  assert.equal(find(loading, (element) => element.props.role === "status").props.className, "usage-loading");
  assert.match(text(loading), /Reading your rolling limits…/);

  let refreshed = 0;
  const failed = UsageView({ usage: null, viewer, loading: false, error: "Usage unavailable", onRefresh: () => { refreshed += 1; }, onOpenLibrary() {} });
  assert.equal(find(failed, (element) => element.props.role === "alert").props.className, "usage-load-error");
  (buttonByText(failed, "Try again").props.onClick as () => void)();
  assert.equal(refreshed, 1);
});

test("UsageView preserves quota, capacity, spend, identity, and library behavior", () => {
  let openedLibrary = 0;
  const root = UsageView({ usage, viewer, loading: false, error: null, onRefresh() {}, onOpenLibrary: () => { openedLibrary += 1; } });

  assert.equal(find(root, (element) => element.type === "h1").props.id, "usage-title");
  assert.ok(elements(root).some((element) => element.props.className === "usage-primary quota-reached"));
  assert.equal(find(root, (element) => element.props["aria-label"] === "Live research used in the last 24 hours").props.value, 3);
  assert.equal(find(root, (element) => element.props["aria-label"] === "Saved journey capacity used").props.value, 12);
  assert.match(text(root), /Action required/);
  assert.match(text(root), /Delete a journey to free a place\./);
  assert.match(text(root), /\$1\.359 \/ \$5\.00/);
  assert.match(text(root), /\$1\.234 settled · \$0\.125 held/);
  assert.equal(find(root, (element) => element.type === "a").props.href, "/signin-with-chatgpt?return_to=%2F");
  (buttonByText(root, "Manage saved journeys").props.onClick as () => void)();
  assert.equal(openedLibrary, 1);
});

test("Library preserves visible ordering, filters, counts, and empty-state contract", () => {
  const journeys = [
    journeySummary("alpha", { title: "Alpha trail", updatedAt: 200 }),
    journeySummary("beta", { title: "Beta trail", performerId: "sage", pinned: true, updatedAt: 100 }),
    journeySummary("hidden", { title: "Hidden trail", hidden: true, updatedAt: 300 }),
  ];
  const rendered = renderLibrary(journeys);

  assert.deepEqual(elements(rendered.root).filter((element) => element.type === "h2").map(text), ["Beta trail", "Alpha trail"]);
  assert.match(text(rendered.root), /3 of 12 journeys saved/);

  const search = find(rendered.root, (element) => element.type === "input" && element.props.placeholder === "Title, question, or topic");
  (search.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "Alpha" } });
  let root = rendered.rerender();
  assert.deepEqual(elements(root).filter((element) => element.type === "h2").map(text), ["Alpha trail"]);

  const showHidden = find(root, (element) => element.type === "input" && element.props.type === "checkbox");
  (showHidden.props.onChange as (event: { target: { checked: boolean } }) => void)({ target: { checked: true } });
  (find(root, (element) => element.type === "input" && element.props.placeholder === "Title, question, or topic").props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "" } });
  root = rendered.rerender();
  assert.deepEqual(elements(root).filter((element) => element.type === "h2").map(text), ["Beta trail", "Hidden trail", "Alpha trail"]);

  const empty = renderLibrary([]);
  const emptyStage = find(empty.root, (element) => element.props.label === "Start the first saved journey");
  (emptyStage.props.onOpenLibrary as () => void)();
  assert.equal(empty.newCount, 1);
});

test("Library preserves resume, deletion, management, snapshot, and new-journey callbacks", () => {
  const rendered = renderLibrary([journeySummary("alpha")]);
  Object.defineProperty(globalThis, "window", { value: { prompt: () => "Renamed trail" }, configurable: true });

  (find(rendered.root, (element) => element.type === "button" && text(element).trim().startsWith("Resume")).props.onClick as () => void)();
  (buttonByText(rendered.root, "Remove").props.onClick as () => void)();
  const root = rendered.rerender();
  (buttonByText(root, "Delete").props.onClick as () => void)();
  (buttonByText(root, "Rename").props.onClick as () => void)();
  (buttonByText(root, "Pin").props.onClick as () => void)();
  (buttonByText(root, "Hide").props.onClick as () => void)();
  (buttonByText(root, "Snapshot").props.onClick as () => void)();
  (buttonByText(root, "New drive +").props.onClick as () => void)();

  assert.deepEqual(rendered.opened, ["alpha"]);
  assert.deepEqual(rendered.deleted, ["alpha"]);
  assert.deepEqual(rendered.managed, [
    ["alpha", { title: "Renamed trail" }],
    ["alpha", { pinned: true }],
    ["alpha", { hidden: true }],
  ]);
  assert.deepEqual(rendered.snapshots, ["alpha"]);
  assert.equal(rendered.newCount, 1);
});

test("BookmarksView preserves saved-item ordering, collections, filters, counts, and empty states", () => {
  const now = Date.now();
  const alpha = journeySummary("alpha", { title: "Alpha trail", updatedAt: now - 2_000, pinned: true });
  const beta = journeySummary("beta", { title: "Beta trail", updatedAt: now - 4_000 });
  const hidden = journeySummary("hidden", { title: "Hidden trail", updatedAt: now - 1_000, hidden: true });
  const bookmarkTime = now - 500;
  hooks.setSlot(0, { alpha: bookmarkedDetail(alpha, "saved-turn") });
  const rendered = renderBookmarks([alpha, beta, hidden], { "alpha::saved-turn": bookmarkTime });

  assert.equal(find(rendered.root, (element) => element.type === "h1").props.id, "bookmarks-title");
  assert.deepEqual(elements(rendered.root).filter((element) => element.type === "h3").map(text), [
    "Saved question for alpha",
    "Alpha trail",
    "Beta trail",
  ]);
  assert.match(text(find(rendered.root, (element) => element.props["aria-label"] === "Bookmark summary")), /2 journeys1 questions/);

  (buttonByText(rendered.root, "Pinned journeys1").props.onClick as () => void)();
  let root = rendered.rerender();
  assert.deepEqual(elements(root).filter((element) => element.type === "h3").map(text), ["Alpha trail"]);

  (buttonByText(root, "Everything4").props.onClick as () => void)();
  root = rendered.rerender();
  const search = find(root, (element) => element.type === "input" && element.props.placeholder === "Search questions, journeys, or topics");
  (search.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "missing" } });
  root = rendered.rerender();
  assert.match(text(root), /Nothing tucked away here yet/);
  assert.match(text(root), /Try a broader search or clear a filter\./);
  (buttonByText(root, "Clear search").props.onClick as () => void)();
  root = rendered.rerender();
  assert.equal(elements(root).filter((element) => element.type === "h3").length, 3);
});

test("BookmarksView preserves journey and question callback payloads", () => {
  const alpha = journeySummary("alpha", { pinned: false, updatedAt: Date.now() - 1_000 });
  hooks.setSlot(0, { alpha: bookmarkedDetail(alpha, "saved-turn") });
  const rendered = renderBookmarks([alpha], { "alpha::saved-turn": Date.now() });
  const rows = elements(rendered.root).filter((element) => typeof element.props.className === "string" && element.props.className.startsWith("bookmark-row "));
  const questionRow = rows.find((row) => row.props.className === "bookmark-row question")!;
  const journeyRow = rows.find((row) => row.props.className === "bookmark-row journey")!;

  (buttonByText(questionRow, "Remove").props.onClick as () => void)();
  (buttonByText(questionRow, "Open").props.onClick as () => void)();
  (buttonByText(journeyRow, "Pin").props.onClick as () => void)();
  (buttonByText(journeyRow, "Open").props.onClick as () => void)();
  (buttonByText(rendered.root, "Explore something new").props.onClick as () => void)();

  assert.deepEqual(rendered.toggled, [["alpha", "saved-turn"]]);
  assert.deepEqual(rendered.opened, [["alpha", "saved-turn"], ["alpha", undefined]]);
  assert.deepEqual(rendered.pinned, [["alpha", true]]);
  assert.equal(rendered.newCount, 1);
});

function renderSettings(
  settingsViewer: Viewer | null = viewer,
  overrides: Partial<Parameters<SettingsComponent>[0]> = {},
) {
  const previews: TextSize[] = [];
  const saves: UserPreferences[] = [];
  const props = {
    viewer: settingsViewer,
    savedJourneyCount: 4,
    preferences: DEFAULT_PREFERENCES,
    catalog: BOOTSTRAP_CATALOG,
    busy: false,
    onPreviewTextSize: (textSize: TextSize) => previews.push(textSize),
    onSave: async (next: UserPreferences) => { saves.push(next); },
    ...overrides,
  };
  const rerender = () => {
    hooks.reset();
    return SettingsView(props);
  };
  return { previews, saves, rerender, root: rerender() };
}

test("SettingsView preserves headings, identity messaging, actions, busy state, and development disclosure", () => {
  const guest = renderSettings();
  assert.equal(find(guest.root, (element) => element.type === "h1").props.id, "settings-title");
  assert.match(text(guest.root), /Your preferencesSettingsTune how CuriosityPedia looks and answers\./);
  assert.match(text(guest.root), /Guest ExplorerGuest sessionSaved4 \/ 12PreferencesThis device/);
  assert.equal(find(guest.root, (element) => element.type === "a").props.href, "/signin-with-chatgpt?return_to=%2Fsettings");
  assert.ok(elements(guest.root).some((element) => element.props.className === "art-dev-disclosure"));

  const signedIn = renderSettings({ mode: "chatgpt", displayName: "Ada Lovelace", journeyLimit: 20 }, { busy: true });
  assert.match(text(signedIn.root), /Ada LovelaceChatGPT accountSaved4 \/ 20PreferencesSynced/);
  assert.match(text(signedIn.root), /Synced to your ChatGPT identity/);
  assert.equal(find(signedIn.root, (element) => element.type === "a").props.href, "/signout-with-chatgpt?return_to=%2Fsettings");
  assert.equal(buttonByText(signedIn.root, "Saving…↘").props.disabled, true);
});

test("SettingsView preserves preference drafts, preview payloads, immediate locale save, and submit payload", () => {
  const rendered = renderSettings();

  (buttonByText(rendered.root, "LargeAsk anything…").props.onClick as () => void)();
  let root = rendered.rerender();
  assert.deepEqual(rendered.previews, ["l"]);
  assert.equal(buttonByText(root, "LargeAsk anything…").props["aria-pressed"], true);

  const detail = find(root, (element) => element.type === "input" && element.props.type === "range");
  (detail.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "2" } });
  root = rendered.rerender();
  assert.match(text(find(root, (element) => element.type === "output")), /Deep dive/);

  const model = find(root, (element) => element.type === "select" && element.props.value === DEFAULT_PREFERENCES.defaultModelId);
  const nextModel = BOOTSTRAP_CATALOG.models.find((entry) => entry.id !== DEFAULT_PREFERENCES.defaultModelId)!.id;
  (model.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: nextModel } });
  root = rendered.rerender();

  const reduceMotion = find(root, (element) => element.type === "input" && element.props.type === "checkbox");
  (reduceMotion.props.onChange as (event: { target: { checked: boolean } }) => void)({ target: { checked: true } });
  root = rendered.rerender();

  const locale = find(root, (element) => element.type === "select" && element.props.value === DEFAULT_PREFERENCES.interfaceLocale);
  (locale.props.onChange as (event: { target: { value: string } }) => void)({ target: { value: "fr" } });
  assert.deepEqual(rendered.saves[0], {
    ...DEFAULT_PREFERENCES,
    textSize: "l",
    answerDensity: "rich",
    defaultModelId: nextModel,
    reduceMotion: true,
    interfaceLocale: "fr",
    defaultOutputLocale: "fr",
  });

  root = rendered.rerender();
  const form = find(root, (element) => element.type === "form");
  let prevented = false;
  (form.props.onSubmit as (event: { preventDefault: () => void }) => void)({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.deepEqual(rendered.saves[1], rendered.saves[0]);
});
