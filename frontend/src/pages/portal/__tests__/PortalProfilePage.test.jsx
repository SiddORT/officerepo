import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { PortalProfilePage } from "../ClientPortalPage";

vi.mock("../../../contexts/PortalAuthContext", () => ({
  usePortalAuth: vi.fn(),
}));

vi.mock("../../../services/apiClient", () => ({
  portalEmployeeApi: { me: vi.fn(), update: vi.fn() },
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

const EMP_DATA = {
  id: "emp-1",
  full_name: "Jane Doe",
  employee_code: "EMP001",
  designation_name: "Engineer",
  department_name: "Engineering",
  gender: "Female",
  date_of_birth: "1990-06-15",
  marital_status: "Single",
  blood_group: "O+",
  nationality: "Indian",
  personal_email: "jane@personal.com",
  mobile_country_code: "+91",
  mobile_number: "9876543210",
  alternate_mobile_country_code: "+91",
  alternate_mobile: "",
  landline_number: "",
  current_address_line_1: "123 Main St",
  current_city: "Mumbai",
  current_state: "Maharashtra",
  current_country: "India",
  current_postal_code: "400001",
};

function makeEmpResponse(emp = EMP_DATA) {
  return {
    data: {
      data: {
        employee_module_enabled: true,
        db_provisioned: true,
        data: emp,
      },
    },
  };
}

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <PortalProfilePage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  usePortalAuth.mockReturnValue(DEFAULT_AUTH);
  vi.clearAllMocks();
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

  it("shows the error state when the API call fails with a network error", async () => {
    portalEmployeeApi.me.mockRejectedValue(new Error("Network Error"));

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      expect(screen.getByText(/couldn't load your profile/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });
  });

  it("does not show the no-record message when the API call fails with a network error", async () => {
    portalEmployeeApi.me.mockRejectedValue(new Error("Network Error"));

    renderProfilePage();

    await waitFor(() => {
      expect(screen.queryByText(/No employee record is linked to your account/i)).not.toBeInTheDocument();
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

describe("PortalProfilePage — edit modal open/save cycle", () => {
  it("opening Personal Details populates the form with existing employee values", async () => {
    portalEmployeeApi.me.mockResolvedValue(makeEmpResponse());

    renderProfilePage();

    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());

    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    await userEvent.click(editButtons[0]);

    expect(screen.getByText("Edit Personal Details")).toBeInTheDocument();

    expect(screen.getByDisplayValue("Female")).toBeInTheDocument();
    expect(screen.getByDisplayValue("jane@personal.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1990-06-15")).toBeInTheDocument();
  });

  it("successful save calls portalEmployeeApi.update with the right payload and reloads", async () => {
    portalEmployeeApi.me.mockResolvedValue(makeEmpResponse());
    portalEmployeeApi.update.mockResolvedValue({ data: { data: EMP_DATA } });

    renderProfilePage();

    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());

    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    await userEvent.click(editButtons[0]);

    const saveBtn = screen.getByRole("button", { name: /^save$/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(portalEmployeeApi.update).toHaveBeenCalledWith(
        "acme",
        "tok-test",
        "emp-1",
        expect.objectContaining({
          gender: "Female",
          date_of_birth: "1990-06-15",
          personal_email: "jane@personal.com",
        })
      );
    });

    await waitFor(() => {
      expect(portalEmployeeApi.me).toHaveBeenCalledTimes(2);
    });
  });

  it("failed save shows the error string from the API response", async () => {
    portalEmployeeApi.me.mockResolvedValue(makeEmpResponse());
    portalEmployeeApi.update.mockRejectedValue({
      response: { data: { detail: "Validation failed: invalid date" } },
    });

    renderProfilePage();

    await waitFor(() => expect(screen.getByText("Jane Doe")).toBeInTheDocument());

    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    await userEvent.click(editButtons[0]);

    const saveBtn = screen.getByRole("button", { name: /^save$/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Validation failed: invalid date")
      ).toBeInTheDocument();
    });
  });
});
