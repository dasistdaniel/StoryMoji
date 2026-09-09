import { describe, it, expect } from "vitest";
import {
  poolFor,
  clampCount,
  pickCards,
  hasEnoughCards,
  drawHand,
  redrawCard,
  additionalCards,
  cardsByIds,
  ALL_CATEGORIES,
} from "../src/deck.js";

/** Build a simple test deck: `count` cards spread over the given categories. */
function makeCards(spec) {
  const cards = [];
  for (const [category, n] of Object.entries(spec)) {
    for (let i = 0; i < n; i++) {
      cards.push({
        id: `${category}-${i}`,
        category,
        emoji: "🙂",
        term: { de: `${category}${i}`, en: `${category}${i}` },
      });
    }
  }
  return cards;
}

describe("clampCount", () => {
  it("keeps values within 1..6", () => {
    expect(clampCount(0)).toBe(1);
    expect(clampCount(3)).toBe(3);
    expect(clampCount(9)).toBe(6);
    expect(clampCount("4")).toBe(4);
    expect(clampCount(NaN)).toBe(1);
  });
});

describe("poolFor", () => {
  const cards = makeCards({ animals: 3, food: 2 });

  it("returns all cards for the 'all' category", () => {
    expect(poolFor(cards, ALL_CATEGORIES)).toHaveLength(5);
  });

  it("filters by category", () => {
    expect(poolFor(cards, "food")).toHaveLength(2);
  });

  it("returns a copy, not the original array", () => {
    const pool = poolFor(cards, ALL_CATEGORIES);
    expect(pool).not.toBe(cards);
  });
});

describe("pickCards", () => {
  it("draws the requested number of unique cards when the pool is large", () => {
    const pool = makeCards({ animals: 20 }).filter(
      (c) => c.category === "animals"
    );
    const hand = pickCards(pool, 6);
    expect(hand).toHaveLength(6);
    expect(new Set(hand.map((c) => c.id)).size).toBe(6);
  });

  it("fills remaining slots with repeats when the pool is too small", () => {
    const pool = makeCards({ tiny: 2 }).filter((c) => c.category === "tiny");
    const hand = pickCards(pool, 5);
    expect(hand).toHaveLength(5);
    // only 2 distinct cards exist
    expect(new Set(hand.map((c) => c.id)).size).toBe(2);
  });

  it("returns an empty array for an empty pool", () => {
    expect(pickCards([], 3)).toEqual([]);
  });

  it("is deterministic given a fixed rng", () => {
    const pool = makeCards({ a: 5 }).filter((c) => c.category === "a");
    const rng = () => 0; // always picks the same swaps
    expect(pickCards(pool, 3, rng)).toEqual(pickCards(pool, 3, rng));
  });
});

describe("hasEnoughCards", () => {
  it("reflects whether unique draws are possible", () => {
    const pool = makeCards({ a: 3 });
    expect(hasEnoughCards(pool, 3)).toBe(true);
    expect(hasEnoughCards(pool, 4)).toBe(false);
  });
});

describe("drawHand", () => {
  const cards = makeCards({ animals: 10, food: 10 });

  it("respects the category", () => {
    const hand = drawHand(cards, "food", 4);
    expect(hand.every((c) => c.category === "food")).toBe(true);
  });

  it("clamps the count", () => {
    expect(drawHand(cards, ALL_CATEGORIES, 99)).toHaveLength(6);
  });
});

describe("redrawCard", () => {
  const cards = makeCards({ animals: 10 });

  it("returns a card that is not already in the hand", () => {
    const hand = pickCards(cards, 4, () => 0.5);
    const replacement = redrawCard(cards, ALL_CATEGORIES, hand, 1);
    expect(hand.map((c) => c.id)).not.toContain(replacement.id);
  });

  it("falls back to any card when the whole pool is on the table", () => {
    const pool = makeCards({ mini: 3 }).filter((c) => c.category === "mini");
    const hand = [...pool];
    const replacement = redrawCard(pool, "mini", hand, 0);
    expect(pool.map((c) => c.id)).toContain(replacement.id);
  });
});

describe("additionalCards", () => {
  const cards = makeCards({ animals: 10 });

  it("returns fresh cards not already in the hand", () => {
    const hand = pickCards(cards, 3, () => 0.3);
    const extra = additionalCards(cards, ALL_CATEGORIES, hand, 2);
    expect(extra).toHaveLength(2);
    const handIds = new Set(hand.map((c) => c.id));
    expect(extra.every((c) => !handIds.has(c.id))).toBe(true);
  });

  it("returns an empty array when asked for nothing", () => {
    expect(additionalCards(cards, ALL_CATEGORIES, [], 0)).toEqual([]);
  });
});

describe("cardsByIds", () => {
  const cards = makeCards({ animals: 5 });

  it("preserves order and drops unknown ids", () => {
    const result = cardsByIds(cards, ["animals-3", "nope", "animals-1"]);
    expect(result.map((c) => c.id)).toEqual(["animals-3", "animals-1"]);
  });
});
