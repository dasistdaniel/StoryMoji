// @vitest-environment jsdom
//
// Smoke test for the wired-up app: it boots main.js against a real (jsdom) DOM
// and exercises the per-card category flow end to end.

import { describe, it, expect, beforeEach, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  const map = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  });
  // Deterministic language resolution (jsdom would otherwise report en-US).
  Object.defineProperty(navigator, "languages", {
    value: ["de"],
    configurable: true,
  });
  document.body.innerHTML = '<div id="app"></div>';
  location.hash = "";
});

async function boot() {
  await import("../src/main.js");
  return document.getElementById("app");
}

describe("app boot", () => {
  it("renders the default three cards, each with its own category select", async () => {
    const app = await boot();
    const cards = app.querySelectorAll(".card");
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(card.querySelector("select.card__cat")).not.toBeNull();
      expect(card.querySelector(".card__face .emoji")).not.toBeNull();
      expect(
        card.querySelector(".card__term").textContent.length
      ).toBeGreaterThan(0);
    }
  });

  it("writes the draw (with per-slot categories) into the URL hash", async () => {
    await boot();
    expect(location.hash).toMatch(/^#draw=all,[a-z]+-[a-z0-9-]+,all,/);
  });

  it("changing a card's category redraws only that card into that category", async () => {
    const app = await boot();
    const secondSelect = app.querySelectorAll("select.card__cat")[1];
    const before = [...app.querySelectorAll(".card__term")].map(
      (n) => n.textContent
    );

    secondSelect.value = "animals";
    secondSelect.dispatchEvent(new Event("change", { bubbles: true }));

    const selects = app.querySelectorAll("select.card__cat");
    expect(selects[1].value).toBe("animals");
    // hash now records animals for slot 2
    expect(location.hash.split(",")[2]).toBe("animals");

    const after = [...app.querySelectorAll(".card__term")].map(
      (n) => n.textContent
    );
    expect(after[0]).toBe(before[0]); // other cards untouched
    expect(after[2]).toBe(before[2]);
  });

  it("tapping a card face replaces just that card", async () => {
    const app = await boot();
    const faces = app.querySelectorAll(".card__face");
    const before = [...app.querySelectorAll(".card__term")].map(
      (n) => n.textContent
    );
    faces[0].click();
    const after = [...app.querySelectorAll(".card__term")].map(
      (n) => n.textContent
    );
    expect(after[1]).toBe(before[1]);
    expect(after[2]).toBe(before[2]);
  });

  it("only the redrawn card gets the deal animation class", async () => {
    const app = await boot();
    // first render: every card is freshly dealt
    expect(app.querySelectorAll(".card--dealt")).toHaveLength(3);

    app.querySelectorAll(".card__face")[1].click();

    const dealt = [...app.querySelectorAll(".card")].map((c) =>
      c.classList.contains("card--dealt")
    );
    expect(dealt).toEqual([false, true, false]);
  });

  it("'Kategorien mischen' assigns a fresh random category to every slot", async () => {
    const app = await boot();
    const before = [...app.querySelectorAll("select.card__cat")].map(
      (s) => s.value
    );
    expect(before).toEqual(["all", "all", "all"]);

    const btn = [...app.querySelectorAll(".actions .btn")].find((b) =>
      b.textContent.includes("Kategorien mischen")
    );
    btn.click();

    const after = [...app.querySelectorAll("select.card__cat")].map(
      (s) => s.value
    );
    expect(after).toHaveLength(3);
    expect(after.every((c) => c !== "all")).toBe(true);
    expect(new Set(after).size).toBe(3); // distinct
    // hash records the new categories
    expect(location.hash.split(",")[0]).toBe("#draw=" + after[0]);
  });

  it("increasing the count keeps existing cards and adds new ones", async () => {
    const app = await boot();
    const before = [...app.querySelectorAll(".card__term")].map(
      (n) => n.textContent
    );
    // count chips are the 6 buttons in .chips
    const chip5 = app.querySelectorAll(".chips .chip")[4];
    chip5.click();
    const cards = app.querySelectorAll(".card");
    expect(cards).toHaveLength(5);
    const after = [...app.querySelectorAll(".card__term")].map(
      (n) => n.textContent
    );
    expect(after.slice(0, 3)).toEqual(before);
  });

  it("restores a shared draw from the URL hash", async () => {
    location.hash =
      "#draw=animals,animals-fox,all,objects-key,nature,nature-star";
    const app = await boot();
    const terms = [...app.querySelectorAll(".card__term")].map(
      (n) => n.textContent
    );
    expect(terms).toEqual(["Fuchs", "Schlüssel", "Stern"]);
    const selects = app.querySelectorAll("select.card__cat");
    expect([...selects].map((s) => s.value)).toEqual([
      "animals",
      "all",
      "nature",
    ]);
  });

  it("switching language updates terms without changing the cards", async () => {
    const app = await boot();
    const deTerms = [...app.querySelectorAll(".card__term")].map(
      (n) => n.textContent
    );
    const enButton = [...app.querySelectorAll(".segmented__btn")].find(
      (b) => b.textContent === "EN"
    );
    enButton.click();
    const enTerms = [...app.querySelectorAll(".card__term")].map(
      (n) => n.textContent
    );
    expect(enTerms).not.toEqual(deTerms);
    expect(app.querySelector(".brand__title").textContent).toBe("Emoji Cards");
  });
});
