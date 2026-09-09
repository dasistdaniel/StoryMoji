import { describe, it, expect } from "vitest";
import { PROMPTS, renderPrompt, randomPrompt } from "../src/prompts.js";

const hand = [
  { id: "a", emoji: "🦊", term: { de: "Fuchs", en: "Fox" } },
  { id: "b", emoji: "🔑", term: { de: "Schlüssel", en: "Key" } },
  { id: "c", emoji: "⭐", term: { de: "Stern", en: "Star" } },
];

describe("renderPrompt", () => {
  it("returns the plain text when there are no card tokens", () => {
    const prompt = {
      id: "x",
      text: { de: "Ohne Platzhalter", en: "No token" },
    };
    expect(renderPrompt(prompt, "de", hand)).toBe("Ohne Platzhalter");
  });

  it("fills a single {card} token with a term from the hand", () => {
    const prompt = {
      id: "x",
      text: { de: "Suche nach {card}.", en: "Find {card}." },
    };
    const out = renderPrompt(prompt, "en", hand, () => 0);
    expect(["Fox", "Key", "Star"].some((term) => out === `Find ${term}.`)).toBe(
      true
    );
  });

  it("uses distinct terms for multiple tokens when possible", () => {
    const prompt = {
      id: "x",
      text: { de: "{card} und {card}", en: "{card} and {card}" },
    };
    const out = renderPrompt(prompt, "en", hand, () => 0);
    const [left, right] = out.split(" and ");
    expect(left).not.toBe(right);
  });

  it("localises terms", () => {
    const prompt = {
      id: "x",
      text: { de: "Nimm {card}.", en: "Take {card}." },
    };
    const de = renderPrompt(prompt, "de", hand, () => 0);
    expect(
      ["Fuchs", "Schlüssel", "Stern"].some((t) => de === `Nimm ${t}.`)
    ).toBe(true);
  });
});

describe("randomPrompt", () => {
  it("returns a prompt from the list", () => {
    const prompt = randomPrompt();
    expect(PROMPTS).toContainEqual(prompt);
  });

  it("avoids repeating the previous prompt", () => {
    const first = PROMPTS[0];
    for (let i = 0; i < 20; i++) {
      expect(randomPrompt(first.id).id).not.toBe(first.id);
    }
  });
});
