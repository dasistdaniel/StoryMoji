// Shareable draws via the URL hash.
//
// The current draw (category + ordered card ids) is serialised into
// `location.hash` so a link reproduces exactly the same cards on another device.
// The hash is the single source of truth for "which cards"; language and sound
// stay in localStorage and are not part of the link.
//
// Format:  #draw=<category>,<id>,<id>,...
// Example: #draw=animals,animals-fox,objects-key,nature-star
//
// Each part is percent-encoded, and the separator "," is a character that
// encodeURIComponent always escapes, so it can never clash with part contents.

const PREFIX = "draw=";
const SEP = ",";

/**
 * Serialise a draw into a hash string (including the leading `#`).
 * @param {{ category: string, hand: import("./deck.js").Card[] }} draw
 * @returns {string}
 */
export function encodeDraw({ category, hand }) {
  const parts = [category, ...hand.map((card) => card.id)];
  return "#" + PREFIX + parts.map(encodeURIComponent).join(SEP);
}

/**
 * Parse a hash string back into `{ category, ids }`, or `null` when it does not
 * contain a draw.
 * @param {string} hash e.g. `location.hash`
 * @returns {{ category: string, ids: string[] } | null}
 */
export function decodeDraw(hash) {
  if (!hash) return null;
  const raw = hash.replace(/^#/, "");
  if (!raw.startsWith(PREFIX)) return null;

  const parts = raw
    .slice(PREFIX.length)
    .split(SEP)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .filter(Boolean);

  if (parts.length < 2) return null;
  const [category, ...ids] = parts;
  return { category, ids };
}

/**
 * Write the draw into the address bar without adding a history entry.
 * @param {{ category: string, hand: import("./deck.js").Card[] }} draw
 */
export function writeDrawToUrl(draw) {
  const hash = encodeDraw(draw);
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
