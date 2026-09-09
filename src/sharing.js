// Shareable draws via the URL hash.
//
// The current draw is serialised into `location.hash` so a link reproduces the
// exact same cards – and their per-slot categories – on another device.
// Language and sound stay in localStorage and are not part of the link.
//
// Internally a draw is the string  <cat0>,<id0>,<cat1>,<id1>,...  (each part
// percent-encoded, joined with "," which encodeURIComponent always escapes).
// That string is then base64url-encoded so the address bar shows
//   #d=YW5pbWFscyxhbmltYWxzLWZveCxhbGw...
// instead of the readable card ids – a co-player glancing at the URL can't tell
// which cards are on the table. This is obfuscation, not security: anyone can
// still base64-decode it.
//
// Legacy readable links (`#draw=<cat>,<id>,...`) are still accepted on read.

const PREFIX = "d=";
const LEGACY_PREFIX = "draw=";
const SEP = ",";

const enc = (value) => encodeURIComponent(value);
const dec = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** UTF-8 string -> base64url (no padding). */
function toBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url -> UTF-8 string. Throws on malformed input. */
function fromBase64Url(b64) {
  const bin = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/**
 * @typedef {{ category: string, card: { id: string } }} SlotLike
 */

/** Build the plain `<cat>,<id>,...` payload for a set of slots. */
function payloadFor(slots) {
  const parts = [];
  for (const slot of slots) {
    if (!slot.card) continue;
    parts.push(enc(slot.category), enc(slot.card.id));
  }
  return parts.join(SEP);
}

/** Parse a plain `<cat>,<id>,...` payload into pairs (trailing odd part dropped). */
function pairsFromPayload(payload) {
  const parts = payload.split(SEP).map(dec).filter(Boolean);
  if (parts.length < 2) return null;
  const pairs = [];
  for (let i = 0; i + 1 < parts.length; i += 2) {
    pairs.push({ category: parts[i], id: parts[i + 1] });
  }
  return pairs;
}

/**
 * Serialise slots into a hash string (including the leading `#`).
 * @param {SlotLike[]} slots
 * @returns {string}
 */
export function encodeDraw(slots) {
  return "#" + PREFIX + toBase64Url(payloadFor(slots));
}

/**
 * Parse a hash string into `[{ category, id }]`, or `null` when it holds no
 * draw. Accepts both the obfuscated `#d=` form and the legacy `#draw=` form.
 * @param {string} hash e.g. `location.hash`
 * @returns {{ category: string, id: string }[] | null}
 */
export function decodeDraw(hash) {
  if (!hash) return null;
  const raw = hash.replace(/^#/, "");

  if (raw.startsWith(PREFIX)) {
    try {
      return pairsFromPayload(fromBase64Url(raw.slice(PREFIX.length)));
    } catch {
      return null;
    }
  }
  if (raw.startsWith(LEGACY_PREFIX)) {
    return pairsFromPayload(raw.slice(LEGACY_PREFIX.length));
  }
  return null;
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
