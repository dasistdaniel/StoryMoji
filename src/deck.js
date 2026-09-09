// Card drawing logic.
//
// These functions are pure: they take the full card list plus a few parameters
// and return new card selections. No DOM, no global state – so they are easy to
// unit test. The UI layer decides what to do with the results.
//
// Each card on the table sits in a "slot" that carries its own category, so
// slots are drawn independently (see PROJEKTBESCHREIBUNG section 4.3).

import { randomInt } from "./rng.js";

export const ALL_CATEGORIES = "all";
export const MIN_CARDS = 1;
export const MAX_CARDS = 6;

/**
 * @typedef {Object} Card
 * @property {string} id
 * @property {string} category
 * @property {string} emoji
 * @property {{ [lang: string]: string }} term
 */

/**
 * @typedef {Object} Slot
 * @property {string} category category id this slot draws from ("all" allowed)
 * @property {Card} card the card currently shown in the slot
 */

/**
 * Return the subset of cards belonging to `category`, or all cards when the
 * category is {@link ALL_CATEGORIES} or unknown.
 * @param {Card[]} cards
 * @param {string} category
 * @returns {Card[]}
 */
export function poolFor(cards, category) {
  if (!category || category === ALL_CATEGORIES) return cards.slice();
  return cards.filter((card) => card.category === category);
}

/**
 * Clamp a requested card count into the supported range.
 * @param {number} count
 * @returns {number}
 */
export function clampCount(count) {
  const n = Math.round(Number(count) || 0);
  return Math.min(MAX_CARDS, Math.max(MIN_CARDS, n));
}

/**
 * Whether `pool` has enough distinct cards to satisfy `count` without repeats.
 * @param {Card[]} pool
 * @param {number} count
 * @returns {boolean}
 */
export function hasEnoughCards(pool, count) {
  return pool.length >= count;
}

/**
 * Draw a single card from `category`, avoiding the ids in `excludeIds` when the
 * pool is large enough. Returns `null` only when the category has no cards at
 * all.
 * @param {Card[]} cards full card list
 * @param {string} category
 * @param {Iterable<string>} [excludeIds]
 * @param {() => number} [rng]
 * @returns {Card | null}
 */
export function drawOne(cards, category, excludeIds = [], rng) {
  const pool = poolFor(cards, category);
  if (pool.length === 0) return null;

  const exclude = new Set(excludeIds);
  const candidates = pool.filter((card) => !exclude.has(card.id));
  const source = candidates.length > 0 ? candidates : pool;
  return source[randomInt(source.length, rng)];
}

/**
 * Draw a card for every category in `categories`, keeping the cards distinct
 * across the whole hand where the pools allow it.
 * @param {Card[]} cards full card list
 * @param {string[]} categories one entry per slot
 * @param {() => number} [rng]
 * @returns {Slot[]}
 */
export function drawSlots(cards, categories, rng) {
  const used = new Set();
  return categories.map((category) => {
    const card = drawOne(cards, category, used, rng);
    if (card) used.add(card.id);
    return { category, card };
  });
}

/**
 * Redraw just the card in `slots[index]`, from that slot's own category,
 * avoiding the cards in the other slots.
 * @param {Card[]} cards full card list
 * @param {Slot[]} slots current slots
 * @param {number} index slot to redraw
 * @param {() => number} [rng]
 * @returns {Card} the new card (falls back to the current one if the pool is
 *   empty)
 */
export function redrawSlot(cards, slots, index, rng) {
  const slot = slots[index];
  const othersIds = slots
    .filter((_, i) => i !== index)
    .map((s) => s.card?.id)
    .filter(Boolean);
  return drawOne(cards, slot.category, othersIds, rng) || slot.card;
}

/**
 * Redraw the card in every slot from its own category, keeping the hand as
 * distinct as the pools allow.
 * @param {Card[]} cards full card list
 * @param {Slot[]} slots
 * @param {() => number} [rng]
 * @returns {Slot[]}
 */
export function reshuffleSlots(cards, slots, rng) {
  return drawSlots(
    cards,
    slots.map((slot) => slot.category),
    rng
  );
}

/**
 * Grow or shrink a list of slots to `count` entries. Existing slots (their
 * category and card) are kept; new slots use `defaultCategory` and get a fresh
 * card that avoids the cards already on the table.
 * @param {Card[]} cards full card list
 * @param {Slot[]} slots current slots
 * @param {number} count desired slot count (already clamped)
 * @param {string} defaultCategory category for any new slots
 * @param {() => number} [rng]
 * @returns {Slot[]}
 */
export function resizeSlots(cards, slots, count, defaultCategory, rng) {
  if (count <= slots.length) return slots.slice(0, count);

  const next = slots.slice();
  const used = new Set(next.map((slot) => slot.card?.id).filter(Boolean));
  while (next.length < count) {
    const card = drawOne(cards, defaultCategory, used, rng);
    if (card) used.add(card.id);
    next.push({ category: defaultCategory, card });
  }
  return next;
}

/**
 * Look up cards by id, preserving the order of `ids`. Unknown ids become `null`
 * so callers can keep them aligned with a parallel array (e.g. categories).
 * @param {Card[]} cards full card list
 * @param {string[]} ids
 * @returns {(Card | null)[]}
 */
export function cardsByIds(cards, ids) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return ids.map((id) => byId.get(id) || null);
}
