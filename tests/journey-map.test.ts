import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

import type { JourneyDetail, JourneyTurn, TurnOption } from "../lib/contracts";

register(new URL("./journey-map-loader.mjs", import.meta.url));

type TestElement = {
  type: unknown;
  key: string | null;
  props: Record<string, unknown> & { children?: unknown };
};

type JourneyMapComponent = (props: {
  journey: JourneyDetail;
  activeTurnId: string;
  onSelect: (id: string) => void;
  onContinue: (id: string) => void;
  onChoose: (turnId: string, optionId: string) => void;
}) => TestElement;

const { JourneyMap } = await import("../app/experience/journey-map") as unknown as {
  JourneyMap: JourneyMapComponent;
};

function option(id: string, position: 0 | 1, state: TurnOption["state"] = "proposed"): TurnOption {
  return { id, position, question: `Question ${id}?`, angle: `Angle ${id}`, state };
}

function turn(id: string, parentTurnId: string | null, options: TurnOption[]): JourneyTurn {
  return {
    id,
    parentTurnId,
    depth: parentTurnId ? 1 : 0,
    question: `Question ${id}?`,
    answer: `Answer ${id}`,
    answerBlocks: [{ text: `Answer ${id}`, sourceIds: [] }],
    media: [],
    transition: `Transition ${id}`,
    topicLabel: `Topic ${id}`,
    researchSummary: `Summary ${id}`,
    researchHandoff: { discoveries: [], uncertainties: [], unresolvedThreads: [], sourceLeads: [] },
    preferredPosition: 0,
    optionSetVersion: 1,
    options,
    sources: [],
    researchEvents: [],
    metadata: {
      performerId: "atlas",
      performerVersion: "test",
      provider: "fixture",
      modelId: "gpt-5.4-mini",
      modelSnapshot: "test",
      researchPreset: "standard",
      answerDensity: "balanced",
      imagePreference: "prefer",
      outputLocale: "en",
      promptVersion: "test",
      researchedAt: 1,
    },
    research: {
      mode: "fixture",
      providerResponseId: null,
      usage: {
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        webSearchCalls: 0,
        pageFetches: 0,
        latencyMs: 0,
        estimatedCostUsd: 0,
        rateEffectiveAt: "2026-07-18",
      },
    },
    createdAt: 1,
  };
}

function journeyFixture(): JourneyDetail {
  const root = turn("root", null, [option("root-a", 0, "chosen"), option("root-b", 1)]);
  const current = turn("current", "root", [option("current-a", 0), option("current-b", 1)]);
  const branch1 = turn("branch-1", "root", [option("branch-1-a", 0, "chosen"), option("branch-1-b", 1, "rejected")]);
  const branch2 = turn("branch-2", "branch-1", [option("branch-2-a", 0, "chosen"), option("branch-2-b", 1, "rejected")]);
  const branch3 = turn("branch-3", "branch-2", [option("branch-3-a", 0, "chosen"), option("branch-3-b", 1, "rejected")]);
  const branch4 = turn("branch-4", "branch-3", [option("branch-4-a", 0, "chosen"), option("branch-4-b", 1, "rejected")]);
  const branch5 = turn("branch-5", "branch-4", [option("branch-5-a", 0, "chosen"), option("branch-5-b", 1, "rejected")]);
  const branch6 = turn("branch-6", "branch-5", [option("branch-6-a", 0), option("branch-6-b", 1)]);
  const turns = [root, current, branch1, branch2, branch3, branch4, branch5, branch6];
  const links = [
    ["root", "root-a", "current"],
    ["branch-1", "branch-1-a", "branch-2"],
    ["branch-2", "branch-2-a", "branch-3"],
    ["branch-3", "branch-3-a", "branch-4"],
    ["branch-4", "branch-4-a", "branch-5"],
    ["branch-5", "branch-5-a", "branch-6"],
  ] as const;
  return {
    id: "journey",
    title: "Characterized journey",
    seed: "Seed",
    performerId: "atlas",
    modelId: "gpt-5.4-mini",
    researchPreset: "standard",
    answerDensity: "balanced",
    imagePreference: "prefer",
    outputLocale: "en",
    currentTurnId: "current",
    turnCount: turns.length,
    sourceCount: 3,
    openBranchCount: 5,
    version: 1,
    pinned: false,
    hidden: false,
    updatedAt: 1,
    topicLabels: [],
    status: "active",
    turns,
    actions: links.map(([turnId, optionId, resultTurnId], index) => ({
      id: `action-${index}`,
      turnId,
      kind: "choose",
      optionId,
      resultTurnId,
      reason: null,
      adventure: null,
      createdAt: index,
    })),
  };
}

class HookHarness {
  private slots: unknown[] = [];
  private cursor = 0;

  reset(): void {
    this.cursor = 0;
  }

  clear(): void {
    this.slots = [];
    this.cursor = 0;
  }

  useState<T>(initial: T | (() => T)): [T, (next: T | ((current: T) => T)) => void] {
    const index = this.cursor++;
    if (!(index in this.slots)) this.slots[index] = typeof initial === "function" ? (initial as () => T)() : initial;
    const setState = (next: T | ((current: T) => T)) => {
      const current = this.slots[index] as T;
      this.slots[index] = typeof next === "function" ? (next as (value: T) => T)(current) : next;
    };
    return [this.slots[index] as T, setState];
  }

