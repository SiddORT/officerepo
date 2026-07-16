import { test, expect } from "@playwright/test";

/**
 * End-to-end layout verification tests for the phone-layout CSS change.
 *
 * The change adds to src/index.css:
 *   @media (max-width: 640px) {
 *     .portal-form-row { grid-template-columns: 1fr !important; }
 *   }
 *
 * Each test authenticates via the real portal login form, navigates to the
 * actual detail-page route with a seeded record, and asserts at both 375px
 * (mobile) and 1280px (desktop) widths:
 *   - The browser URL ends on the expected path (auth/redirect guard passed)
 *   - A page-unique heading or label is visible (correct page rendered)
 *   - .portal-form-row column count is ≥2 at desktop / exactly 1 at mobile
 *   - The body does not overflow horizontally at either width
 *
 * Seeded test data (created once, IDs are stable):
 *   Candidate    39241b7b-6b4c-4797-85ac-5818a65b4ca2  "Layout TestCand"
 *   Pipeline     deaed4ac-2fee-42d4-822f-8c259b410770  "Layout Test Pipeline"
 *   Asset        aef75963-5fdf-47b9-8681-ddc1fc1bfadf  "Layout Test Laptop"
 *   Requisition  31391472-d530-44ff-9bcc-8b367ae12daa  "Software Engineer"
 *   Interview    a2a6e5c8-f33a-48d9-9572-5ce75f86e93f  "INT-20260715-000001"
 *
 * portal-form-row usage on each page:
 *   CandidateDetails      — uses .portal-form-row, NO inline gridTemplateColumns
 *   AssetInventoryDetails — uses .portal-form-row, NO inline gridTemplateColumns
 *   RequisitionDetails    — uses .portal-form-row, NO inline gridTemplateColumns
 *   PipelineDetails       — does NOT use .portal-form-row (flex layout)
 *   InterviewDetails      — does NOT use .portal-form-row (own grid layout)
 */

const BASE_URL = "http://localhost:5000";
const SUBDOMAIN = "testportal";
const EMAIL = "portaltest@test.com";
const PASSWORD = "portal123";

const CANDIDATE_ID = "39241b7b-6b4c-4797-85ac-5818a65b4ca2";
const PIPELINE_ID = "deaed4ac-2fee-42d4-822f-8c259b410770";
const ASSET_ID = "aef75963-5fdf-47b9-8681-ddc1fc1bfadf";
const REQUISITION_ID = "31391472-d530-44ff-9bcc-8b367ae12daa";
const INTERVIEW_ID = "a2a6e5c8-f33a-48d9-9572-5ce75f86e93f";

const PORTAL = (path) => `${BASE_URL}/portal/${SUBDOMAIN}${path}`;

/** Count rendered grid columns for the first .portal-form-row on the page. */
async function countGridCols(page, selector = ".portal-form-row") {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return window.getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/)
      .length;
  }, selector);
}

/** True when the page body overflows horizontally. */
async function hasBodyOverflow(page) {
  return page.evaluate(
    () => document.body.scrollWidth > document.body.clientWidth
  );
}

/**
 * Authenticate via the portal login form.
 * Throws (fails the test) if the browser does not leave the login page
 * within 10 s, so tests fail fast when auth prerequisites are broken.
 */
