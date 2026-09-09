import { describe, it, expect, beforeEach, vi } from "vitest";

// Minimal in-memory localStorage so the store can be tested in the node env.
let backing;
beforeEach(() => {
  backing = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => backing.set(k, String(v)),
    removeItem: (k) => backing.delete(k),
    clear: () => backing.clear(),
  });
});

const importFresh = async () => {
  vi.resetModules();
  return import("../src/store.js");
};

describe("createStore", () => {
  it("starts from the initial state", async () => {
    const { createStore } = await importFresh();
    const store = createStore({ a: 1, b: "x" });
    expect(store.get()).toEqual({ a: 1, b: "x" });
  });

  it("merges patches on set", async () => {
    const { createStore } = await importFresh();
    const store = createStore({ a: 1, b: 2 });
    store.set({ b: 9 });
    expect(store.get()).toEqual({ a: 1, b: 9 });
  });

  it("persists only what the persist() function returns", async () => {
    const { createStore, loadSettings } = await importFresh();
    const store = createStore(
      { language: "de", secret: 42, slots: [] },
      { persist: (s) => ({ language: s.language }) }
    );
    store.set({ language: "en", secret: 7 });
    expect(loadSettings()).toEqual({ language: "en" });
  });

  it("does not persist at all without a persist() function", async () => {
    const { createStore, loadSettings } = await importFresh();
    const store = createStore({ a: 1 });
    store.set({ a: 2 });
    expect(loadSettings()).toEqual({});
  });

  it("notifies subscribers and can unsubscribe", async () => {
    const { createStore } = await importFresh();
    const store = createStore({ n: 0 });
    const seen = [];
    const off = store.subscribe((s) => seen.push(s.n));
    store.set({ n: 1 });
    off();
    store.set({ n: 2 });
    expect(seen).toEqual([1]);
  });

  it("survives corrupt storage", async () => {
    backing.set("emoji-cards:v1", "{not json");
    const { loadSettings } = await importFresh();
    expect(loadSettings()).toEqual({});
  });
});
