import bundledConfig from "../wonderdrive-art.config.json";

export type CivitaiGalleryConfig = {
  enabled: boolean;
  intervalMs: number;
  sort: "Most Reactions" | "Most Comments" | "Most Collected" | "Newest" | "Random";
  period: "Day" | "Week" | "Month" | "Year" | "AllTime";
  poolSize: number;
  baseModels: string[];
  includeTags: string[];
  includeMode: "any" | "all";
  excludeTags: string[];
};

export type CivitaiImage = {
  id: number;
  url: string;
  username?: string;
  width?: number;
  height?: number;
  hash?: string;
  tags?: Array<{ id: number; name: string }>;
};

const STORAGE_KEY = "wonderdrive-art-config-dev-v1";
const IMAGE_CACHE_KEY = "wonderdrive-art-images-v1";

export const BUNDLED_GALLERY_CONFIG = bundledConfig as CivitaiGalleryConfig;

export function getGalleryConfig(): CivitaiGalleryConfig {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") {
    return BUNDLED_GALLERY_CONFIG;
  }
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeGalleryConfig(JSON.parse(saved)) : BUNDLED_GALLERY_CONFIG;
  } catch {
    return BUNDLED_GALLERY_CONFIG;
  }
}

export function saveGalleryDevOverride(config: CivitaiGalleryConfig) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeGalleryConfig(config)));
}

export function buildCivitaiImagesUrl(config: CivitaiGalleryConfig, page = 1, limit = config.poolSize) {
  const params = new URLSearchParams({
    limit: String(Math.min(200, Math.max(20, limit))),
    page: String(Math.max(1, Math.floor(page))),
    sort: config.sort,
    period: config.period,
    type: "image",
    nsfw: "None",
    withMeta: "false",
    withTags: "true",
  });
  if (config.baseModels.length) params.set("baseModels", config.baseModels.join(","));
  return `https://civitai.com/api/v1/images?${params.toString()}`;
}

export async function fetchCivitaiImages(config: CivitaiGalleryConfig, signal?: AbortSignal) {
  try {
    const response = await fetch(buildCivitaiImagesUrl({ ...config, sort: "Random" }, 1, config.poolSize), {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!response.ok) throw new Error(`Civitai returned HTTP ${response.status}.`);
    const body = await response.json() as { items?: unknown[] };
    if (!Array.isArray(body.items)) throw new Error("Civitai returned an unexpected response.");
    const validImages = body.items.filter(isCivitaiImage);
    const safeImages = filterExcludedCivitaiImages(validImages, config);
    const preferredImages = filterCivitaiImages(safeImages, config);
    const images = shuffle(preferredImages.length >= 8 ? preferredImages : safeImages);
    if (!images.length) throw new Error("Civitai returned no safe artwork.");
    cacheCivitaiImages(images);
    return images;
  } catch (cause) {
    if (signal?.aborted) throw cause;
    const cached = getCachedCivitaiImages();
    if (cached.length) return shuffle(cached);
    throw cause;
  }
}

export function collectCivitaiTags(images: CivitaiImage[]) {
  const tags = new Map<string, { name: string; count: number }>();
  for (const image of images) {
    for (const tag of image.tags ?? []) {
      const name = tag.name.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      const current = tags.get(key);
      tags.set(key, { name, count: (current?.count ?? 0) + 1 });
    }
  }
  return [...tags.values()].sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function filterCivitaiImages(images: CivitaiImage[], config: CivitaiGalleryConfig) {
  const included = new Set(config.includeTags.map(normalizeTag));
  return images.filter((image) => {
    const imageTags = new Set((image.tags ?? []).map((tag) => normalizeTag(tag.name)));
    if (!included.size) return true;
    return config.includeMode === "all"
      ? [...included].every((tag) => imageTags.has(tag))
      : [...included].some((tag) => imageTags.has(tag));
  });
}

function filterExcludedCivitaiImages(images: CivitaiImage[], config: CivitaiGalleryConfig) {
  const excluded = new Set(config.excludeTags.map(normalizeTag));
  return images.filter((image) => {
    const imageTags = (image.tags ?? []).map((tag) => normalizeTag(tag.name));
    return !imageTags.some((tag) => excluded.has(tag));
  });
}

function isCivitaiImage(value: unknown): value is CivitaiImage {
  if (!value || typeof value !== "object") return false;
  const image = value as Partial<CivitaiImage>;
  return Number.isFinite(Number(image.id))
    && typeof image.url === "string"
    && image.url.startsWith("https://image.civitai.com/");
}

function normalizeGalleryConfig(value: unknown): CivitaiGalleryConfig {
  const candidate = value && typeof value === "object" ? value as Partial<CivitaiGalleryConfig> : {};
  return {
    ...BUNDLED_GALLERY_CONFIG,
    ...candidate,
    intervalMs: Math.min(30000, Math.max(3000, Number(candidate.intervalMs) || BUNDLED_GALLERY_CONFIG.intervalMs)),
    poolSize: Math.min(200, Math.max(20, Number(candidate.poolSize) || BUNDLED_GALLERY_CONFIG.poolSize)),
    baseModels: normalizeTags(candidate.baseModels),
    includeTags: normalizeTags(candidate.includeTags),
    excludeTags: normalizeTags(candidate.excludeTags),
  };
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
}

function normalizeTag(value: string) {
  return value.trim().toLowerCase();
}

function cacheCivitaiImages(images: CivitaiImage[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(images.slice(0, 80)));
  } catch {
    // A fresh network gallery still works when storage is unavailable.
  }
}

function getCachedCivitaiImages() {
  if (typeof window === "undefined") return [];
  try {
    const cached = JSON.parse(window.localStorage.getItem(IMAGE_CACHE_KEY) ?? "[]") as unknown;
    return Array.isArray(cached) ? cached.filter(isCivitaiImage) : [];
  } catch {
    return [];
  }
}

function shuffle<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
