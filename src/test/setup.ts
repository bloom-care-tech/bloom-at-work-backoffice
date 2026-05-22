import * as matchers from "@testing-library/jest-dom/matchers";
import { expect } from "vitest";
import { TEST_API_ORIGIN } from "./msw/handlers";
import { server } from "./msw/server";

expect.extend(matchers);

class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

beforeAll(() => {
  globalThis.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;
  vi.stubEnv("VITE_API_URL", TEST_API_ORIGIN);
  server.listen({ onUnhandledRequest: "warn" });
});

afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
  vi.clearAllMocks();
});

afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.stubEnv("VITE_API_URL", TEST_API_ORIGIN);
});
