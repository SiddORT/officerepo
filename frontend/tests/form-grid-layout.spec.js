import { test, expect } from "@playwright/test";

/**
 * Regression tests for .form-grid-4, .form-grid-3, and .form-grid-2 CSS breakpoints.
 *
 * The CSS rules in src/index.css define the following responsive tiers:
 *
 *  .form-grid-4  >1024px → 4 cols  |  ≤1024px → 2 cols  |  ≤640px → 1 col
 *  .form-grid-3  >1024px → 3 cols  |  ≤1024px → 2 cols  |  ≤640px → 1 col
 *  .form-grid-2  >1024px → 2 cols  |  ≤1024px → 1 col   |  ≤640px → 1 col
 *
 * Tests verify each breakpoint for the portal forms that use each class:
 *
 *  .form-grid-4 — InterviewScheduleForm, CandidateForm, JobOpeningForm
 *  .form-grid-3 — RequisitionForm
 *  .form-grid-2 — RequisitionForm, PipelineForm, InterviewDetails
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
  .form-grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
  }
  .form-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  @media (max-width: 1024px) {
    .form-grid-4 { grid-template-columns: 1fr 1fr; }
    .form-grid-3 { grid-template-columns: 1fr 1fr; }
    .form-grid-2 { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .form-grid-4 { grid-template-columns: 1fr; }
    .form-grid-3 { grid-template-columns: 1fr; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 100%; }
`;

function buildPageHtml(gridClass, formName, fieldCount = 4) {
  const fields = Array.from({ length: fieldCount }, (_, i) => `<div class="field">Field ${i + 1}</div>`).join("\n    ");
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${FORM_GRID_CSS}</style>
</head>
<body>
  <div class="${gridClass}" data-form="${formName}">
    ${fields}
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
async function getColumnCount(page, gridClass) {
  return page.evaluate((cls) => {
    const el = document.querySelector(`.${cls}`);
    const computed = window.getComputedStyle(el).gridTemplateColumns;
    return computed.trim().split(/\s+/).length;
  }, gridClass);
}

// ── .form-grid-4 ─────────────────────────────────────────────────────────────
// Used by: InterviewScheduleForm, CandidateForm, JobOpeningForm

const VIEWPORTS_GRID4 = [
  { width: 1280, height: 900,  expectedCols: 4, label: "1280px (desktop — 4 columns)" },
  { width: 1024, height: 900,  expectedCols: 2, label: "1024px (tablet boundary — 2 columns)" },
  { width: 768,  height: 1024, expectedCols: 2, label: "768px (tablet — 2 columns)" },
  { width: 640,  height: 900,  expectedCols: 1, label: "640px (small-tablet boundary — 1 column)" },
  { width: 375,  height: 812,  expectedCols: 1, label: "375px (mobile — 1 column)" },
];

const FORMS_GRID4 = [
  "InterviewScheduleForm",
  "CandidateForm",
  "JobOpeningForm",
];

for (const formName of FORMS_GRID4) {
  test.describe(`${formName} — .form-grid-4 breakpoints`, () => {
    for (const vp of VIEWPORTS_GRID4) {
      test(vp.label, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.setContent(buildPageHtml("form-grid-4", formName, 4));

        const cols = await getColumnCount(page, "form-grid-4");

        expect(
          cols,
          `Expected ${vp.expectedCols} column(s) at ${vp.width}px for ${formName}, got ${cols}`
        ).toBe(vp.expectedCols);
      });
    }
  });
}

// ── .form-grid-3 ─────────────────────────────────────────────────────────────
// Used by: RequisitionForm (Row3 helper)
//
// Breakpoints:
//   >1024px  → 3 columns  (desktop)
//   ≤1024px  → 2 columns  (tablet)
//   ≤640px   → 1 column   (small tablet / mobile)

const VIEWPORTS_GRID3 = [
  { width: 1280, height: 900,  expectedCols: 3, label: "1280px (desktop — 3 columns)" },
  { width: 1025, height: 900,  expectedCols: 3, label: "1025px (just above tablet boundary — 3 columns)" },
  { width: 1024, height: 900,  expectedCols: 2, label: "1024px (tablet boundary — 2 columns)" },
  { width: 768,  height: 1024, expectedCols: 2, label: "768px (tablet — 2 columns)" },
  { width: 641,  height: 900,  expectedCols: 2, label: "641px (just above small-tablet boundary — 2 columns)" },
  { width: 640,  height: 900,  expectedCols: 1, label: "640px (small-tablet boundary — 1 column)" },
  { width: 375,  height: 812,  expectedCols: 1, label: "375px (mobile — 1 column)" },
];

const FORMS_GRID3 = [
  "RequisitionForm",
];

for (const formName of FORMS_GRID3) {
  test.describe(`${formName} — .form-grid-3 breakpoints`, () => {
    for (const vp of VIEWPORTS_GRID3) {
      test(vp.label, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.setContent(buildPageHtml("form-grid-3", formName, 3));

        const cols = await getColumnCount(page, "form-grid-3");

        expect(
          cols,
          `Expected ${vp.expectedCols} column(s) at ${vp.width}px for ${formName}, got ${cols}`
        ).toBe(vp.expectedCols);
      });
    }
  });
}

// ── .form-grid-2 ─────────────────────────────────────────────────────────────
// Used by: RequisitionForm (Row2 helper), PipelineForm, InterviewDetails
//
// Breakpoints:
//   >1024px  → 2 columns  (desktop)
//   ≤1024px  → 1 column   (tablet — collapses fully; no ≤640px rule, stays 1)
//   ≤640px   → 1 column   (inherited from ≤1024px rule)

const VIEWPORTS_GRID2 = [
  { width: 1280, height: 900,  expectedCols: 2, label: "1280px (desktop — 2 columns)" },
  { width: 1025, height: 900,  expectedCols: 2, label: "1025px (just above tablet boundary — 2 columns)" },
  { width: 1024, height: 900,  expectedCols: 1, label: "1024px (tablet boundary — 1 column)" },
  { width: 768,  height: 1024, expectedCols: 1, label: "768px (tablet — 1 column)" },
  { width: 640,  height: 900,  expectedCols: 1, label: "640px (small-tablet boundary — 1 column)" },
  { width: 375,  height: 812,  expectedCols: 1, label: "375px (mobile — 1 column)" },
];

const FORMS_GRID2 = [
  "RequisitionForm",
  "PipelineForm",
  "InterviewDetails",
];

for (const formName of FORMS_GRID2) {
  test.describe(`${formName} — .form-grid-2 breakpoints`, () => {
    for (const vp of VIEWPORTS_GRID2) {
      test(vp.label, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.setContent(buildPageHtml("form-grid-2", formName, 2));

        const cols = await getColumnCount(page, "form-grid-2");

        expect(
          cols,
          `Expected ${vp.expectedCols} column(s) at ${vp.width}px for ${formName}, got ${cols}`
        ).toBe(vp.expectedCols);
      });
    }
  });
}
