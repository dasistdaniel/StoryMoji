// Play-idea prompts.
//
// Prompts come from `src/data/prompts.json`. Each prompt text may contain one or
// more `{card}` tokens; those are filled with the terms of cards from the
// current hand so the suggestion talks about what is actually on the table.

import promptData from "./data/prompts.json";
import { interpolate } from "./i18n.js";
import { shuffle, randomItem } from "./rng.js";

export const PROMPTS = promptData.prompts;

/**
 * Count `{card}` tokens in a template.
 * @param {string} template
 * @returns {number}
 */
function countCardTokens(template) {
  return (template.match(/\{card\}/g) || []).length;
}

/**
 * Build the localised text for a prompt, filling `{card}` tokens from `hand`.
 *
 * Distinct cards are used per token where possible; if the prompt needs more
 * cards than the hand holds, terms repeat.
 *
 * @param {object} prompt entry from {@link PROMPTS}
 * @param {string} lang
 * @param {import("./deck.js").Card[]} hand
 * @param {() => number} [rng]
 * @returns {string}
 */
export function renderPrompt(prompt, lang, hand, rng) {
  const template = prompt.text[lang] || prompt.text.de;
  const needed = countCardTokens(template);
  if (needed === 0) return template;

  const terms = shuffle(hand, rng).map(
    (card) => card.term[lang] || card.term.de
  );
  const picks = [];
  for (let i = 0; i < needed; i++) {
    picks.push(terms[i % Math.max(terms.length, 1)] ?? "");
  }
  return interpolate(template, { card: picks });
}

/**
 * Pick a random prompt, optionally different from `previousId`.
 * @param {string | null} [previousId]
 * @param {() => number} [rng]
 * @returns {object} entry from {@link PROMPTS}
 */
export function randomPrompt(previousId = null, rng) {
  const choices =
    PROMPTS.length > 1
      ? PROMPTS.filter((prompt) => prompt.id !== previousId)
      : PROMPTS;
  return randomItem(choices, rng);
}
