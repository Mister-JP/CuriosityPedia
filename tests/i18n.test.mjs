import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { MODELS, PERFORMERS } from "../lib/catalog.ts";
import { hasTranslation, translate } from "../app/i18n.tsx";
import { localeDirection, normalizeLocale } from "../lib/i18n.ts";

test("every literal interface message has a Spanish translation", async () => {
  const source = await readFile(new URL("../app/wonderdrive-experience.tsx", import.meta.url), "utf8");
  const keys = [...source.matchAll(/\bt\(\s*"([^"]+)"/g)].map((match) => match[1]);
  const catalogKeys = [
    ...PERFORMERS.flatMap((performer) => [performer.role, performer.cue, ...performer.voiceTraits]),
    ...MODELS.map((model) => model.disclosure),
  ];
  const serverSource = await readFile(new URL("../lib/repository.ts", import.meta.url), "utf8");
  const serverKeys = [...serverSource.matchAll(/\{ key: "([^"]+)"/g)].map((match) => match[1]);
  const missing = [...new Set([...keys, ...catalogKeys, ...serverKeys])]
    .filter((key) => !hasTranslation("es", key))
    .sort();
  assert.deepEqual(missing, []);
});

test("locale helpers validate, interpolate, and expose direction", () => {
  assert.equal(normalizeLocale("es"), "es");
  assert.equal(localeDirection("es"), "ltr");
  assert.equal(translate("es", "Turn {number}", { number: 3 }), "Turno 3");
  assert.throws(() => normalizeLocale("xx-invalid"));
});
