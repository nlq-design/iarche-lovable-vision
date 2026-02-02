/**
 * Example Frontend Test
 * 
 * Validates that the test infrastructure is working correctly.
 */

import { describe, it, expect } from "vitest";

describe("Test Infrastructure", () => {
  it("should pass basic assertion", () => {
    expect(true).toBe(true);
  });

  it("should handle string comparisons", () => {
    expect("hello").toBe("hello");
  });

  it("should handle object equality", () => {
    const obj = { key: "value", nested: { a: 1 } };
    expect(obj).toEqual({ key: "value", nested: { a: 1 } });
  });

  it("should handle array operations", () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });
});

describe("Environment Mocks", () => {
  it("should have matchMedia mocked", () => {
    expect(window.matchMedia).toBeDefined();
    const mq = window.matchMedia("(min-width: 768px)");
    expect(mq.matches).toBe(false);
  });

  it("should have ResizeObserver mocked", () => {
    expect(ResizeObserver).toBeDefined();
    const observer = new ResizeObserver(() => {});
    expect(observer.observe).toBeDefined();
    expect(observer.disconnect).toBeDefined();
  });

  it("should have IntersectionObserver mocked", () => {
    expect(IntersectionObserver).toBeDefined();
    const observer = new IntersectionObserver(() => {});
    expect(observer.observe).toBeDefined();
    expect(observer.disconnect).toBeDefined();
  });
});
