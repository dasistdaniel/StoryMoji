// StoryMoji – app entry point.
//
// Wires the pure logic modules (deck, i18n, prompts, sharing, sound) to the DOM.
//
// Each card sits in a "slot" with its own category. The slots (their categories
// and drawn cards) are mirrored into the URL hash so a link reproduces the exact
// same draw; language, sound and the slot categories are also kept in
// localStorage via the store.

import "./style.css";
import cardData from "./data/cards.json";
import {
  ALL_CATEGORIES,
  MIN_CARDS,
  MAX_CARDS,
  clampCount,
  drawOne,
  drawSlots,
  redrawSlot,
  reshuffleSlots,
  reshuffleCategories,
  resizeSlots,
  cardsByIds,
} from "./deck.js";
import { createStore, loadSettings } from "./store.js";
import {
  createTranslator,
  resolveLanguage,
  SUPPORTED_LANGUAGES,
} from "./i18n.js";
import { randomPrompt, renderPrompt } from "./prompts.js";
import { readDrawFromUrl, writeDrawToUrl, copyCurrentLink } from "./sharing.js";
import * as sound from "./sound.js";
import { el, clear, renderEmoji } from "./ui/dom.js";

const CARDS = cardData.cards;
const CATEGORIES = cardData.categories;
const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));
const DEFAULT_SLOT_COUNT = 3;

/** Coerce a stored/URL category into a known id or the "all" sentinel. */
function normalizeCategory(id) {
  return CATEGORY_BY_ID.has(id) || id === ALL_CATEGORIES ? id : ALL_CATEGORIES;
}

/**
 * Build slots from `[{ category, id }]` pairs (from the URL). Unknown card ids
 * are replaced with a fresh draw from that slot's category.
 * @param {{ category: string, id: string }[]} pairs
 */
function slotsFromPairs(pairs) {
  const trimmed = pairs.slice(0, MAX_CARDS);
  const found = cardsByIds(
    CARDS,
    trimmed.map((p) => p.id)
  );
  const used = new Set();
  return trimmed.map((pair, i) => {
    const category = normalizeCategory(pair.category);
    let card = found[i];
    if (!card) card = drawOne(CARDS, category, used);
    if (card) used.add(card.id);
    return { category, card };
  });
}

// --- initial state ---------------------------------------------------------

const saved = loadSettings();

const store = createStore(
  {
    language:
      saved.language ||
      resolveLanguage(
        typeof navigator !== "undefined" ? navigator.languages : []
      ),
    soundEnabled: Boolean(saved.soundEnabled),
    revealMode: Boolean(saved.revealMode),
    slots: [],
  },
  {
    persist: (s) => ({
      language: s.language,
      soundEnabled: s.soundEnabled,
      revealMode: s.revealMode,
      slotCategories: s.slots.map((slot) => slot.category),
    }),
  }
);

const fromUrl = readDrawFromUrl();
if (fromUrl && fromUrl.length) {
  // A shared link is meant to be seen – restore its cards face-up.
  store.set({
    slots: slotsFromPairs(fromUrl).map((s) => ({ ...s, revealed: true })),
  });
} else {
  const savedCats =
    Array.isArray(saved.slotCategories) && saved.slotCategories.length
      ? saved.slotCategories.slice(0, MAX_CARDS)
      : Array(DEFAULT_SLOT_COUNT).fill(ALL_CATEGORIES);
  store.set({ slots: drawSlots(CARDS, savedCats.map(normalizeCategory)) });
}

sound.setEnabled(store.get().soundEnabled);

// --- rendering -----------------------------------------------------------

const root = document.getElementById("app");
let t = createTranslator(store.get().language);

/** Idea panel state, kept outside the store (transient UI only). */
let currentPrompt = null;

// render() rebuilds the whole tree, so to keep the "deal" animation from
// replaying on every card, we remember what was on the table last time and only
// animate the cards / idea panel that actually changed.
let prevCardIds = [];
let prevPromptId = null;
let prevCovered = [];

function categoryLabel(id) {
  if (id === ALL_CATEGORIES) return t("controls.category.all");
  const cat = CATEGORY_BY_ID.get(id);
  return cat ? cat.label[store.get().language] || cat.label.de : id;
}

function accentFor(slot) {
  const catId = slot.card ? slot.card.category : slot.category;
  return CATEGORY_BY_ID.get(catId)?.color || "var(--line)";
}

function syncUrl() {
  writeDrawToUrl(store.get().slots);
}

/** Persist new slots, play a sound, update the shareable URL. */
function commitSlots(slots, soundName) {
  store.set({ slots });
  if (soundName) sound.play(soundName);
  syncUrl();
}

// --- event handlers ----------------------------------------------------

