// Emoji Cards – app entry point.
//
// Wires the pure logic modules (deck, i18n, prompts, sharing, sound) to the DOM.
// The current hand of cards is mirrored into the URL hash so a link reproduces
// the exact same draw; everything else (language, category, count, sound) is
// persisted in localStorage via the store.

import "./style.css";
import cardData from "./data/cards.json";
import {
  ALL_CATEGORIES,
  MIN_CARDS,
  MAX_CARDS,
  clampCount,
  drawHand,
  redrawCard,
  additionalCards,
  cardsByIds,
  poolFor,
  hasEnoughCards,
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

// --- initial state -----------------------------------------------------------

const settings = loadSettings();
const store = createStore({
  ...settings,
  language:
    settings.language ||
    resolveLanguage(
      typeof navigator !== "undefined" ? navigator.languages : []
    ),
});

// Restore a shared draw from the URL if present, otherwise draw a fresh hand.
const shared = readDrawFromUrl();
if (shared) {
  const restored = cardsByIds(CARDS, shared.ids);
  const category = CATEGORY_BY_ID.has(shared.category)
    ? shared.category
    : ALL_CATEGORIES;
  const count = clampCount(restored.length || store.get().count);
  const hand =
    restored.length >= count
      ? restored.slice(0, count)
      : restored.concat(
          additionalCards(CARDS, category, restored, count - restored.length)
        );
  store.set({ category, count, hand });
} else {
  const { category, count } = store.get();
  store.set({ hand: drawHand(CARDS, category, count) });
}

sound.setEnabled(store.get().soundEnabled);

// --- rendering --------------------------------------------------------------

const root = document.getElementById("app");
let t = createTranslator(store.get().language);

/** Idea panel state, kept outside the store (transient UI only). */
let currentPrompt = null;

function categoryLabel(id) {
  if (id === ALL_CATEGORIES) return t("controls.category.all");
  const cat = CATEGORY_BY_ID.get(id);
  return cat ? cat.label[store.get().language] || cat.label.de : id;
}

function accentFor(card) {
  return CATEGORY_BY_ID.get(card.category)?.color || "#888";
}

function syncUrl() {
  const { category, hand } = store.get();
  writeDrawToUrl({ category, hand });
}

/** Replace a single card at `index` in the hand. */
function handleCardTap(index) {
  const { category, hand } = store.get();
  const next = hand.slice();
  next[index] = redrawCard(CARDS, category, hand, index);
  store.set({ hand: next });
  sound.play("redraw");
  syncUrl();
}

/** Re-draw the whole hand. */
function handleShuffle() {
  const { category, count } = store.get();
  store.set({ hand: drawHand(CARDS, category, count) });
  sound.play("shuffle");
  syncUrl();
}

/** Change the number of cards, keeping the cards already on the table. */
function handleCount(nextCount) {
  const clamped = clampCount(nextCount);
  const { category, hand } = store.get();
  let nextHand;
  if (clamped <= hand.length) {
    nextHand = hand.slice(0, clamped);
  } else {
    nextHand = hand.concat(
      additionalCards(CARDS, category, hand, clamped - hand.length)
    );
  }
  store.set({ count: clamped, hand: nextHand });
  sound.play("draw");
  syncUrl();
}

/** Change the active category and draw a fresh hand from it. */
function handleCategory(nextCategory) {
  const category = CATEGORY_BY_ID.has(nextCategory)
    ? nextCategory
    : ALL_CATEGORIES;
  store.set({ category, hand: drawHand(CARDS, category, store.get().count) });
  sound.play("draw");
  syncUrl();
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

// --- DOM builders ----------------------------------------------------------

function buildCard(card, index) {
  const lang = store.get().language;
  const term = card.term[lang] || card.term.de;
  return el(
    "button",
    {
      class: "card",
      type: "button",
      style: `--accent:${accentFor(card)}`,
      "aria-label": t("card.aria", {
        term,
        category: categoryLabel(card.category),
      }),
      title: t("card.redraw", { term }),
      onClick: () => handleCardTap(index),
    },
    [renderEmoji(card.emoji), el("span", { class: "card__term" }, [term])]
  );
}

function buildGrid() {
  const { hand, count, category } = store.get();
  const grid = el("div", {
    class: "grid",
    dataset: { count: String(count) },
    role: "list",
  });
  hand.forEach((card, i) => {
    const item = el("div", { class: "grid__item", role: "listitem" }, [
      buildCard(card, i),
    ]);
    grid.append(item);
  });

  const nodes = [grid];
  if (!hasEnoughCards(poolFor(CARDS, category), count)) {
    nodes.push(
      el("p", { class: "notice", role: "note" }, [t("notice.fewCards")])
    );
  }
  return nodes;
}

function buildCountControl() {
  const { count } = store.get();
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
  return el("div", { class: "control" }, [
    el("span", { class: "control__label" }, [t("controls.count.label")]),
    el("div", { class: "chips" }, buttons),
  ]);
}

function buildCategoryControl() {
  const { category } = store.get();
  const options = [
    el("option", { value: ALL_CATEGORIES }, [t("controls.category.all")]),
    ...CATEGORIES.map((cat) =>
      el("option", { value: cat.id }, [
        cat.label[store.get().language] || cat.label.de,
      ])
    ),
  ];
  const select = el(
    "select",
    {
      class: "select",
      value: category,
      "aria-label": t("controls.category.label"),
      onChange: (e) => handleCategory(e.target.value),
    },
    options
  );
  select.value = category;
  return el("div", { class: "control" }, [
    el("span", { class: "control__label" }, [t("controls.category.label")]),
    select,
  ]);
}

function buildActions() {
  const shareBtn = el(
    "button",
    {
      class: "btn",
      type: "button",
      onClick: () => handleShare(),
    },
    ["🔗 ", t("controls.share")]
  );
  // Show the "copied" confirmation inline on the button when present.
  const feedback = shareBtnFeedback;
  if (feedback) {
    clear(shareBtn);
    shareBtn.append("✅ ", feedback);
  }

  return el("div", { class: "actions" }, [
    el(
      "button",
      { class: "btn btn--primary", type: "button", onClick: handleShuffle },
      ["🔀 ", t("controls.shuffle")]
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
  const { language, soundEnabled } = store.get();
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

  return el("header", { class: "topbar" }, [
    el("div", { class: "brand" }, [
      el("span", { class: "brand__mark", "aria-hidden": "true" }, ["🎴"]),
      el("h1", { class: "brand__title" }, [t("app.title")]),
    ]),
    el("div", { class: "topbar__tools" }, [soundBtn, langToggle]),
  ]);
}

function buildIdeaPanel() {
  if (!currentPrompt) return null;
  const { language, hand } = store.get();
  const text = renderPrompt(currentPrompt, language, hand);
  return el(
    "div",
    { class: "idea", role: "region", "aria-label": t("idea.title") },
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

// --- announcements (screen readers) ---------------------------------------

let liveRegion;
function announce(message) {
  if (!liveRegion) return;
  liveRegion.textContent = "";
  window.setTimeout(() => {
    liveRegion.textContent = message;
  }, 30);
}

// --- top-level render -----------------------------------------------------

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
    el("main", { class: "stage" }, [...buildGrid(), buildIdeaPanel()]),
    el("section", { class: "controls" }, [
      buildCountControl(),
      buildCategoryControl(),
    ]),
    buildActions(),
    el("footer", { class: "footer" }, [t("footer.madeWith")]),
    liveRegion
  );
}

// Handle links opened / navigated to with a different draw in the hash
// (e.g. the browser back button after a share).
window.addEventListener("hashchange", () => {
  const next = readDrawFromUrl();
  if (!next) return;
  const restored = cardsByIds(CARDS, next.ids);
  if (restored.length === 0) return;
  store.set({
    category: CATEGORY_BY_ID.has(next.category)
      ? next.category
      : ALL_CATEGORIES,
    count: clampCount(restored.length),
    hand: restored,
  });
});

// Every state change re-renders. Handlers that only touch transient UI state
// (idea panel, share-button feedback) call render() directly.
store.subscribe(() => render());

render();
syncUrl();
