import { describe, it, expect } from "vitest";
import {
  poolFor,
  clampCount,
  hasEnoughCards,
  drawOne,
  drawSlots,
  redrawSlot,
  reshuffleSlots,
  reshuffleCategories,
  resizeSlots,
  randomCategories,
  cardsByIds,
  ALL_CATEGORIES,
} from "../src/deck.js";

/** Build a simple test deck: `n` cards per category in `spec`. */
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

  it("filters by category and returns a copy", () => {
    expect(poolFor(cards, "food")).toHaveLength(2);
    expect(poolFor(cards, ALL_CATEGORIES)).not.toBe(cards);
  });
});

describe("hasEnoughCards", () => {
  it("reflects whether unique draws are possible", () => {
    const pool = makeCards({ a: 3 });
    expect(hasEnoughCards(pool, 3)).toBe(true);
    expect(hasEnoughCards(pool, 4)).toBe(false);
  });
});

describe("drawOne", () => {
  const cards = makeCards({ animals: 10, food: 10 });

  it("respects the category", () => {
    for (let i = 0; i < 20; i++) {
      expect(drawOne(cards, "food").category).toBe("food");
    }
  });

  it("avoids excluded ids when it can", () => {
    const exclude = cards
      .filter((c) => c.category === "animals")
      .slice(0, 9)
      .map((c) => c.id);
    // only animals-9 is left un-excluded
    expect(drawOne(cards, "animals", exclude).id).toBe("animals-9");
  });

  it("falls back to any card when everything is excluded", () => {
    const pool = makeCards({ mini: 2 }).filter((c) => c.category === "mini");
    const got = drawOne(pool, "mini", ["mini-0", "mini-1"]);
    expect(["mini-0", "mini-1"]).toContain(got.id);
  });

  it("returns null when the category has no cards", () => {
    expect(drawOne(cards, "category-with-no-cards")).toBeNull();
    expect(drawOne([], ALL_CATEGORIES)).toBeNull();
  });
});

describe("drawSlots", () => {
  const cards = makeCards({ animals: 10, food: 10 });

  it("draws one card per category, matching each category", () => {
    const slots = drawSlots(cards, ["animals", "food", "animals"]);
    expect(slots).toHaveLength(3);
    expect(slots[0].card.category).toBe("animals");
    expect(slots[1].card.category).toBe("food");
    expect(slots[2].card.category).toBe("animals");
  });

  it("keeps cards distinct across slots when pools allow", () => {
    const slots = drawSlots(cards, Array(6).fill("animals"));
    expect(new Set(slots.map((s) => s.card.id)).size).toBe(6);
  });

  it("allows repeats only when a pool is too small", () => {
    const small = makeCards({ tiny: 2 });
    const slots = drawSlots(small, Array(4).fill("tiny"));
    expect(new Set(slots.map((s) => s.card.id)).size).toBe(2);
  });
});

describe("redrawSlot", () => {
  const cards = makeCards({ animals: 10 });

  it("keeps the slot category and avoids the other slots' cards", () => {
    const slots = drawSlots(cards, Array(4).fill("animals"));
    const replacement = redrawSlot(cards, slots, 1);
    const others = slots.filter((_, i) => i !== 1).map((s) => s.card.id);
    expect(others).not.toContain(replacement.id);
  });

  it("uses the slot's own category, not a neighbour's", () => {
    const mixed = makeCards({ animals: 10, food: 10 });
    const slots = drawSlots(mixed, ["food", "animals"]);
    for (let i = 0; i < 10; i++) {
      expect(redrawSlot(mixed, slots, 0).category).toBe("food");
    }
  });
});

