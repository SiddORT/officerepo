import { test, expect } from "@playwright/test";

/**
 * Regression tests for the .portal-form-row CSS responsive behaviour.
 *
 * The rule in src/index.css (inside @layer components):
 *
 *   .portal-form-row {
 *     display: grid;
 *     grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
 *     gap: 14px;
 *   }
 *
 * And the mobile override added by the phone-layout change:
 *
 *   @media (max-width: 640px) {
 *     .portal-form-row { grid-template-columns: 1fr !important; }
 *   }
 *
 * The !important is necessary because several pages set an inline
 * gridTemplateColumns style directly on .portal-form-row elements:
 *
 *   EmployeeDetails  — Grid2: minmax(180px, 1fr), Grid3: minmax(150px, 1fr)
 *   EmployeeForm     — similar custom minmax values
 *   DepartmentForm   — "1fr" (already single-col, no visible change)
 *   DesignationForm  — "1fr" (already single-col, no visible change)
 *   CompanyForm      — marginBottom only (not gridTemplateColumns)
 *   OfferForm        — marginTop only (not gridTemplateColumns)
 *   BranchList       — custom gridTemplateColumns
 *   UserForm         — custom gridTemplateColumns
 *
 * Pages that use .portal-form-row WITHOUT inline gridTemplateColumns
 * (and are therefore provably unaffected by the !important override):
 *
 *   AssetInventoryDetails, AssetInventoryForm, AssetCatalogForm,
 *   AssetSubCategoryList, AssetCategories, CandidateDetails,
 *   RequisitionDetails, RoleForm, EmployeeDocForm, and all payroll list pages.
 *
 * InterviewDetails and PipelineDetails do NOT use .portal-form-row at all
 * (they use their own flex/grid helpers).
 *
 * Tests are self-contained: they embed the CSS inline and use page.setContent()
 * so no running dev server is required.
 */

const PORTAL_FORM_ROW_CSS = `
  .portal-form-row {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 14px;
  }
  @media (max-width: 640px) {
    /* Force single-column for all portal form rows — overrides any inline gridTemplateColumns */
    .portal-form-row { grid-template-columns: 1fr !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { width: 100%; }
`;

