import type { SupportedLocale } from "./contracts";
import { RepositoryError } from "./errors";

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const SUPPORTED_LOCALES = [
  { id: "en", name: "English", direction: "ltr" },
  { id: "es", name: "Español", direction: "ltr" },
] as const satisfies ReadonlyArray<{
  id: SupportedLocale;
  name: string;
  direction: "ltr" | "rtl";
}>;

const localeIds = new Set<string>(SUPPORTED_LOCALES.map(({ id }) => id));

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  if (typeof value !== "string") return false;
  try {
    return localeIds.has(Intl.getCanonicalLocales(value)[0]);
  } catch {
    return false;
  }
}

export function normalizeLocale(value: unknown, label = "language"): SupportedLocale {
  if (!isSupportedLocale(value)) {
    throw new RepositoryError("BAD_REQUEST", `Choose a supported ${label}.`, 400);
  }
  return Intl.getCanonicalLocales(value)[0] as SupportedLocale;
}

export function localeName(locale: SupportedLocale): string {
  return SUPPORTED_LOCALES.find(({ id }) => id === locale)?.name ?? "English";
}

export function localeDirection(locale: SupportedLocale): "ltr" | "rtl" {
  return SUPPORTED_LOCALES.find(({ id }) => id === locale)?.direction ?? "ltr";
}
