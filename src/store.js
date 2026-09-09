// Application state with a tiny pub/sub and localStorage persistence.
//
// The store itself is generic: it holds a state object, notifies subscribers on
// change, and – if given a `persist` function – writes that function's result to
// localStorage after every change. main.js decides what is worth persisting
// (language, sound, the per-slot categories); the drawn cards live in the URL
// hash instead so draws are shareable (see sharing.js).

const STORAGE_KEY = "emoji-cards:v1";

/**
 * Read the persisted blob from localStorage. Always returns an object; missing
 * or corrupt storage yields `{}`.
 * @returns {Record<string, unknown>}
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

function saveSettings(blob) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
  } catch {
    // Private mode / storage disabled – the app still works for this session.
  }
}

/**
 * Create the store.
 * @template {object} S
 * @param {S} initial initial state
 * @param {{ persist?: (state: S) => Record<string, unknown> }} [options]
 */
export function createStore(initial, { persist } = {}) {
  const state = { ...initial };
  /** @type {Set<(state: S) => void>} */
  const listeners = new Set();

  function emit() {
    for (const listener of listeners) listener(state);
  }

  return {
    /** @returns {Readonly<S>} */
    get() {
      return state;
    },

    /**
     * Merge `patch` into the state, persist, notify listeners.
     * @param {Partial<S>} patch
     */
    set(patch) {
      Object.assign(state, patch);
      if (persist) saveSettings(persist(state));
      emit();
    },

    /**
     * Subscribe to state changes. Returns an unsubscribe function.
     * @param {(state: S) => void} listener
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
