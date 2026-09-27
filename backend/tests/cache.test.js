import { describe, it, expect, vi } from "vitest";
import { cacheGet, cacheSet, cacheClear } from "../src/cache.js";

describe("cache", () => {
  it("returns undefined for a missing key", () => {
    cacheClear();
    expect(cacheGet("missing")).toBeUndefined();
  });

  it("returns a cached value before it expires", () => {
    cacheClear();
    cacheSet("k", { a: 1 }, 1000);
    expect(cacheGet("k")).toEqual({ a: 1 });
  });

  it("expires a value after its TTL", () => {
    vi.useFakeTimers();
    cacheClear();
    cacheSet("k", "value", 100);
    vi.advanceTimersByTime(150);
    expect(cacheGet("k")).toBeUndefined();
    vi.useRealTimers();
  });

  it("clears all entries", () => {
    cacheClear();
    cacheSet("a", 1, 1000);
    cacheSet("b", 2, 1000);
    cacheClear();
    expect(cacheGet("a")).toBeUndefined();
    expect(cacheGet("b")).toBeUndefined();
  });
});
