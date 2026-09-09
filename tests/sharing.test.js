import { describe, it, expect } from "vitest";
import { encodeDraw, decodeDraw } from "../src/sharing.js";

const slots = [
  { category: "animals", card: { id: "animals-fox" } },
  { category: "all", card: { id: "objects-key" } },
  { category: "nature", card: { id: "nature-star" } },
];

const pairs = [
  { category: "animals", id: "animals-fox" },
  { category: "all", id: "objects-key" },
  { category: "nature", id: "nature-star" },
];

describe("encodeDraw / decodeDraw", () => {
  it("round-trips slots into category/id pairs", () => {
    expect(decodeDraw(encodeDraw(slots))).toEqual(pairs);
  });

  it("produces an obfuscated #d= hash that does not contain the card ids", () => {
    const hash = encodeDraw(slots);
    expect(hash.startsWith("#d=")).toBe(true);
    expect(hash).not.toContain("animals-fox");
    expect(hash).not.toContain("nature");
  });

  it("skips slots without a card", () => {
    const withGap = [slots[0], { category: "food", card: null }, slots[2]];
    expect(decodeDraw(encodeDraw(withGap))).toEqual([pairs[0], pairs[2]]);
  });

  it("still reads legacy readable #draw= links", () => {
    expect(
      decodeDraw("#draw=animals,animals-fox,all,objects-key,nature,nature-star")
    ).toEqual(pairs);
    expect(decodeDraw("draw=animals,animals-fox,all")).toEqual([pairs[0]]);
  });

  it("returns null for unrelated or malformed hashes", () => {
    expect(decodeDraw("")).toBeNull();
    expect(decodeDraw("#")).toBeNull();
    expect(decodeDraw("#section-2")).toBeNull();
    expect(decodeDraw("#d=@@not base64@@")).toBeNull();
    expect(decodeDraw("#draw=lonely")).toBeNull();
  });

  it("survives odd characters via encodeURIComponent", () => {
    const weird = [{ category: "x,y", card: { id: "a,b~c d" } }];
    expect(decodeDraw(encodeDraw(weird))).toEqual([
      { category: "x,y", id: "a,b~c d" },
    ]);
  });
});