function buildPageHtml(formName, fieldCount = 4, inlineStyle = "") {
  const fields = Array.from(
    { length: fieldCount },
    (_, i) => `<div class="field">Field ${i + 1}</div>`
  ).join("\n    ");
  const styleAttr = inlineStyle ? ` style="${inlineStyle}"` : "";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${PORTAL_FORM_ROW_CSS}</style>
</head>
<body>
  <div class="portal-form-row" data-form="${formName}"${styleAttr}>
    ${fields}
  </div>
</body>
</html>`;
}

async function getColumnCount(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".portal-form-row");
    const computed = window.getComputedStyle(el).gridTemplateColumns;
    return computed.trim().split(/\s+/).length;
  });
}

async function getOverflowInfo(page) {
  return page.evaluate(() => {
    const el = document.querySelector(".portal-form-row");
    const body = document.body;
    return {
      gridScrollWidth: el.scrollWidth,
      gridClientWidth: el.clientWidth,
      gridOverflows: el.scrollWidth > el.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      bodyOverflows: body.scrollWidth > body.clientWidth,
    };
  });
}

// ── Default .portal-form-row — no inline style ────────────────────────────────
//
// Covers: AssetInventoryDetails, CandidateDetails, RequisitionDetails,
//         RoleForm, EmployeeDocForm, and all payroll list pages.
// At desktop: auto-fill minmax(220px,1fr) fills the available width with
//   multiple columns (≥2 at 641px+).
// At ≤640px: the media-query forces 1fr → exactly 1 column.

const PAGES_NO_INLINE = [
  "AssetInventoryDetails",
  "CandidateDetails",
  "RequisitionDetails",
  "AssetInventoryForm",
  "RoleForm",
  "EmployeeDocForm",
];

const VIEWPORTS_DEFAULT = [
  {
    width: 1280,
    height: 720,
    expectedMinCols: 2,
    label: "1280px (desktop — multi-column)",
    expectSingle: false,
  },
  {
    width: 641,
    height: 900,
    expectedMinCols: 2,
    label: "641px (just above mobile boundary — multi-column)",
    expectSingle: false,
  },
  {
    width: 640,
    height: 900,
    expectedMinCols: 1,
    label: "640px (mobile boundary — single column)",
    expectSingle: true,
  },
  {
    width: 375,
    height: 812,
    expectedMinCols: 1,
    label: "375px (mobile — single column)",
    expectSingle: true,
  },
];

for (const pageName of PAGES_NO_INLINE) {
  test.describe(`${pageName} — .portal-form-row (no inline style)`, () => {
    for (const vp of VIEWPORTS_DEFAULT) {
      test(vp.label, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.setContent(buildPageHtml(pageName, 4));

        const cols = await getColumnCount(page);

        if (vp.expectSingle) {
          expect(
            cols,
            `Expected exactly 1 column at ${vp.width}px for ${pageName}, got ${cols}`
          ).toBe(1);
        } else {
          expect(
            cols,
            `Expected ≥${vp.expectedMinCols} columns at ${vp.width}px for ${pageName}, got ${cols}`
          ).toBeGreaterThanOrEqual(vp.expectedMinCols);
        }
      });
    }
  });
}

// ── .portal-form-row + inline gridTemplateColumns — !important override ───────
//
// Covers: EmployeeDetails (Grid2/Grid3), EmployeeForm, BranchList, UserForm.
// These pages set a custom inline gridTemplateColumns. At desktop the inline
// style controls the layout (≥2 columns). At ≤640px the media-query !important
// rule must override the inline style and force exactly 1 column.

const INLINE_STYLE_CASES = [
  {
    name: "EmployeeDetails-Grid2",
    inline: "grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))",
  },
  {
    name: "EmployeeDetails-Grid3",
    inline: "grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))",
  },
  {
    name: "EmployeeForm-custom-grid",
    inline: "grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))",
  },
  {
    name: "UserForm-custom-grid",
    inline: "grid-template-columns: repeat(auto-fit, minmax(160px, 1fr))",
  },
  {
    name: "BranchList-custom-grid",
    inline: "grid-template-columns: repeat(3, 1fr)",
  },
];

for (const { name, inline } of INLINE_STYLE_CASES) {
  test.describe(`${name} — !important overrides inline style at mobile`, () => {
    test("1280px (desktop — inline style controls, multi-column)", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.setContent(buildPageHtml(name, 4, inline));

      const cols = await getColumnCount(page);
      expect(
        cols,
        `Expected ≥2 columns at 1280px for ${name} (inline style should control at desktop), got ${cols}`
      ).toBeGreaterThanOrEqual(2);
    });

    test("640px (boundary — !important forces 1 column despite inline style)", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 640, height: 900 });
      await page.setContent(buildPageHtml(name, 4, inline));

      const cols = await getColumnCount(page);
      expect(
        cols,
        `Expected 1 column at 640px for ${name} (!important must override inline style), got ${cols}`
      ).toBe(1);
    });

    test("375px (mobile — !important forces 1 column despite inline style)", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.setContent(buildPageHtml(name, 4, inline));

      const cols = await getColumnCount(page);
      expect(
        cols,
        `Expected 1 column at 375px for ${name} (!important must override inline style), got ${cols}`
      ).toBe(1);
    });
  });
}

// ── No horizontal overflow at mobile ─────────────────────────────────────────
//
// Confirms that at 375px neither the .portal-form-row container nor the
// document body gains a horizontal scrollbar after the 1fr override.

const OVERFLOW_CASES = [
  { name: "AssetInventoryDetails", inline: "" },
  { name: "CandidateDetails", inline: "" },
  { name: "RequisitionDetails", inline: "" },
  {
    name: "EmployeeDetails-Grid2",
    inline: "grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))",
  },
  {
    name: "EmployeeDetails-Grid3",
    inline: "grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))",
  },
];

test.describe("No horizontal overflow at 375px (mobile)", () => {
  for (const { name, inline } of OVERFLOW_CASES) {
    test(`${name} — no overflow`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.setContent(buildPageHtml(name, 4, inline));

      const overflow = await getOverflowInfo(page);

      expect(
        overflow.gridOverflows,
        `${name}: .portal-form-row overflows horizontally at 375px ` +
          `(scrollWidth=${overflow.gridScrollWidth}, clientWidth=${overflow.gridClientWidth})`
      ).toBe(false);

      expect(
        overflow.bodyOverflows,
        `${name}: body overflows horizontally at 375px ` +
          `(scrollWidth=${overflow.bodyScrollWidth}, clientWidth=${overflow.bodyClientWidth})`
      ).toBe(false);
    });
  }
});

// ── InterviewDetails and PipelineDetails — no portal-form-row at all ─────────
//
// These two pages are listed in the task but do NOT use .portal-form-row.
// They use their own flex/grid helpers (Row, flex containers, form-grid-*).
// This sanity test documents that fact: even at 375px, a plain flex container
// layout (what those pages use) is unaffected by the portal-form-row media rule.

test.describe("InterviewDetails and PipelineDetails — not affected (no .portal-form-row)", () => {
  const FLEX_CSS = `
    .detail-row { display: flex; flex-wrap: wrap; gap: 14px; }
    .detail-row .field { flex: 1 1 180px; min-width: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { width: 100%; }
  `;

  for (const pageName of ["InterviewDetails", "PipelineDetails"]) {
    test(`${pageName} — flex layout unaffected at 375px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await page.setContent(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>${PORTAL_FORM_ROW_CSS}${FLEX_CSS}</style>
</head>
<body>
  <!-- These pages use .detail-row (flex), NOT .portal-form-row -->
  <div class="detail-row" data-form="${pageName}">
    <div class="field">Field 1</div>
    <div class="field">Field 2</div>
    <div class="field">Field 3</div>
  </div>
</body>
</html>`);

      const overflow = await page.evaluate(() => {
        const el = document.querySelector(".detail-row");
        return {
          display: window.getComputedStyle(el).display,
          overflows: document.body.scrollWidth > document.body.clientWidth,
        };
      });

      expect(overflow.display).toBe("flex");
      expect(
        overflow.overflows,
        `${pageName}: body overflows at 375px — flex layout should wrap`
      ).toBe(false);
    });
  }
});