describe("randomCategories", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];

  it("returns the requested number of ids, distinct when the pool allows", () => {
    const got = randomCategories(ids, 6);
    expect(got).toHaveLength(6);
    expect(new Set(got).size).toBe(6);
    expect(got.every((id) => ids.includes(id))).toBe(true);
  });

  it("never returns the 'all' sentinel", () => {
    for (let i = 0; i < 20; i++) {
      expect(randomCategories(ids, 6)).not.toContain(ALL_CATEGORIES);
    }
  });

  it("allows repeats only when count exceeds the pool", () => {
    const got = randomCategories(["x", "y"], 4);
    expect(got).toHaveLength(4);
    expect(new Set(got).size).toBe(2);
  });

  it("falls back to 'all' when there are no categories", () => {
    expect(randomCategories([], 3)).toEqual(["all", "all", "all"]);
  });
});

describe("reshuffleSlots", () => {
  const cards = makeCards({ animals: 10, food: 10 });

  it("redraws every slot from its own category", () => {
    const slots = drawSlots(cards, ["animals", "food", "food"]);
    const next = reshuffleSlots(cards, slots);
    expect(next.map((s) => s.category)).toEqual(["animals", "food", "food"]);
    expect(next[0].card.category).toBe("animals");
    expect(next[1].card.category).toBe("food");
  });

  it("keeps slots the `keep` predicate protects, and avoids their cards", () => {
    const slots = drawSlots(cards, Array(4).fill("animals"));
    const pinnedId = slots[1].card.id;
    const next = reshuffleSlots(cards, slots, (_, i) => i === 1);
    expect(next[1]).toBe(slots[1]); // untouched
    const others = next.filter((_, i) => i !== 1).map((s) => s.card.id);
    expect(others).not.toContain(pinnedId); // redrawn cards avoid the kept one
  });
});

describe("reshuffleCategories", () => {
  const cards = makeCards({ a: 8, b: 8, c: 8, d: 8 });
  const ids = ["a", "b", "c", "d"];

  it("gives every slot a fresh category and a matching card", () => {
    const slots = drawSlots(cards, ["a", "a", "a"]);
    const next = reshuffleCategories(cards, slots, ids);
    expect(next).toHaveLength(3);
    for (const slot of next) {
      expect(ids).toContain(slot.category);
      expect(slot.card.category).toBe(slot.category);
    }
  });

  it("leaves protected slots (category + card) alone", () => {
    const slots = drawSlots(cards, ["a", "b", "c"]);
    const next = reshuffleCategories(cards, slots, ids, (_, i) => i === 0);
    expect(next[0]).toBe(slots[0]);
  });
});

describe("resizeSlots", () => {
  const cards = makeCards({ animals: 20 });

  it("shrinks by dropping slots from the end", () => {
    const slots = drawSlots(cards, Array(5).fill("animals"));
    const smaller = resizeSlots(cards, slots, 2, ALL_CATEGORIES);
    expect(smaller).toHaveLength(2);
    expect(smaller).toEqual(slots.slice(0, 2));
  });

  it("grows by adding slots with the fallback category, keeping the rest", () => {
    const slots = drawSlots(cards, ["animals", "animals"]);
    const bigger = resizeSlots(cards, slots, 4, ALL_CATEGORIES);
    expect(bigger).toHaveLength(4);
    expect(bigger.slice(0, 2)).toEqual(slots);
    expect(bigger[2].category).toBe(ALL_CATEGORIES);
    expect(bigger[3].category).toBe(ALL_CATEGORIES);
    // new cards should differ from the ones already down
    const ids = bigger.map((s) => s.card.id);
    expect(new Set(ids).size).toBe(4);
  });

  it("is a no-op when the count is unchanged", () => {
    const slots = drawSlots(cards, Array(3).fill("animals"));
    expect(resizeSlots(cards, slots, 3, ALL_CATEGORIES)).toEqual(slots);
  });
});

describe("cardsByIds", () => {
  const cards = makeCards({ animals: 5 });

  it("preserves order and marks unknown ids as null", () => {
    const result = cardsByIds(cards, ["animals-3", "nope", "animals-1"]);
    expect(result.map((c) => (c ? c.id : null))).toEqual([
      "animals-3",
      null,
      "animals-1",
    ]);
  });
});
