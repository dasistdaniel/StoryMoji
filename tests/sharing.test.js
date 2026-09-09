import { describe, it, expect } from "vitest";
import { encodeDraw, decodeDraw } from "../src/sharing.js";

const hand = [
  { id: "animals-fox" },
  { id: "objects-key" },
  { id: "nature-star" },
];

describe("encodeDraw / decodeDraw", () => {
  it("round-trips a draw", () => {
    const hash = encodeDraw({ category: "animals", hand });
    const parsed = decodeDraw(hash);
    expect(parsed).toEqual({
      category: "animals",
      ids: ["animals-fox", "objects-key", "nature-star"],
    });
  });

  it("produces a hash beginning with #draw=", () => {
    expect(encodeDraw({ category: "all", hand })).toMatch(/^#draw=/);
  });

  it("separates parts with commas", () => {
    expect(encodeDraw({ category: "animals", hand })).toBe(
      "#draw=animals,animals-fox,objects-key,nature-star"
    );
  });

  it("returns null for unrelated hashes", () => {
    expect(decodeDraw("")).toBeNull();
    expect(decodeDraw("#")).toBeNull();
    expect(decodeDraw("#section-2")).toBeNull();
    expect(decodeDraw("#draw=onlycategory")).toBeNull();
  });

  it("tolerates a missing leading #", () => {
    expect(decodeDraw("draw=all,animals-fox")).toEqual({
      category: "all",
      ids: ["animals-fox"],
    });
  });

  it("survives odd characters via encodeURIComponent", () => {
    const weird = [{ id: "a,b~c d" }];
    const hash = encodeDraw({ category: "x y", hand: weird });
    expect(decodeDraw(hash)).toEqual({ category: "x y", ids: ["a,b~c d"] });
  });
});
