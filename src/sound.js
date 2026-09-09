// Gentle sound effects.
//
// Sounds are synthesised with the Web Audio API instead of shipping audio files
// (zero assets, tiny code). They are soft and short so they stay kid-friendly.
// Sound is opt-in: nothing plays until `setEnabled(true)` is called, and the
// AudioContext is created lazily on the first play so it starts after a user
// gesture (browser autoplay policy).

let enabled = false;
/** @type {AudioContext | null} */
let ctx = null;

/** Small named recipes: [frequency in Hz, duration in seconds, type]. */
const VOICES = {
  // A soft two-note "blip" for drawing a fresh hand.
  draw: [
    { freq: 523.25, start: 0, dur: 0.12 },
    { freq: 783.99, start: 0.08, dur: 0.16 },
  ],
  // A single quick note when one card is swapped.
  redraw: [{ freq: 659.25, start: 0, dur: 0.14 }],
  // A little upward flourish for "shuffle all".
  shuffle: [
    { freq: 440.0, start: 0, dur: 0.1 },
    { freq: 587.33, start: 0.06, dur: 0.1 },
    { freq: 880.0, start: 0.12, dur: 0.18 },
  ],
};

/**
 * Turn sound on or off.
 * @param {boolean} value
 */
export function setEnabled(value) {
  enabled = Boolean(value);
}

/** @returns {boolean} */
export function isEnabled() {
  return enabled;
}

function getContext() {
  if (ctx) return ctx;
  const Ctor =
    typeof window !== "undefined"
      ? window.AudioContext || window.webkitAudioContext
      : undefined;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/**
 * Play a named sound. No-op when sound is disabled or unavailable.
 * @param {keyof typeof VOICES} name
 */
export function play(name) {
  if (!enabled) return;
  const voice = VOICES[name];
  if (!voice) return;

  const audio = getContext();
  if (!audio) return;
  if (audio.state === "suspended") audio.resume();

  const now = audio.currentTime;
  for (const note of voice) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = note.freq;

    // Short attack, smooth exponential release – avoids clicks.
    const t0 = now + note.start;
    const t1 = t0 + note.dur;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);

    osc.connect(gain).connect(audio.destination);
    osc.start(t0);
    osc.stop(t1 + 0.02);
  }
}
