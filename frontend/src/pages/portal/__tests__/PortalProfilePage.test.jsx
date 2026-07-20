import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PortalProfilePage } from "../ClientPortalPage";

vi.mock("../../../contexts/PortalAuthContext", () => ({
  usePortalAuth: vi.fn(),
}));

vi.mock("../../../services/apiClient", () => ({
  portalEmployeeApi: { me: vi.fn() },
}));

vi.mock("../PortalLayout", () => ({
  default: ({ children }) => <div data-testid="portal-layout">{children}</div>,
}));

import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalEmployeeApi } from "../../../services/apiClient";

const DEFAULT_AUTH = {
  user: { name: "Test User", email: "test@example.com" },
  subdomain: "acme",
  token: "tok-test",
};

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <PortalProfilePage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  usePortalAuth.mockReturnValue(DEFAULT_AUTH);
});

describe("PortalProfilePage", () => {
  it("shows the module-disabled banner when employee_module_enabled is false", async () => {
    portalEmployeeApi.me.mockResolvedValue({
      data: { data: { employee_module_enabled: false } },
    });

    renderProfilePage();

    await waitFor(() => {
      expect(
        screen.getByText(/Employee details aren't available/i)
      ).toBeInTheDocument();
    });
  });

  it("shows the database-not-provisioned banner when db_provisioned is false", async () => {
    portalEmployeeApi.me.mockResolvedValue({
      data: { data: { employee_module_enabled: true, db_provisioned: false } },
    });

    renderProfilePage();

    await waitFor(() => {
      expect(
        screen.getByText(/workspace database hasn't been set up yet/i)
      ).toBeInTheDocument();
    });
  });

  it("shows the no-record fallback when the API returns no data field", async () => {
    portalEmployeeApi.me.mockResolvedValue({
      data: { data: { employee_module_enabled: true, db_provisioned: true } },
    });

    renderProfilePage();

    await waitFor(() => {
      expect(
        screen.getByText(/No employee record is linked to your account/i)
      ).toBeInTheDocument();
    });
  });

  it("shows the no-record fallback when the API call fails with a network error", async () => {
    portalEmployeeApi.me.mockRejectedValue(new Error("Network Error"));

    renderProfilePage();

    await waitFor(() => {
      expect(
        screen.getByText(/No employee record is linked to your account/i)
      ).toBeInTheDocument();
    });
  });

  it("renders the employee card when employee data is present", async () => {
    portalEmployeeApi.me.mockResolvedValue({
      data: {
        data: {
          employee_module_enabled: true,
          db_provisioned: true,
          data: {
            id: "emp-1",
            full_name: "Jane Doe",
            employee_code: "EMP001",
            designation_name: "Engineer",
            department_name: "Engineering",
            gender: "Female",
            date_of_birth: "1990-01-01",
            marital_status: "Single",
          },
        },
      },
    });

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("EMP001")).toBeInTheDocument();
    });
  });
});