/** Whether a slot is frozen (its 📌 pin is on). */
const isPinned = (slot) => Boolean(slot.pinned);

/** Whether a slot is currently face-down (reveal mode on and not yet revealed). */
function isCovered(slot) {
  return store.get().revealMode && !slot.revealed;
}

/**
 * In reveal mode, turn freshly drawn slots face-down (pinned ones keep whatever
 * state they had). Outside reveal mode this is a no-op.
 */
function coverFresh(slots) {
  if (!store.get().revealMode) return slots;
  return slots.map((s) => (s.pinned ? s : { ...s, revealed: false }));
}

/**
 * Tap a card: in reveal mode a face-down card flips open; otherwise (or once
 * open) it redraws from its own slot category. No-op while pinned.
 */
function handleCardTap(index) {
  const { slots } = store.get();
  const slot = slots[index];
  if (slot.pinned) return;

  const next = slots.slice();
  if (isCovered(slot)) {
    next[index] = { ...slot, revealed: true };
    store.set({ slots: next }); // reveal state is transient – not in the URL
    sound.play("redraw");
    return;
  }
  next[index] = {
    ...slot,
    card: redrawSlot(CARDS, slots, index),
    revealed: true,
  };
  commitSlots(next, "redraw");
}

/** Toggle the 📌 pin that freezes a slot against the shuffle buttons. */
function handleTogglePin(index) {
  const { slots } = store.get();
  const next = slots.slice();
  next[index] = { ...next[index], pinned: !next[index].pinned };
  store.set({ slots: next }); // pins are transient – not in the URL
}

/** Toggle reveal mode; turning it on never hides what is already on screen. */
function handleToggleRevealMode() {
  const revealMode = !store.get().revealMode;
  const slots = revealMode
    ? store.get().slots.map((s) => ({ ...s, revealed: true }))
    : store.get().slots;
  store.set({ revealMode, slots });
}

/** Change one slot's category and draw a matching card for it. */
function handleSlotCategory(index, value) {
  const category = normalizeCategory(value);
  const { slots } = store.get();
  if (slots[index].pinned) return;
  const next = slots.slice();
  next[index] = { ...next[index], category };
  next[index] = {
    ...next[index],
    card: redrawSlot(CARDS, next, index),
    revealed: true,
  };
  commitSlots(next, "draw");
}

/** Redraw every card from its own slot category (pinned slots stay). */
function handleShuffle() {
  const next = coverFresh(reshuffleSlots(CARDS, store.get().slots, isPinned));
  commitSlots(next, "shuffle");
}

/** Assign a fresh random category to every slot (pinned slots stay). */
function handleShuffleCategories() {
  const next = coverFresh(
    reshuffleCategories(
      CARDS,
      store.get().slots,
      CATEGORIES.map((cat) => cat.id),
      isPinned
    )
  );
  commitSlots(next, "shuffle");
}

/** Change how many cards are on the table (existing slots are kept). */
function handleCount(nextCount) {
  const clamped = clampCount(nextCount);
  const { slots } = store.get();
  const fallback = slots.length
    ? slots[slots.length - 1].category
    : ALL_CATEGORIES;
  commitSlots(resizeSlots(CARDS, slots, clamped, fallback), "draw");
}

function handleLanguage(nextLang) {
  if (!SUPPORTED_LANGUAGES.includes(nextLang)) return;
  t = createTranslator(nextLang);
  store.set({ language: nextLang });
}

function handleSoundToggle() {
  const soundEnabled = !store.get().soundEnabled;
  sound.setEnabled(soundEnabled);
  store.set({ soundEnabled });
  if (soundEnabled) sound.play("redraw");
}

function handleIdea(next = false) {
  const previousId = next && currentPrompt ? currentPrompt.id : null;
  currentPrompt = randomPrompt(previousId);
  render(); // idea panel state lives outside the store
}

function closeIdea() {
  currentPrompt = null;
  render();
}

let shareBtnFeedback = "";
let shareFeedbackTimer = 0;

async function handleShare() {
  syncUrl();
  const ok = await copyCurrentLink();
  const message = ok ? t("share.copied") : t("share.failed");
  announce(message);
  shareBtnFeedback = message;
  render(); // transient button feedback, not stored
  window.clearTimeout(shareFeedbackTimer);
  shareFeedbackTimer = window.setTimeout(() => {
    shareBtnFeedback = "";
    render();
  }, 2500);
}

// --- DOM builders -----------------------------------------------------

/** <option> list for a category <select>, with `selected` preselected. */
function categoryOptions(selected) {
  const lang = store.get().language;
  return [
    el("option", { value: ALL_CATEGORIES }, [t("controls.category.all")]),
    ...CATEGORIES.map((cat) =>
      el("option", { value: cat.id }, [cat.label[lang] || cat.label.de])
    ),
  ].map((opt) => {
    if (opt.value === selected) opt.selected = true;
    return opt;
  });
}

