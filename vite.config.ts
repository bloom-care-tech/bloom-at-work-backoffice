/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";

/** CI: set SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT, SENTRY_RELEASE for source map upload. Client uses VITE_SENTRY_DSN and VITE_SENTRY_RELEASE. */

const sentryUploadEnabled =
  Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()) &&
  Boolean(process.env.SENTRY_ORG?.trim()) &&
  Boolean(process.env.SENTRY_PROJECT?.trim()) &&
  Boolean(process.env.SENTRY_RELEASE?.trim());

const sentryPlugin = sentryUploadEnabled
  ? sentryVitePlugin({
      org: process.env.SENTRY_ORG!,
      project: process.env.SENTRY_PROJECT!,
      authToken: process.env.SENTRY_AUTH_TOKEN!,
      telemetry: false,
      release: { name: process.env.SENTRY_RELEASE! },
      sourcemaps: {
        assets: "./dist/**",
      },
    })
  : null;

export default defineConfig({
  server: {
    host: "::",
    port: 8081,
    hmr: { overlay: false },
    proxy: {
      "/auth": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/api": { target: "http://127.0.0.1:3000", changeOrigin: true },
      "/admin": { target: "http://127.0.0.1:3000", changeOrigin: true },
    },
  },
  plugins: [react(), sentryPlugin].filter(Boolean),
  build: {
    sourcemap: sentryUploadEnabled ? ("hidden" as const) : false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@bloom-at-work": path.resolve(__dirname, "../bloom-at-work/src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    pool: "forks",
  },
});
