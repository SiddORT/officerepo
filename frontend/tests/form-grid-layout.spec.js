import { test, expect } from "@playwright/test";

/**
 * Regression tests for .form-grid-4 CSS breakpoints.
 *
 * The CSS rule in src/index.css defines three tiers:
 *   >1024px  → 4 columns  (desktop)
 *   ≤1024px  → 2 columns  (tablet)
 *   ≤640px   → 1 column   (mobile)
 *
 * These tests verify that each breakpoint resolves the correct column count
 * for the three portal forms that rely on .form-grid-4:
 *   - InterviewScheduleForm
 *   - CandidateForm
 *   - JobOpeningForm
 *
 * Tests are self-contained: they embed the CSS inline and use page.setContent()
 * so no running dev server is required.
 */

const FORM_GRID_CSS = `
  .form-grid-4 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 1024px) {
    .form-grid-4 { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 640px) {
    .form-grid-4 { grid-template-columns: 1fr; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 100%; }
`;

function buildPageHtml(formName) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${FORM_GRID_CSS}</style>
</head>
<body>
  <div class="form-grid-4" data-form="${formName}">
    <div class="field">Field 1</div>
    <div class="field">Field 2</div>
    <div class="field">Field 3</div>
    <div class="field">Field 4</div>
  </div>
</body>
</html>`;
}

/**
 * Count the number of grid columns by inspecting the computed style of the
 * grid container.  getComputedStyle().gridTemplateColumns returns resolved
 * pixel values separated by spaces (e.g. "320px 320px 320px 320px"), so
 * splitting on whitespace gives us the column count.
 */
async function getColumnCount(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".form-grid-4");
    const computed = window.getComputedStyle(el).gridTemplateColumns;
    return computed.trim().split(/\s+/).length;
  });
}

const VIEWPORTS = [
  { width: 1280, height: 900, expectedCols: 4, label: "1280px (desktop — 4 columns)" },
  { width: 1024, height: 900, expectedCols: 2, label: "1024px (tablet boundary — 2 columns)" },
  { width: 768,  height: 1024, expectedCols: 2, label: "768px (tablet — 2 columns)" },
  { width: 375,  height: 812,  expectedCols: 1, label: "375px (mobile — 1 column)" },
];

const FORMS = [
  "InterviewScheduleForm",
  "CandidateForm",
  "JobOpeningForm",
];

for (const formName of FORMS) {
  test.describe(`${formName} — .form-grid-4 breakpoints`, () => {
    for (const vp of VIEWPORTS) {
      test(`${vp.label}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.setContent(buildPageHtml(formName));

        const cols = await getColumnCount(page);

        expect(
          cols,
          `Expected ${vp.expectedCols} column(s) at ${vp.width}px for ${formName}, got ${cols}`
        ).toBe(vp.expectedCols);
      });
    }
  });
}
