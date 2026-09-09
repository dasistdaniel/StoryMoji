import { describe, it, expect, afterEach } from "vitest";
import { setEnabled, isEnabled, play } from "../src/sound.js";

afterEach(() => setEnabled(false));

describe("sound", () => {
  it("is disabled by default", () => {
    expect(isEnabled()).toBe(false);
  });

  it("tracks the enabled flag", () => {
    setEnabled(true);
    expect(isEnabled()).toBe(true);
    setEnabled(0);
    expect(isEnabled()).toBe(false);
  });

  it("never throws, with or without an AudioContext", () => {
    expect(() => play("draw")).not.toThrow();
    setEnabled(true);
    expect(() => play("draw")).not.toThrow();
    expect(() => play("does-not-exist")).not.toThrow();
  });
});
