// Shareable draws via the URL hash.
//
// The current draw is serialised into `location.hash` so a link reproduces the
// exact same cards – and their per-slot categories – on another device.
// Language and sound stay in localStorage and are not part of the link.
//
// Format:  #draw=<cat0>,<id0>,<cat1>,<id1>,...
// Example: #draw=animals,animals-fox,all,objects-key,nature,nature-star
//
// Every part is percent-encoded and joined with "," – a character that
// encodeURIComponent always escapes, so it can never clash with a part's value.

const PREFIX = "draw=";
const SEP = ",";

const enc = (value) => encodeURIComponent(value);
const dec = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * @typedef {{ category: string, card: { id: string } }} SlotLike
 */

/**
 * Serialise slots into a hash string (including the leading `#`).
 * @param {SlotLike[]} slots
 * @returns {string}
 */
export function encodeDraw(slots) {
  const parts = [];
  for (const slot of slots) {
    if (!slot.card) continue;
    parts.push(enc(slot.category), enc(slot.card.id));
  }
  return "#" + PREFIX + parts.join(SEP);
}

/**
 * Parse a hash string into `[{ category, id }]`, or `null` when it holds no
 * draw. A trailing unpaired element is ignored.
 * @param {string} hash e.g. `location.hash`
 * @returns {{ category: string, id: string }[] | null}
 */
export function decodeDraw(hash) {
  if (!hash) return null;
  const raw = hash.replace(/^#/, "");
  if (!raw.startsWith(PREFIX)) return null;

  const parts = raw.slice(PREFIX.length).split(SEP).map(dec).filter(Boolean);
  if (parts.length < 2) return null;

  const pairs = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    pairs.push({ category: parts[i], id: parts[i + 1] });
  }
  return pairs;
}

/**
 * Write the draw into the address bar without adding a history entry.
 * @param {SlotLike[]} slots
 */
export function writeDrawToUrl(slots) {
  const hash = encodeDraw(slots);
  if (typeof history !== "undefined" && history.replaceState) {
    history.replaceState(null, "", hash);
  } else if (typeof location !== "undefined") {
    location.hash = hash;
  }
}

/** Read and parse the current `location.hash`. */
export function readDrawFromUrl() {
  if (typeof location === "undefined") return null;
  return decodeDraw(location.hash);
}

/**
 * Copy the current page URL to the clipboard.
 * @returns {Promise<boolean>} whether the copy succeeded
 */
export async function copyCurrentLink() {
  const url = typeof location !== "undefined" ? location.href : "";
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = url;
    area.setAttribute("readonly", "");
    area.style.position = "absolute";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
