// Random number helpers.
//
// All randomness in the app goes through a `rng` function that returns a float
// in [0, 1) – just like `Math.random`. The default implementation is backed by
// `crypto.getRandomValues` for good quality; tests can inject a deterministic
// stand-in.

/**
 * Cryptographically strong replacement for `Math.random`.
 * @returns {number} float in [0, 1)
 */
export function secureRandom() {
  // Fall back to Math.random in the unlikely case Web Crypto is unavailable.
  const cryptoObj =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") {
    return Math.random();
  }
  const buf = new Uint32Array(1);
  cryptoObj.getRandomValues(buf);
  // Divide by 2^32 to map the 32-bit integer into [0, 1).
  return buf[0] / 0x1_0000_0000;
}

/**
 * Return a random integer in [0, max).
 * @param {number} max exclusive upper bound
 * @param {() => number} [rng]
 * @returns {number}
 */
export function randomInt(max, rng = secureRandom) {
  return Math.floor(rng() * max);
}

/**
 * Pick one random element from a non-empty array.
 * @template T
 * @param {T[]} items
 * @param {() => number} [rng]
 * @returns {T}
 */
export function randomItem(items, rng = secureRandom) {
  return items[randomInt(items.length, rng)];
}

/**
 * Return a shuffled copy of `items` using the Fisher-Yates algorithm.
 * The input array is not modified.
 * @template T
 * @param {T[]} items
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function shuffle(items, rng = secureRandom) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1, rng);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
