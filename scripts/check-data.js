// Data integrity check for the card and prompt content.
//
// Run with `npm run check:data`. Exits non-zero on any problem so it can gate a
// build in CI.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const load = (rel) =>
  JSON.parse(readFileSync(resolve(here, "..", rel), "utf8"));

const LANGS = ["de", "en"];
const errors = [];
const warnings = [];

// --- cards ---------------------------------------------------------------

const cardData = load("src/data/cards.json");
const categoryIds = new Set(cardData.categories.map((c) => c.id));

for (const cat of cardData.categories) {
  for (const lang of LANGS) {
    if (!cat.label?.[lang]) errors.push(`Category "${cat.id}" missing ${lang} label`);
  }
}

const seenIds = new Set();
const perCategory = new Map();

for (const card of cardData.cards) {
  if (!card.id) errors.push(`Card without id: ${JSON.stringify(card)}`);
  if (seenIds.has(card.id)) errors.push(`Duplicate card id: ${card.id}`);
  seenIds.add(card.id);

  if (!categoryIds.has(card.category)) {
    errors.push(`Card "${card.id}" has unknown category "${card.category}"`);
  }
  if (!card.emoji) errors.push(`Card "${card.id}" has no emoji`);
  for (const lang of LANGS) {
    if (!card.term?.[lang]) errors.push(`Card "${card.id}" missing ${lang} term`);
  }

  perCategory.set(card.category, (perCategory.get(card.category) || 0) + 1);
}

for (const id of categoryIds) {
  const n = perCategory.get(id) || 0;
  if (n === 0) errors.push(`Category "${id}" has no cards`);
  else if (n < 12) warnings.push(`Category "${id}" has only ${n} cards (< 12)`);
}

// --- prompts -----------------------------------------------------------

const promptData = load("src/data/prompts.json");
const seenPromptIds = new Set();

for (const prompt of promptData.prompts) {
  if (seenPromptIds.has(prompt.id)) errors.push(`Duplicate prompt id: ${prompt.id}`);
  seenPromptIds.add(prompt.id);
  for (const lang of LANGS) {
    if (!prompt.text?.[lang]) {
      errors.push(`Prompt "${prompt.id}" missing ${lang} text`);
      continue;
    }
    const tokens = prompt.text[lang].match(/\{(\w+)\}/g) || [];
    for (const token of tokens) {
      if (token !== "{card}") {
        errors.push(`Prompt "${prompt.id}" (${lang}) has unknown token ${token}`);
      }
    }
  }
}

if (promptData.prompts.length < 15) {
  warnings.push(`Only ${promptData.prompts.length} prompts (< 15)`);
}

// --- report ----------------------------------------------------------

for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error:   ${e}`);

console.log(
  `\n${cardData.cards.length} cards in ${cardData.categories.length} categories, ` +
    `${promptData.prompts.length} prompts`
);

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s) found.`);
  process.exit(1);
}
console.log("Data OK.");
