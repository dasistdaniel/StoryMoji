import { describe, it, expect, beforeEach, vi } from "vitest";

// Minimal in-memory localStorage so the store can be tested in the node env.
beforeEach(() => {
  const map = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
  });
});

const importFresh = async () => {
  vi.resetModules();
  return import("../src/store.js");
};

describe("createStore", () => {
  it("applies defaults", async () => {
    const { createStore } = await importFresh();
    const store = createStore();
    const state = store.get();
    expect(state.language).toBe("de");
    expect(state.category).toBe("all");
    expect(state.count).toBe(3);
    expect(state.soundEnabled).toBe(false);
    expect(state.hand).toEqual([]);
  });

  it("clamps the count on init and on set", async () => {
    const { createStore } = await importFresh();
    const store = createStore({ count: 99 });
    expect(store.get().count).toBe(6);
    store.set({ count: -4 });
    expect(store.get().count).toBe(1);
  });

  it("persists only whitelisted settings", async () => {
    const { createStore, loadSettings } = await importFresh();
    const store = createStore();
    store.set({ language: "en", hand: [{ id: "x" }] });
    const saved = loadSettings();
    expect(saved.language).toBe("en");
    expect(saved.hand).toBeUndefined();
  });

  it("notifies subscribers and can unsubscribe", async () => {
    const { createStore } = await importFresh();
    const store = createStore();
    const seen = [];
    const off = store.subscribe((s) => seen.push(s.count));
    store.set({ count: 5 });
    off();
    store.set({ count: 2 });
    expect(seen).toEqual([5]);
  });

  it("survives corrupt storage", async () => {
    localStorage.setItem("emoji-cards:v1", "{not json");
    const { loadSettings } = await importFresh();
    expect(loadSettings()).toEqual({});
  });
});
