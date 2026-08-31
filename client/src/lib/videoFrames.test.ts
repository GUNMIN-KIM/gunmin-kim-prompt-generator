import { describe, expect, it } from "vitest";
import { frameCountFor, makeTimestamps } from "./videoFrames";

describe("video frame sampling", () => {
  it("uses the requested Fast, Standard, Detailed sampling densities", () => {
    expect(frameCountFor(8, "fast")).toBe(5);
    expect(frameCountFor(8, "standard")).toBe(6);
    expect(frameCountFor(8, "detailed")).toBe(10);
    expect(frameCountFor(45, "standard")).toBe(14);
    expect(frameCountFor(90, "detailed")).toBe(32);
  });

  it("spreads frames from the beginning to 95% of the full timeline", () => {
    expect(makeTimestamps(20, 5)).toEqual([0, 4.75, 9.5, 14.25, 19]);
  });
});
