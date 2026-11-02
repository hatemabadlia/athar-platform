import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "capture.spec.ts",
  timeout: 300_000,
  expect: { timeout: 20_000 },
  workers: 1,
  globalSetup: "../../tests/e2e/global-setup.ts",
  use: { baseURL: "http://localhost:3000", locale: "ar-DZ" },
});
