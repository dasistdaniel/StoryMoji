import { describe, it, expect } from "vitest";
import { encodeDraw, decodeDraw } from "../src/sharing.js";

const slots = [
  { category: "animals", card: { id: "animals-fox" } },
  { category: "all", card: { id: "objects-key" } },
  { category: "nature", card: { id: "nature-star" } },
];

describe("encodeDraw / decodeDraw", () => {
  it("round-trips slots into category/id pairs", () => {
    const hash = encodeDraw(slots);
    expect(decodeDraw(hash)).toEqual([
      { category: "animals", id: "animals-fox" },
      { category: "all", id: "objects-key" },
      { category: "nature", id: "nature-star" },
    ]);
  });

  it("produces a comma-separated alternating list", () => {
    expect(encodeDraw(slots)).toBe(
      "#draw=animals,animals-fox,all,objects-key,nature,nature-star"
    );
  });

  it("skips slots without a card", () => {
    const withGap = [slots[0], { category: "food", card: null }, slots[2]];
    expect(decodeDraw(encodeDraw(withGap))).toEqual([
      { category: "animals", id: "animals-fox" },
      { category: "nature", id: "nature-star" },
    ]);
  });

  it("returns null for unrelated hashes", () => {
    expect(decodeDraw("")).toBeNull();
    expect(decodeDraw("#")).toBeNull();
    expect(decodeDraw("#section-2")).toBeNull();
    expect(decodeDraw("#draw=lonely")).toBeNull();
  });

  it("tolerates a missing leading # and a trailing unpaired element", () => {
    expect(decodeDraw("draw=animals,animals-fox,all")).toEqual([
      { category: "animals", id: "animals-fox" },
    ]);
  });

  it("survives odd characters via encodeURIComponent", () => {
    const weird = [{ category: "x,y", card: { id: "a,b~c d" } }];
    expect(decodeDraw(encodeDraw(weird))).toEqual([
      { category: "x,y", id: "a,b~c d" },
    ]);
  });
});
