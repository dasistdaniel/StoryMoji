// Minimal DOM helpers – enough to build the UI without a framework.

/**
 * Create an element.
 * @param {string} tag
 * @param {Record<string, any>} [attrs] properties/attributes; `class`, `text`,
 *   `html`, `dataset`, and `on*` event handlers are handled specially
 * @param {(Node | string | null | false | undefined)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "style") node.setAttribute("style", value);
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key.includes("-")) {
      // Hyphenated keys (aria-*, custom attrs) are always plain attributes.
      node.setAttribute(key, value);
    } else if (key in node) {
      node[key] = value;
    } else {
      node.setAttribute(key, value);
    }
  }

  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(
      child.nodeType ? child : document.createTextNode(String(child))
    );
  }
  return node;
}

/** Remove all children of a node. */
export function clear(node) {
  node.replaceChildren();
}

/**
 * Render an emoji for display.
 *
 * This is the ONLY place the app turns an emoji string into DOM. Keeping it in
 * one function means a future switch to hosted Twemoji SVGs (for a consistent
 * look across devices) needs no changes anywhere else – see PROJEKTBESCHREIBUNG
 * section 6.1.
 *
 * @param {string} emoji native unicode emoji
 * @returns {HTMLElement}
 */
export function renderEmoji(emoji) {
  return el("span", { class: "emoji", role: "img", "aria-hidden": "true" }, [
    emoji,
  ]);
}

/**
 * A colourful letter tile for the "letters" category.
 *
 * Lone regional-indicator symbols (used as A-Z card emoji, e.g. "🇳") render as
 * a plain, uncoloured glyph on several platforms/fonts instead of a keycap-like
 * tile, so this builds the same visual with CSS instead of relying on the glyph.
 */
export function renderLetterTile(letter) {
  return el("span", { class: "emoji letter-tile", role: "img", "aria-hidden": "true" }, [
    el("span", { class: "letter-tile__glyph" }, [letter]),
  ]);
}
