// Application state with a tiny pub/sub and localStorage persistence.
//
// Persisted settings: language, category, count, soundEnabled.
// Not persisted here: the current hand of cards – that lives in the URL hash
// (see sharing.js) so draws are shareable, and main.js keeps the two in sync.

import { clampCount, ALL_CATEGORIES } from "./deck.js";

const STORAGE_KEY = "emoji-cards:v1";
const PERSISTED_KEYS = ["language", "category", "count", "soundEnabled"];

/**
 * @typedef {Object} State
 * @property {string} language
 * @property {string} category
 * @property {number} count
 * @property {boolean} soundEnabled
 * @property {import("./deck.js").Card[]} hand
 */

/**
 * Read persisted settings from localStorage. Always returns an object; missing
 * or corrupt storage yields `{}`.
 * @returns {Partial<State>}
 */
export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveSettings(state) {
  try {
    const subset = {};
    for (const key of PERSISTED_KEYS) subset[key] = state[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subset));
  } catch {
    // Private mode / storage disabled – the app still works for this session.
  }
}

/**
 * Create the store.
 * @param {Partial<State>} initial
 */
export function createStore(initial = {}) {
  /** @type {State} */
  const state = {
    language: initial.language || "de",
    category: initial.category || ALL_CATEGORIES,
    count: clampCount(initial.count ?? 3),
    soundEnabled: Boolean(initial.soundEnabled),
    hand: initial.hand || [],
  };

  /** @type {Set<(state: State) => void>} */
  const listeners = new Set();

  function emit() {
    for (const listener of listeners) listener(state);
  }

  return {
    /** @returns {Readonly<State>} */
    get() {
      return state;
    },

    /**
     * Merge `patch` into the state, persist settings, notify listeners.
     * @param {Partial<State>} patch
     */
    set(patch) {
      Object.assign(state, patch);
      if ("count" in patch) state.count = clampCount(state.count);
      saveSettings(state);
      emit();
    },

    /**
     * Subscribe to state changes. Returns an unsubscribe function.
     * @param {(state: State) => void} listener
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
