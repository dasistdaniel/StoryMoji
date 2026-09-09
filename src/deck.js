// Card drawing logic.
//
// These functions are pure: they take the full card list plus a few parameters
// and return new card selections. No DOM, no global state – so they are easy to
// unit test. The UI layer decides what to do with the results.

import { shuffle, randomInt } from "./rng.js";

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
 * Pick `count` cards from `pool`.
 *
 * Cards are drawn without replacement, so they are unique as long as the pool is
 * large enough. If the pool is smaller than `count`, every card is used once and
 * the remaining slots are filled with additional random cards (which then
 * repeat). Callers can detect this via {@link hasEnoughCards}.
 *
 * @param {Card[]} pool
 * @param {number} count already clamped, see {@link clampCount}
 * @param {() => number} [rng]
 * @returns {Card[]}
 */
export function pickCards(pool, count, rng) {
  if (pool.length === 0) return [];
  const shuffled = shuffle(pool, rng);
  const result = shuffled.slice(0, count);
  while (result.length < count) {
    // Pool exhausted – allow repeats to still fill the requested amount.
    result.push(shuffled[randomInt(shuffled.length, rng)]);
  }
  return result;
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
 * Draw a fresh hand of cards for the given category.
 * @param {Card[]} cards full card list
 * @param {string} category
 * @param {number} count
 * @param {() => number} [rng]
 * @returns {Card[]}
 */
export function drawHand(cards, category, count, rng) {
  return pickCards(poolFor(cards, category), clampCount(count), rng);
}

/**
 * Replace a single card in an existing hand with a new random one.
 *
 * The replacement avoids the cards currently in the hand (so tapping a card
 * always visibly changes it) as long as the pool is big enough. If every card
 * in the pool is already on the table, any random card is returned.
 *
 * @param {Card[]} cards full card list
 * @param {string} category
 * @param {Card[]} hand current hand
 * @param {number} index position in `hand` to replace
 * @param {() => number} [rng]
 * @returns {Card} the new card (caller splices it into the hand)
 */
export function redrawCard(cards, category, hand, index, rng) {
  const pool = poolFor(cards, category);
  if (pool.length === 0) return hand[index];

  const usedIds = new Set(hand.map((card) => card.id));
  const candidates = pool.filter((card) => !usedIds.has(card.id));
  const source = candidates.length > 0 ? candidates : pool;
  return source[randomInt(source.length, rng)];
}

/**
 * Return `howMany` extra cards to append to an existing hand, preferring cards
 * not already on the table. Used when the card count is increased so the cards
 * that are already showing stay put (see FR-6).
 * @param {Card[]} cards full card list
 * @param {string} category
 * @param {Card[]} hand current hand
 * @param {number} howMany
 * @param {() => number} [rng]
 * @returns {Card[]}
 */
export function additionalCards(cards, category, hand, howMany, rng) {
  const pool = poolFor(cards, category);
  if (pool.length === 0 || howMany <= 0) return [];

  const usedIds = new Set(hand.map((card) => card.id));
  const fresh = shuffle(
    pool.filter((card) => !usedIds.has(card.id)),
    rng
  );
  const result = fresh.slice(0, howMany);
  while (result.length < howMany) {
    result.push(pool[randomInt(pool.length, rng)]);
  }
  return result;
}

/**
 * Look up cards by id, preserving the order of `ids`. Unknown ids are dropped.
 * @param {Card[]} cards full card list
 * @param {string[]} ids
 * @returns {Card[]}
 */
export function cardsByIds(cards, ids) {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}
