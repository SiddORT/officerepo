import { test, expect } from "@playwright/test";

/**
 * End-to-end retry-flow test for the PortalProfilePage.
 *
 * Both network calls are intercepted so the test is self-contained and does
 * not rely on seeded portal accounts or a provisioned per-client database.
 *
 * React StrictMode (active in Vite dev builds) double-invokes effects, so the
 * employees/me endpoint is called twice on initial mount. Both of those calls
 * must return an error so the component is left in the "error" state. The
 * third call, triggered by the user clicking "Try again", returns success.
 * This is achieved by registering the error handler with `times: 2` and
 * registering a success handler as a fallback (older routes are lower priority
 * in Playwright, so the times-limited error handler wins for the first two
 * hits, then the success handler takes over).
 *
 * Flow:
 *   1. Inject portal auth into sessionStorage directly (avoids needing real
 *      portal credentials in the development database).
 *   2. Register a success fallback route for /employees/me.
 *   3. Register a 500-error route for /employees/me with times: 2 (covers
 *      StrictMode double-invoke).
 *   4. Navigate to the portal /profile page.
 *   5. Assert the error banner ("Something went wrong") and "Try again" button
 *      are visible, and the employee card is NOT shown.
 *   6. Click "Try again".
 *   7. Assert the employee card renders with full_name + employee_code.
 *   8. Assert the error banner and "Try again" button are gone.
 */

const BASE_URL = "http://localhost:5000";
const SUBDOMAIN = "testportal";
const PORTAL = (path) => `${BASE_URL}/portal/${SUBDOMAIN}${path}`;

const EMPLOYEE_ME_PATTERN = `**/api/v1/portal/${SUBDOMAIN}/employees/me`;

const MOCK_SESSION = {
  email: "e2etest@example.com",
  name: "E2E Test User",
  client_id: "client-e2e-001",
  admin_user_id: "admin-e2e-001",
  workspace_name: "Testportal",
  token: "mock-e2e-access-token",
  loggedAt: Date.now(),
};

const MOCK_EMPLOYEE = {
  id: "emp-retry-e2e-01",
  full_name: "Retry E2E Employee",
  employee_code: "EMP-RETRY-E2E",
  designation_name: "Software Engineer",
  department_name: "Engineering",
  gender: "Male",
  date_of_birth: "1990-01-01",
  marital_status: "Single",
  blood_group: "O+",
  nationality: "Indian",
};

const SUCCESS_BODY = JSON.stringify({
  data: {
    employee_module_enabled: true,
    db_provisioned: true,
    data: MOCK_EMPLOYEE,
  },
});

const ERROR_BODY = JSON.stringify({ detail: "Internal Server Error" });

test.describe("PortalProfilePage — retry flow", () => {
  test(
    "error banner appears on first load failure; employee card renders after clicking Try again",
    async ({ page }) => {
      await page.goto(PORTAL("/login"), { waitUntil: "domcontentloaded" });

      await page.evaluate(
        ({ key, value }) => sessionStorage.setItem(key, value),
        {
          key: `portal_auth_${SUBDOMAIN}`,
          value: JSON.stringify(MOCK_SESSION),
        }
      );

      await page.route(EMPLOYEE_ME_PATTERN, (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: SUCCESS_BODY,
        })
      );

      await page.route(
        EMPLOYEE_ME_PATTERN,
        (route) =>
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: ERROR_BODY,
          }),
        { times: 2 }
      );

      await page.goto(PORTAL("/profile"), { waitUntil: "domcontentloaded" });

      await expect(
        page.getByText("Something went wrong"),
        "Error heading must be visible after both StrictMode calls return 500"
      ).toBeVisible({ timeout: 8000 });

      await expect(
        page.getByText(/couldn't load your profile/i),
        "Error description must be visible"
      ).toBeVisible({ timeout: 3000 });

      const retryBtn = page.getByRole("button", { name: /try again/i });
      await expect(
        retryBtn,
        '"Try again" button must be visible in the error state'
      ).toBeVisible({ timeout: 3000 });

      await expect(
        page.getByText(MOCK_EMPLOYEE.full_name),
        "Employee card must NOT appear while in error state"
      ).not.toBeVisible();

      await retryBtn.click();

      await expect(
        page.getByText(MOCK_EMPLOYEE.full_name),
        "Employee full name must appear after a successful retry"
      ).toBeVisible({ timeout: 8000 });

      await expect(
        page.getByText(MOCK_EMPLOYEE.employee_code),
        "Employee code must appear after a successful retry"
      ).toBeVisible({ timeout: 3000 });

      await expect(
        page.getByText("Something went wrong"),
        "Error banner must be gone after successful retry"
      ).not.toBeVisible();

      await expect(
        page.getByRole("button", { name: /try again/i }),
        '"Try again" button must be gone after successful retry'
      ).not.toBeVisible();
    }
  );
});