function buildCard(slot, index) {
  const lang = store.get().language;
  const card = slot.card;
  const pinned = Boolean(slot.pinned);
  const covered = isCovered(slot);
  const term = card ? card.term[lang] || card.term.de : "…";
  const n = String(index + 1);

  const select = el(
    "select",
    {
      class: "card__cat",
      disabled: pinned,
      "aria-label": t("card.category.aria", { n }),
      onChange: (e) => handleSlotCategory(index, e.target.value),
    },
    categoryOptions(slot.category)
  );
  select.value = slot.category;

  const pin = el(
    "button",
    {
      class: "card__pin" + (pinned ? " is-pinned" : ""),
      type: "button",
      "aria-pressed": String(pinned),
      "aria-label": t(pinned ? "card.unpin" : "card.pin", { n }),
      title: t(pinned ? "card.unpin" : "card.pin", { n }),
      onClick: () => handleTogglePin(index),
    },
    ["📌"]
  );

  const face = el(
    "button",
    {
      class: "card__face" + (covered ? " card__face--covered" : ""),
      type: "button",
      disabled: pinned,
      "aria-label": covered
        ? t("card.covered", { n })
        : t("card.aria", {
            term,
            category: categoryLabel(card ? card.category : slot.category),
          }),
      title: pinned || covered ? "" : t("card.redraw", { term }),
      onClick: () => handleCardTap(index),
    },
    covered
      ? [el("span", { class: "card__back", "aria-hidden": "true" }, ["?"])]
      : [
          renderEmoji(card ? card.emoji : "❓"),
          el("span", { class: "card__term" }, [term]),
        ]
  );

  // Only newly dealt cards get the pop animation (see prevCardIds).
  const dealt = card && prevCardIds[index] !== card.id;
  // A card that was face-down last render and is open now flips in.
  const flipped = prevCovered[index] && !covered;

  return el(
    "div",
    {
      class:
        "card" +
        (dealt ? " card--dealt" : "") +
        (pinned ? " card--pinned" : "") +
        (covered ? " card--covered" : "") +
        (flipped ? " card--flip" : ""),
      style: `--accent:${accentFor(slot)}`,
      role: "listitem",
    },
    [el("div", { class: "card__top" }, [select, pin]), face]
  );
}

function buildGrid() {
  const { slots } = store.get();
  const grid = el("div", {
    class: "grid",
    dataset: { count: String(slots.length) },
    role: "list",
  });
  slots.forEach((slot, i) => grid.append(buildCard(slot, i)));
  return grid;
}

function buildCountControl() {
  const count = store.get().slots.length;
  const buttons = [];
  for (let n = MIN_CARDS; n <= MAX_CARDS; n++) {
    buttons.push(
      el(
        "button",
        {
          class: "chip" + (n === count ? " chip--active" : ""),
          type: "button",
          "aria-pressed": String(n === count),
          "aria-label": t("controls.count.set", { n: String(n) }),
          onClick: () => handleCount(n),
        },
        [String(n)]
      )
    );
  }
  return el("section", { class: "controls" }, [
    el("div", { class: "control" }, [
      el("span", { class: "control__label" }, [t("controls.count.label")]),
      el("div", { class: "chips" }, buttons),
    ]),
  ]);
}

function buildActions() {
  const shareBtn = el(
    "button",
    { class: "btn", type: "button", onClick: () => handleShare() },
    ["🔗 ", t("controls.share")]
  );
  if (shareBtnFeedback) {
    clear(shareBtn);
    shareBtn.append("✅ ", shareBtnFeedback);
  }

  return el("div", { class: "actions" }, [
    el(
      "button",
      { class: "btn btn--primary", type: "button", onClick: handleShuffle },
      ["🔀 ", t("controls.shuffle")]
    ),
    el(
      "button",
      { class: "btn", type: "button", onClick: handleShuffleCategories },
      ["🎲 ", t("controls.shuffleCategories")]
    ),
    el(
      "button",
      { class: "btn", type: "button", onClick: () => handleIdea(false) },
      ["💡 ", t("controls.idea")]
    ),
    shareBtn,
  ]);
}