  useRef<T>(initial: T): { current: T } {
    const index = this.cursor++;
    if (!(index in this.slots)) this.slots[index] = { current: initial };
    return this.slots[index] as { current: T };
  }
}

const harness = new HookHarness();
(globalThis as typeof globalThis & { __CURIOSITYPEDIA_JOURNEY_MAP_HARNESS__: HookHarness })
  .__CURIOSITYPEDIA_JOURNEY_MAP_HARNESS__ = harness;

function elements(node: unknown): TestElement[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const element = node as TestElement;
  return [element, ...elements(element.props.children)];
}

function text(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  if (!node || typeof node !== "object" || !("props" in node)) return "";
  return text((node as TestElement).props.children);
}

function find(root: TestElement, predicate: (element: TestElement) => boolean): TestElement {
  const match = elements(root).find(predicate);
  assert.ok(match, "expected rendered element was not found");
  return match;
}

function byText(root: TestElement, label: string): TestElement {
  return find(root, (element) => element.type === "button" && text(element).trim() === label);
}

function render(overrides: Partial<Parameters<JourneyMapComponent>[0]> = {}) {
  const selected: string[] = [];
  const continued: string[] = [];
  const chosen: Array<[string, string]> = [];
  const props = {
    journey: journeyFixture(),
    activeTurnId: "current",
    onSelect: (id: string) => selected.push(id),
    onContinue: (id: string) => continued.push(id),
    onChoose: (turnId: string, optionId: string) => chosen.push([turnId, optionId]),
    ...overrides,
  };
  const rerender = () => {
    harness.reset();
    return JourneyMap(props);
  };
  return { props, selected, continued, chosen, rerender, root: rerender() };
}

test.beforeEach(() => harness.clear());

test("renders the current route, open questions, folded branch, inspector, and overview", () => {
  const { root } = render();

  assert.equal(text(find(root, (element) => element.type === "h1")), "Characterized journey");
  assert.equal(find(root, (element) => element.props["data-turn-id"] === "current").props["aria-current"], "step");
  assert.equal(find(root, (element) => element.props["aria-label"] === "Open path: Question current-a?").props.className, "journey-graph-node open");
  assert.equal(find(root, (element) => String(element.props["aria-label"] ?? "").startsWith("Expand Topic branch-1:")).props.className, "journey-graph-node cluster");
  assert.equal(find(root, (element) => element.type === "aside").props["aria-label"], "Selected turn details");
  assert.match(text(root), /Turns8Open paths5Sources3/);
});

test("preserves selection, continue, and open-question confirmation callbacks", () => {
  const rendered = render();

  (find(rendered.root, (element) => element.props["data-turn-id"] === "root").props.onClick as () => void)();
  (byText(rendered.root, "Open full answer").props.onClick as () => void)();
  (find(rendered.root, (element) => element.props["aria-label"] === "Open path: Question current-a?").props.onClick as () => void)();
  const preview = rendered.rerender();
  assert.equal(find(preview, (element) => element.type === "aside").props["aria-label"], "Confirm new branch");
  (byText(preview, "Start research").props.onClick as () => void)();

  assert.deepEqual(rendered.selected, ["root", "current"]);
  assert.deepEqual(rendered.continued, ["current"]);
  assert.deepEqual(rendered.chosen, [["current", "current-a"]]);
});

test("preserves density and graph-outline toggles", () => {
  const rendered = render();

  (byText(rendered.root, "Overview").props.onClick as () => void)();
  let root = rendered.rerender();
  assert.equal(byText(root, "Overview").props["aria-pressed"], true);
  assert.equal(find(root, (element) => element.props["data-turn-id"] === "current").props.children instanceof Array, true);
  assert.doesNotMatch(text(find(root, (element) => element.props["data-turn-id"] === "current")), /Question current\?/);

  (byText(root, "Full cards").props.onClick as () => void)();
  root = rendered.rerender();
  assert.match(text(find(root, (element) => element.props["data-turn-id"] === "current")), /Answer current/);

  (byText(root, "Outline").props.onClick as () => void)();
  root = rendered.rerender();
  assert.ok(elements(root).some((element) => element.props.className === "journey-outline"));
  assert.equal(byText(root, "Graph").props["aria-pressed"], true);
});

test("preserves cluster expansion and focused-branch navigation", () => {
  const rendered = render();
  const cluster = find(rendered.root, (element) => String(element.props["aria-label"] ?? "").startsWith("Expand Topic branch-1:"));
  (cluster.props.onClick as () => void)();
  let root = rendered.rerender();
  assert.ok(elements(root).some((element) => element.props["data-turn-id"] === "branch-2"));

  (byText(root, "Focus branch").props.onClick as () => void)();
  root = rendered.rerender();
  assert.equal(find(root, (element) => element.type === "nav").props["aria-label"], "Focused branch path");
  assert.match(text(root), /Focused branch/);

  (byText(root, "Full tree").props.onClick as () => void)();
  root = rendered.rerender();
  assert.equal(elements(root).some((element) => element.type === "nav" && element.props["aria-label"] === "Focused branch path"), false);
});
