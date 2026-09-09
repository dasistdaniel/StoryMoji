// Tiny internationalisation helper.
//
// Translations live in `src/data/i18n/<lang>.json` as flat key -> string maps.
// Strings may contain `{placeholder}` tokens that are replaced at call time.

import de from "./data/i18n/de.json";
import en from "./data/i18n/en.json";

/** All bundled UI translations, keyed by language code. */
export const TRANSLATIONS = { de, en };

/** Supported language codes, in display order. `de` is the primary language. */
export const SUPPORTED_LANGUAGES = ["de", "en"];
export const DEFAULT_LANGUAGE = "de";

/**
 * Resolve the best supported language for a browser preference list.
 * @param {readonly string[]} preferred e.g. `navigator.languages`
 * @returns {string} a code from {@link SUPPORTED_LANGUAGES}
 */
export function resolveLanguage(preferred) {
  for (const tag of preferred || []) {
    const base = String(tag).toLowerCase().split("-")[0];
    if (SUPPORTED_LANGUAGES.includes(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Substitute `{name}` tokens in a template.
 *
 * When a placeholder appears more than once and `params[name]` is an array, the
 * occurrences are filled in order (first `{card}` -> params.card[0], etc.). A
 * plain value is used for every occurrence.
 *
 * @param {string} template
 * @param {Record<string, string | string[]>} params
 * @returns {string}
 */
export function interpolate(template, params = {}) {
  const cursors = {};
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    if (!(name in params)) return match;
    const value = params[name];
    if (Array.isArray(value)) {
      const i = cursors[name] ?? 0;
      cursors[name] = i + 1;
      return value[i] ?? value[value.length - 1] ?? match;
    }
    return String(value);
  });
}

/**
 * Create a translator bound to a language.
 * @param {string} lang
 * @returns {(key: string, params?: Record<string, string | string[]>) => string}
 */
export function createTranslator(lang) {
  const table = TRANSLATIONS[lang] || TRANSLATIONS[DEFAULT_LANGUAGE];
  return function t(key, params) {
    const template = table[key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
    return params ? interpolate(template, params) : template;
  };
}
