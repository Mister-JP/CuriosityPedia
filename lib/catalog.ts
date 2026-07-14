import type { ModelConfig, Performer } from "./contracts";

export const PERFORMERS: Performer[] = [
  {
    id: "archivist",
    name: "The Archivist",
    role: "Finds the thread history tried to hide",
    cue: "Patient, precise, and attentive to what survives in records and rituals.",
    mark: "A",
    accent: "coral",
  },
  {
    id: "field-naturalist",
    name: "The Field Naturalist",
    role: "Starts with behavior, texture, and change",
    cue: "Observant and concrete, with a preference for mechanisms over slogans.",
    mark: "F",
    accent: "acid",
  },
  {
    id: "systems-cartographer",
    name: "The Systems Cartographer",
    role: "Draws the forces around the obvious answer",
    cue: "Clear-eyed about feedback loops, boundaries, incentives, and second-order effects.",
    mark: "S",
    accent: "sky",
  },
];

export const MODELS: ModelConfig[] = [
  {
    id: "gpt-5.6-terra",
    provider: "OpenAI",
    name: "GPT-5.6 Terra · live",
    disclosure: "Foreground web research · metered OpenAI usage",
    mode: "live",
  },
  {
    id: "fixture-terra",
    provider: "OpenAI",
    name: "Terra · free demo",
    disclosure: "Reviewed deterministic fixture · no provider charge",
    mode: "fixture",
  },
];

export const STARTER_QUESTIONS = [
  "What does a building sound like?",
  "Can a map tell the truth?",
  "Where does a city keep its memories?",
  "Why do some ideas feel inevitable?",
  "Can silence be designed?",
  "What can an ocean hear that we cannot?",
] as const;

export const PRESET_LABELS = {
  spark: {
    name: "Spark",
    description: "Up to one web search with a compact answer",
  },
  standard: {
    name: "Standard",
    description: "Up to two web searches with balanced depth",
  },
  deep: {
    name: "Deep",
    description: "Up to three web searches and a fuller synthesis",
  },
} as const;
