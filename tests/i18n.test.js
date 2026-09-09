import { describe, it, expect } from "vitest";
import {
  interpolate,
  resolveLanguage,
  createTranslator,
  DEFAULT_LANGUAGE,
} from "../src/i18n.js";

describe("interpolate", () => {
  it("replaces named tokens", () => {
    expect(interpolate("Hello {name}!", { name: "Mo" })).toBe("Hello Mo!");
  });

  it("leaves unknown tokens untouched", () => {
    expect(interpolate("a {x} b", {})).toBe("a {x} b");
  });

  it("fills repeated tokens from an array in order", () => {
    const out = interpolate("{card} meets {card}", { card: ["Fox", "Key"] });
    expect(out).toBe("Fox meets Key");
  });

  it("reuses the last array value when it runs out", () => {
    const out = interpolate("{card} {card} {card}", { card: ["A", "B"] });
    expect(out).toBe("A B B");
  });
});

describe("resolveLanguage", () => {
  it("picks the first supported language", () => {
    expect(resolveLanguage(["fr-FR", "en-GB", "de"])).toBe("en");
  });

  it("matches on the base tag", () => {
    expect(resolveLanguage(["de-AT"])).toBe("de");
  });

  it("falls back to the default", () => {
    expect(resolveLanguage(["xx", "zz"])).toBe(DEFAULT_LANGUAGE);
    expect(resolveLanguage([])).toBe(DEFAULT_LANGUAGE);
    expect(resolveLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
  });
});

describe("createTranslator", () => {
  it("translates known keys", () => {
    const t = createTranslator("en");
    expect(t("controls.shuffle")).toBe("Shuffle cards");
  });

  it("interpolates params", () => {
    const t = createTranslator("de");
    expect(t("controls.count.set", { n: "3" })).toContain("3");
  });

  it("falls back to the default language, then the key itself", () => {
    const t = createTranslator("en");
    expect(t("totally.unknown.key")).toBe("totally.unknown.key");
  });
});