function buildTopBar() {
  const { language, soundEnabled, revealMode } = store.get();
  const langToggle = el(
    "div",
    { class: "segmented", role: "group", "aria-label": t("controls.language") },
    SUPPORTED_LANGUAGES.map((code) =>
      el(
        "button",
        {
          class: "segmented__btn" + (code === language ? " is-active" : ""),
          type: "button",
          "aria-pressed": String(code === language),
          onClick: () => handleLanguage(code),
        },
        [code.toUpperCase()]
      )
    )
  );

  const soundBtn = el(
    "button",
    {
      class: "icon-btn" + (soundEnabled ? " is-active" : ""),
      type: "button",
      "aria-pressed": String(soundEnabled),
      "aria-label": soundEnabled
        ? t("controls.sound.on")
        : t("controls.sound.off"),
      onClick: handleSoundToggle,
    },
    [soundEnabled ? "🔊" : "🔈"]
  );

  const revealBtn = el(
    "button",
    {
      class: "icon-btn" + (revealMode ? " is-active" : ""),
      type: "button",
      "aria-pressed": String(revealMode),
      "aria-label": revealMode
        ? t("controls.reveal.on")
        : t("controls.reveal.off"),
      title: revealMode ? t("controls.reveal.on") : t("controls.reveal.off"),
      onClick: handleToggleRevealMode,
    },
    ["🃏"]
  );

  return el("header", { class: "topbar" }, [
    el("div", { class: "brand" }, [
      el("span", { class: "brand__mark", "aria-hidden": "true" }, ["🎴"]),
      el("h1", { class: "brand__title" }, [t("app.title")]),
    ]),
    el("div", { class: "topbar__tools" }, [revealBtn, soundBtn, langToggle]),
  ]);
}

function buildIdeaPanel() {
  if (!currentPrompt) return null;
  const { language, slots } = store.get();
  const hand = slots.map((slot) => slot.card).filter(Boolean);
  const text = renderPrompt(currentPrompt, language, hand);
  const fresh = currentPrompt.id !== prevPromptId;
  return el(
    "div",
    {
      class: "idea" + (fresh ? " idea--new" : ""),
      role: "region",
      "aria-label": t("idea.title"),
    },
    [
      el("div", { class: "idea__inner" }, [
        el("span", { class: "idea__icon", "aria-hidden": "true" }, ["💡"]),
        el("p", { class: "idea__text" }, [text]),
        el("div", { class: "idea__buttons" }, [
          el(
            "button",
            {
              class: "btn btn--small",
              type: "button",
              onClick: () => handleIdea(true),
            },
            [t("controls.idea.next")]
          ),
          el(
            "button",
            {
              class: "btn btn--small btn--ghost",
              type: "button",
              onClick: closeIdea,
            },
            [t("idea.close")]
          ),
        ]),
      ]),
    ]
  );
}

/**
 * Footer: attribution + a link to the (static, no-JS-required) privacy
 * policy page. No cookies/tracking are used, but server logs and localStorage
 * are covered there – see public/datenschutz.html.
 */
function buildFooter() {
  return el("footer", { class: "footer" }, [
    el("span", {}, [t("footer.madeWith")]),
    el("span", { class: "footer__sep", "aria-hidden": "true" }, ["·"]),
    el("a", { class: "footer__link", href: "./datenschutz.html" }, [
      t("footer.privacy"),
    ]),
    el("span", { class: "footer__sep", "aria-hidden": "true" }, ["·"]),
    el(
      "a",
      {
        class: "footer__link",
        href: "https://github.com/dasistdaniel/StoryMoji",
        target: "_blank",
        rel: "noopener noreferrer",
      },
      [t("footer.github")],
    ),
  ]);
}

// --- announcements (screen readers) --------------------------------

let liveRegion;
function announce(message) {
  if (!liveRegion) return;
  liveRegion.textContent = "";
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 30);
}

// --- top-level render ---------------------------------------------

function render() {
  clear(root);
  document.documentElement.lang = store.get().language;
  document.title = t("app.title");

  liveRegion = el("div", {
    class: "sr-only",
    "aria-live": "polite",
    role: "status",
  });

  root.append(
    buildTopBar(),
    el("p", { class: "tagline" }, [t("app.tagline")]),
    el("main", { class: "stage" }, [buildGrid(), buildIdeaPanel()]),
    buildCountControl(),
    buildActions(),
    buildFooter(),
    liveRegion
  );

  // Snapshot what we just drew so the next render only animates real changes.
  prevCardIds = store.get().slots.map((slot) => slot.card?.id);
  prevCovered = store.get().slots.map(isCovered);
  prevPromptId = currentPrompt?.id ?? null;
}

// Handle links opened / navigated to with a different draw in the hash
// (e.g. the browser back button after a share).
window.addEventListener("hashchange", () => {
  const pairs = readDrawFromUrl();
  if (!pairs || !pairs.length) return;
  store.set({
    slots: slotsFromPairs(pairs).map((s) => ({ ...s, revealed: true })),
  });
  // Normalise a legacy readable link to the obfuscated form.
  syncUrl();
});

// Every state change re-renders. Handlers that only touch transient UI state
// (idea panel, share-button feedback) call render() directly.
store.subscribe(() => render());

render();
syncUrl();
