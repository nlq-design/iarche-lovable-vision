import "@testing-library/jest-dom";

// Mock matchMedia for components using media queries
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock ResizeObserver for components using it
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver
const MockIntersectionObserver = class {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  readonly scrollMargin: string = "";
  constructor(_cb: any, _opts?: any) {}
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
};
(global as any).IntersectionObserver = MockIntersectionObserver;

// Suppress console.error for expected React warnings in tests
const originalError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("Warning: ReactDOM.render")
  ) {
    return;
  }
  originalError.call(console, ...args);
};