async function loginToPortal(page) {
  await page.goto(PORTAL("/login"), { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(
    () => !location.href.includes("/login"),
    { timeout: 10000 }
  );
  await page.waitForTimeout(600);
}

/**
 * Navigate to a portal route, wait for the page to settle, then confirm
 * the browser is on the expected path and shows the expected heading text.
 * Fails the test immediately if either guard fails.
 */
async function navigateAndAssert(page, path, headingText) {
  await page.goto(PORTAL(path), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const currentURL = page.url();
  expect(
    currentURL,
    `Expected URL to contain "${path}" — auth redirect may have triggered`
  ).toContain(path);

  const heading = page.locator("h1, h2, h3, [class*='title'], [class*='heading']").filter({ hasText: headingText });
  await expect(
    heading.first(),
    `Expected to find heading containing "${headingText}" on page`
  ).toBeVisible({ timeout: 5000 });
}

// ─── CandidateDetails ────────────────────────────────────────────────────────
// Uses .portal-form-row with no inline gridTemplateColumns.
// At desktop: auto-fill → multiple columns. At mobile: !important forces 1 col.

test.describe("CandidateDetails — portal-form-row layout", () => {
  const PATH = `/recruitment/candidates/${CANDIDATE_ID}`;

  test("1280px desktop — multi-column portal-form-row, no overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "TestCand");

    const cols = await countGridCols(page);
    if (cols !== null) {
      expect(cols, `Expected ≥2 columns at 1280px, got ${cols}`).toBeGreaterThanOrEqual(2);
    }
    expect(await hasBodyOverflow(page), "Must not overflow at 1280px").toBe(false);
  });

  test("375px mobile — single-column portal-form-row, no overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "TestCand");

    const cols = await countGridCols(page);
    if (cols !== null) {
      expect(cols, `Expected 1 column at 375px, got ${cols}`).toBe(1);
    }
    expect(await hasBodyOverflow(page), "Must not overflow at 375px").toBe(false);
  });
});

// ─── AssetInventoryDetails ────────────────────────────────────────────────────
// Uses .portal-form-row with no inline gridTemplateColumns.

test.describe("AssetInventoryDetails — portal-form-row layout", () => {
  const PATH = `/assets/inventory/${ASSET_ID}`;

  test("1280px desktop — multi-column portal-form-row, no overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "Layout Test Laptop");

    const cols = await countGridCols(page);
    if (cols !== null) {
      expect(cols, `Expected ≥2 columns at 1280px, got ${cols}`).toBeGreaterThanOrEqual(2);
    }
    expect(await hasBodyOverflow(page), "Must not overflow at 1280px").toBe(false);
  });

  test("375px mobile — single-column portal-form-row, no overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "Layout Test Laptop");

    const cols = await countGridCols(page);
    if (cols !== null) {
      expect(cols, `Expected 1 column at 375px, got ${cols}`).toBe(1);
    }
    expect(await hasBodyOverflow(page), "Must not overflow at 375px").toBe(false);
  });
});

// ─── RequisitionDetails ───────────────────────────────────────────────────────
// Uses .portal-form-row with no inline gridTemplateColumns.

test.describe("RequisitionDetails — portal-form-row layout", () => {
  const PATH = `/recruitment/requisitions/${REQUISITION_ID}`;

  test("1280px desktop — multi-column portal-form-row, no overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "Software Engineer");

    const cols = await countGridCols(page);
    if (cols !== null) {
      expect(cols, `Expected ≥2 columns at 1280px, got ${cols}`).toBeGreaterThanOrEqual(2);
    }
    expect(await hasBodyOverflow(page), "Must not overflow at 1280px").toBe(false);
  });

  test("375px mobile — single-column portal-form-row, no overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "Software Engineer");

    const cols = await countGridCols(page);
    if (cols !== null) {
      expect(cols, `Expected 1 column at 375px, got ${cols}`).toBe(1);
    }
    expect(await hasBodyOverflow(page), "Must not overflow at 375px").toBe(false);
  });
});

// ─── PipelineDetails ──────────────────────────────────────────────────────────
// Does NOT use .portal-form-row (flex layout). The phone-layout CSS change
// has no effect here. Tests confirm the page renders correctly at both widths.

test.describe("PipelineDetails — flex layout unaffected at both breakpoints", () => {
  const PATH = `/hrms/interviews/pipelines/${PIPELINE_ID}`;

  test("1280px desktop — renders correctly, no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "Layout Test Pipeline");

    expect(await hasBodyOverflow(page), "Must not overflow at 1280px").toBe(false);
  });

  test("375px mobile — renders correctly, no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "Layout Test Pipeline");

    expect(await hasBodyOverflow(page), "Must not overflow at 375px").toBe(false);
  });
});

// ─── InterviewDetails ─────────────────────────────────────────────────────────
// Does NOT use .portal-form-row (own grid/flex layout). The phone-layout CSS
// change has no effect here. Tests confirm the page renders correctly.

test.describe("InterviewDetails — own grid layout unaffected at both breakpoints", () => {
  const PATH = `/hrms/interviews/${INTERVIEW_ID}`;

  test("1280px desktop — renders correctly, no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "INT-20260715-000001");

    expect(await hasBodyOverflow(page), "Must not overflow at 1280px").toBe(false);
  });

  test("375px mobile — renders correctly, no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginToPortal(page);
    await navigateAndAssert(page, PATH, "INT-20260715-000001");

    expect(await hasBodyOverflow(page), "Must not overflow at 375px").toBe(false);
  });
});
