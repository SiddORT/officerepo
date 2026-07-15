import { defineConfig } from "@playwright/test";
import { execSync } from "child_process";

function resolveChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  try {
    return execSync("which chromium", { encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
}

const chromiumPath = resolveChromiumPath();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    headless: true,
    launchOptions: {
      ...(chromiumPath ? { executablePath: chromiumPath } : {}),
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
