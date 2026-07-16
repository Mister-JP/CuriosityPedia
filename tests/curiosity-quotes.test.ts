import assert from "node:assert/strict";
import test from "node:test";
import { CURIOSITY_QUOTES, FEATURED_CURIOSITY_QUOTES } from "../lib/curiosity-quotes";

test("curiosity quotes remain source-backed and sticker-sized", () => {
  assert.ok(CURIOSITY_QUOTES.length >= 24);
  assert.equal(new Set(CURIOSITY_QUOTES.map((quote) => quote.id)).size, CURIOSITY_QUOTES.length);
  assert.ok(CURIOSITY_QUOTES.filter((quote) => quote.context?.includes("age")).length >= 2);

  for (const quote of CURIOSITY_QUOTES) {
    assert.match(quote.id, /^[a-z0-9-]+$/);
    assert.ok(quote.text.length <= 140, quote.id);
    assert.ok(quote.attribution.trim().length > 1, quote.id);
    assert.ok(quote.sourceLabel.trim().length > 3, quote.id);
    assert.doesNotThrow(() => {
      const url = new URL(quote.sourceUrl);
      assert.equal(url.protocol, "https:");
    }, quote.id);
  }

  assert.equal(FEATURED_CURIOSITY_QUOTES.length, 3);
  assert.equal(new Set(FEATURED_CURIOSITY_QUOTES.map((quote) => quote.id)).size, 3);
});
