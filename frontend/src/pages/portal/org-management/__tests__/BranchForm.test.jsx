/**
 * Integration tests for BranchForm and BranchList.
 *
 * All tests render the REAL components (BranchForm / BranchList) with:
 *  - portalOrgApi mocked via vi.mock (spy on individual methods per test)
 *  - PortalAuthContext mocked so no provider wrapper is required
 *  - react-router-dom's MemoryRouter for routing (useNavigate / useParams)
 *  - Heavy layout/UI sub-trees mocked to avoid deep dependency chains
 *
 * Path resolution note: this file lives at
 *   src/pages/portal/org-management/__tests__/BranchForm.test.jsx
 * so vi.mock paths go one extra level up compared to the component's own imports:
 *   Component's "../../../x"  →  test's "../../../../x"
 *   Component's "../y"        →  test's "../../y"         (same org-management dir)
 *   Component's "./z"         →  test's "../z"            (same org-management dir)
 *
 * Coverage:
 *  1.  autoCode — name drives code; clearing the code field restores auto-generation
 *  2.  Multi-email — add / remove rows; payload split into email + additional_emails
 *  3.  Multi-phone — add / remove rows; payload split into phone + additional_phones
 *  4.  Employee picker — typing searches API; selecting populates name + id; clearing resets id
 *  5.  Validation — branch name required; company required; invalid GSTIN blocked
 *  6.  Create flow — successful save calls createBranch; landline included in payload
 *  7.  GST cert — file selected triggers uploadBranchGstCert; no file → no upload call
 *  8.  Edit prefill — manager_id, landline, additional_emails, additional_phones restored from API
 *  9.  BranchList — "Add Branch" navigates to /new; Edit button navigates to /:id/edit
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// ─── Mocks — paths resolved relative to THIS test file ────────────────────
//
// This file: src/pages/portal/org-management/__tests__/BranchForm.test.jsx
// "../"  = src/pages/portal/org-management/
// "../../" = src/pages/portal/
// "../../../../" = src/

vi.mock("../../../../contexts/PortalAuthContext", () => ({
  usePortalAuth: () => ({ token: "test-token", subdomain: "acme" }),
  PortalAuthProvider: ({ children }) => <>{children}</>,
}));

// OrgLayout lives in the same org-management directory as the components
vi.mock("../OrgLayout", () => ({
  default: ({ children }) => <div data-testid="org-layout">{children}</div>,
}));

// Shared portal components one level above org-management
vi.mock("../../shared/PageHeader", () => ({
  default: ({ title, actions }) => (
    <div>
      <h2>{title}</h2>
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("../../shared/Badge", () => ({
  default: ({ status }) => <span data-testid="badge">{status}</span>,
}));

vi.mock("../../shared/Pagination", () => ({
  default: () => null,
}));

// UI components two more levels up (src/components)
vi.mock("../../../../components/ui/ConfirmDialog", () => ({
  default: () => null,
}));

vi.mock("../../../../components/ui/ActionIcons", () => ({
  ViewIconBtn:         ({ onClick, title }) => <button onClick={onClick}>{title || "View"}</button>,
  EditIconBtn:         ({ onClick }) => <button onClick={onClick}>Edit</button>,
  ToggleStatusIconBtn: ({ onClick }) => <button onClick={onClick}>Toggle</button>,
  DeleteIconBtn:       ({ onClick }) => <button onClick={onClick}>Delete</button>,
}));

// PhoneInput — replaced with simple labelled inputs so tests can query them
vi.mock("../../../../components/ui/PhoneInput", () => ({
  default: ({ label, number, onNumberChange, dialCode, onDialCodeChange }) => (
    <div>
      {label && <span>{label}</span>}
      <input
        aria-label={`${label || "phone"} dial`}
        value={dialCode ?? ""}
        onChange={e => onDialCodeChange && onDialCodeChange(e.target.value)}
      />
      <input
        aria-label={`${label || "phone"} number`}
        value={number ?? ""}
        onChange={e => onNumberChange && onNumberChange(e.target.value)}
      />
    </div>
  ),
}));

vi.mock("../../../../hooks/usePincodeLookup", () => ({
  default: () => ({ lookup: vi.fn().mockResolvedValue(null) }),
}));

vi.mock("country-state-city", () => ({
  Country: { getAllCountries: () => [{ name: "India", isoCode: "IN" }] },
  State:   { getStatesOfCountry: () => [{ name: "Maharashtra", isoCode: "MH" }] },
  City:    { getCitiesOfState:   () => [{ name: "Mumbai" }] },
}));

// ─── portalOrgApi mock ─────────────────────────────────────────────────────
// vi.hoisted ensures mockApi is initialised before vi.mock factory runs.

const mockApi = vi.hoisted(() => ({
  listCompanies:       vi.fn(),
  getBranch:           vi.fn(),
  createBranch:        vi.fn(),
  updateBranch:        vi.fn(),
  uploadBranchGstCert: vi.fn(),
  listActiveEmployees: vi.fn(),
  listBranches:        vi.fn(),
  activateBranch:      vi.fn(),
  deactivateBranch:    vi.fn(),
  deleteBranch:        vi.fn(),
}));

vi.mock("../../../../services/apiClient", () => ({
  portalOrgApi: mockApi,
}));

// ─── Import real components AFTER mocks are registered ────────────────────

import BranchForm from "../BranchForm";
import BranchList from "../BranchList";

// ─── Shared fixtures ──────────────────────────────────────────────────────

const COMPANIES_RESP = {
  data: { data: { data: [{ id: "c1", company_name: "Acme Corp" }] } },
};

const EMPTY_BRANCHES = { data: { data: { data: [], total: 0 } } };

// ─── Render helpers ────────────────────────────────────────────────────────

function renderCreateForm() {
  return render(
    <MemoryRouter initialEntries={["/portal/acme/org/branches/new"]}>
      <Routes>
        <Route path="/portal/:subdomain/org/branches/new" element={<BranchForm editMode={false} />} />
        <Route path="/portal/:subdomain/org/branches" element={<div>Branch List</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderEditForm(branchId = "br-1") {
  return render(
    <MemoryRouter initialEntries={[`/portal/acme/org/branches/${branchId}/edit`]}>
      <Routes>
        <Route path="/portal/:subdomain/org/branches/:branchId/edit" element={<BranchForm editMode={true} />} />
        <Route path="/portal/:subdomain/org/branches" element={<div>Branch List</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function renderList() {
  return render(
    <MemoryRouter initialEntries={["/portal/acme/org/branches"]}>
      <Routes>
        <Route path="/portal/:subdomain/org/branches"             element={<BranchList />} />
        <Route path="/portal/:subdomain/org/branches/new"         element={<div>New Branch Page</div>} />
        <Route path="/portal/:subdomain/org/branches/:id/edit"    element={<div>Edit Branch Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// Convenience: returns the first <select> (company picker) in the rendered form
function getCompanySelect() {
  return screen.getAllByRole("combobox")[0];
}

// Convenience: returns all phone-number inputs (mocked PhoneInput renders two inputs each)
function getPhoneNumberInputs() {
  return screen.getAllByRole("textbox").filter(el =>
    el.getAttribute("aria-label")?.endsWith(" number")
  );
}

// ─── Setup / teardown ─────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.listCompanies.mockResolvedValue(COMPANIES_RESP);
  mockApi.listBranches.mockResolvedValue(EMPTY_BRANCHES);
  mockApi.listActiveEmployees.mockResolvedValue({ data: { data: [] } });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── 1: autoCode ───────────────────────────────────────────────────────────

describe("BranchForm — auto-code generation", () => {
  it("generates a branch code from the name typed in create mode", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Mumbai Head Office");

    expect(screen.getByPlaceholderText("MUM-HO")).toHaveValue("MUM-HO");
    expect(screen.getByText("auto")).toBeInTheDocument();
  });

  it("disables auto mode when user manually types in the code field", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("MUM-HO")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("MUM-HO"), "CUSTOM");

    expect(screen.queryByText("auto")).not.toBeInTheDocument();
  });

  it("re-enables auto mode when code field is cleared, then regenerates from name", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("MUM-HO")).toBeInTheDocument());

    const nameInput = screen.getByPlaceholderText("Mumbai Head Office");
    const codeInput = screen.getByPlaceholderText("MUM-HO");

    await userEvent.type(nameInput, "Pune Office");
    expect(codeInput).toHaveValue("PUN-O");
    expect(screen.getByText("auto")).toBeInTheDocument();

    // Manually override the code → auto disabled
    await userEvent.type(codeInput, "X");
    expect(screen.queryByText("auto")).not.toBeInTheDocument();

    // Clear the code → auto re-enabled
    await userEvent.clear(codeInput);
    expect(screen.getByText("auto")).toBeInTheDocument();

    // Typing in name again regenerates the code
    await userEvent.type(nameInput, "!");
    expect(codeInput.value).not.toBe("");
  });

  it("does NOT overwrite a manually set code when the name continues to change", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("MUM-HO")).toBeInTheDocument());

    const codeInput = screen.getByPlaceholderText("MUM-HO");
    await userEvent.type(codeInput, "MYCODE");
    expect(screen.queryByText("auto")).not.toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Another Name");
    expect(codeInput).toHaveValue("MYCODE");
  });
});

// ── 2: Multi-email ────────────────────────────────────────────────────────

describe("BranchForm — multi-email", () => {
  it("starts with one email field and no remove button", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("mumbai@acmetech.in")).toBeInTheDocument());

    const primaryEmail = screen.getByPlaceholderText("mumbai@acmetech.in");
    expect(primaryEmail).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Additional email…")).not.toBeInTheDocument();
  });

  it("adds a second email row on '+ Add email' click", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByText("+ Add email")).toBeInTheDocument());

    await userEvent.click(screen.getByText("+ Add email"));

    expect(screen.getByPlaceholderText("Additional email…")).toBeInTheDocument();
  });

  it("sends primary and additional emails in the createBranch payload", async () => {
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Delhi Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");
    await userEvent.type(screen.getByPlaceholderText("mumbai@acmetech.in"), "primary@acme.com");

    await userEvent.click(screen.getByText("+ Add email"));
    await userEvent.type(screen.getByPlaceholderText("Additional email…"), "info@acme.com");

    await userEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalled());
    const payload = mockApi.createBranch.mock.calls[0][2];
    expect(payload.email).toBe("primary@acme.com");
    expect(payload.additional_emails).toEqual(["info@acme.com"]);
  });
});

// ── 3: Multi-phone ────────────────────────────────────────────────────────

describe("BranchForm — multi-phone", () => {
  it("shows the '+ Add mobile' button initially", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByText("+ Add mobile")).toBeInTheDocument());
  });

  it("adds a second phone row on '+ Add mobile' click", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByText("+ Add mobile")).toBeInTheDocument());
    const initialCount = getPhoneNumberInputs().length;

    await userEvent.click(screen.getByText("+ Add mobile"));

    expect(getPhoneNumberInputs().length).toBe(initialCount + 1);
  });

  it("sends primary phone and additional_phones in the createBranch payload", async () => {
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Chennai Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");

    const nums = getPhoneNumberInputs();
    await userEvent.type(nums[0], "9876543210");

    await userEvent.click(screen.getByText("+ Add mobile"));
    const nums2 = getPhoneNumberInputs();
    await userEvent.type(nums2[1], "1234567890");

    await userEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalled());
    const payload = mockApi.createBranch.mock.calls[0][2];
    expect(payload.phone).toBe("9876543210");
    expect(payload.additional_phones).toHaveLength(1);
    expect(payload.additional_phones[0].number).toBe("1234567890");
  });
});

// ── 4: Employee picker ────────────────────────────────────────────────────

describe("BranchForm — employee picker", () => {
  const employees = [
    { id: "emp-1", full_name: "Aisha Sharma", first_name: "Aisha", last_name: "Sharma", employee_code: "EMP001" },
  ];

  it("calls listActiveEmployees when user types in the manager search field", async () => {
    mockApi.listActiveEmployees.mockResolvedValue({ data: { data: employees } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText(/search employee/i)).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText(/search employee/i), "Aish");

    await waitFor(() => expect(mockApi.listActiveEmployees).toHaveBeenCalled());
  });

  it("shows employee results in the dropdown after search", async () => {
    mockApi.listActiveEmployees.mockResolvedValue({ data: { data: employees } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText(/search employee/i)).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText(/search employee/i), "Aisha");

    await waitFor(() => expect(screen.getByText("Aisha Sharma")).toBeInTheDocument());
  });

  it("sets branch_manager_id in the payload when an employee is selected from the dropdown", async () => {
    mockApi.listActiveEmployees.mockResolvedValue({ data: { data: employees } });
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Pune Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");

    await userEvent.type(screen.getByPlaceholderText(/search employee/i), "Aisha");
    await waitFor(() => expect(screen.getByText("Aisha Sharma")).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByText("Aisha Sharma"));

    expect(screen.getByText(/✓ Linked/i)).toBeInTheDocument();

    await userEvent.click(screen.getByText("Create Branch"));
    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalled());

    const payload = mockApi.createBranch.mock.calls[0][2];
    expect(payload.branch_manager_id).toBe("emp-1");
    expect(payload.branch_manager).toBe("Aisha Sharma");
  });

  it("nulls out branch_manager_id in payload when 'Remove link' is clicked after picking", async () => {
    mockApi.listActiveEmployees.mockResolvedValue({ data: { data: employees } });
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Test Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");

    await userEvent.type(screen.getByPlaceholderText(/search employee/i), "Aisha");
    await waitFor(() => expect(screen.getByText("Aisha Sharma")).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByText("Aisha Sharma"));
    await userEvent.click(screen.getByTitle("Remove link"));

    await userEvent.click(screen.getByText("Create Branch"));
    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalled());

    const payload = mockApi.createBranch.mock.calls[0][2];
    expect(payload.branch_manager_id).toBeNull();
  });
});

// ── 5: Validation ─────────────────────────────────────────────────────────

describe("BranchForm — validation", () => {
  it("shows 'Branch name is required' and does not call API when name is empty", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByText("Create Branch")).toBeInTheDocument());

    await userEvent.click(screen.getByText("Create Branch"));

    expect(screen.getByText("Branch name is required.")).toBeInTheDocument();
    expect(mockApi.createBranch).not.toHaveBeenCalled();
  });

  it("shows 'select a company' error when no company is chosen", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Test Branch");
    await userEvent.click(screen.getByText("Create Branch"));

    expect(screen.getByText("Please select a company.")).toBeInTheDocument();
    expect(mockApi.createBranch).not.toHaveBeenCalled();
  });

  it("shows GSTIN format error when GST is enabled and GSTIN is invalid", async () => {
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Test Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");
    fireEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByPlaceholderText("22AAAAA0000A1Z5"), "BADGSTIN");
    await userEvent.click(screen.getByText("Create Branch"));

    expect(screen.getByText(/Invalid GSTIN format/i)).toBeInTheDocument();
    expect(mockApi.createBranch).not.toHaveBeenCalled();
  });

  it("passes validation and calls API with a valid 15-char GSTIN", async () => {
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Test Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");
    fireEvent.click(screen.getByRole("checkbox"));
    await userEvent.type(screen.getByPlaceholderText("22AAAAA0000A1Z5"), "22AAAAA0000A1Z5");
    await userEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalled());
    expect(screen.queryByText(/Invalid GSTIN format/i)).not.toBeInTheDocument();
  });
});

// ── 6: Create flow ────────────────────────────────────────────────────────

describe("BranchForm — create flow", () => {
  it("calls createBranch with branch_name and company_id and navigates away", async () => {
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Chennai Office");
    await userEvent.selectOptions(getCompanySelect(), "c1");
    await userEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalledOnce());
    const payload = mockApi.createBranch.mock.calls[0][2];
    expect(payload.branch_name).toBe("Chennai Office");
    expect(payload.company_id).toBe("c1");

    await waitFor(() => expect(screen.getByText("Branch List")).toBeInTheDocument());
  });

  it("includes landline in the createBranch payload when entered", async () => {
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "Landline Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");

    const landlineInput = screen.getByPlaceholderText("02212345678");
    await userEvent.type(landlineInput, "02212345678");

    await userEvent.click(screen.getByText("Create Branch"));
    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalled());

    const payload = mockApi.createBranch.mock.calls[0][2];
    expect(payload.landline).toBe("02212345678");
  });

  it("sends landline as null when the landline field is left empty", async () => {
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "No Landline Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");
    await userEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalled());
    const payload = mockApi.createBranch.mock.calls[0][2];
    expect(payload.landline).toBeNull();
  });
});

// ── 7: GST certificate upload ─────────────────────────────────────────────

describe("BranchForm — GST certificate upload", () => {
  it("calls uploadBranchGstCert with the new branch id and FormData after a successful create", async () => {
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    mockApi.uploadBranchGstCert.mockResolvedValue({});

    const { container } = renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "GST Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");
    fireEvent.click(screen.getByRole("checkbox"));

    const fileInput = container.querySelector("input[type='file']");
    const file = new File(["pdf content"], "gst-cert.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput, file);

    await userEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalled());
    await waitFor(() =>
      expect(mockApi.uploadBranchGstCert).toHaveBeenCalledWith(
        "acme", "test-token", "br-new", expect.any(FormData)
      )
    );
    // The component navigates to the branch list after the upload completes.
    // Verifying the upload API was called with the correct id is the key assertion.
    await waitFor(() => expect(screen.getByText("Branch List")).toBeInTheDocument());
  });

  it("still navigates away (branch is saved) even when the cert upload API rejects", async () => {
    // The component catches the upload error internally, sets a local error state,
    // and then calls navigate() regardless — the branch record is already saved.
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    mockApi.uploadBranchGstCert.mockRejectedValue(new Error("network error"));

    const { container } = renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "GST Branch Fail");
    await userEvent.selectOptions(getCompanySelect(), "c1");
    fireEvent.click(screen.getByRole("checkbox"));

    const fileInput = container.querySelector("input[type='file']");
    const file = new File(["pdf"], "cert.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput, file);

    await userEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => expect(mockApi.uploadBranchGstCert).toHaveBeenCalledWith(
      "acme", "test-token", "br-new", expect.any(FormData)
    ));
    // Branch is saved; navigate() is called after the upload attempt regardless of outcome.
    await waitFor(() => expect(screen.getByText("Branch List")).toBeInTheDocument());
  });

  it("does NOT call uploadBranchGstCert when no file was selected", async () => {
    mockApi.createBranch.mockResolvedValue({ data: { data: { id: "br-new" } } });
    renderCreateForm();
    await waitFor(() => expect(screen.getByPlaceholderText("Mumbai Head Office")).toBeInTheDocument());

    await userEvent.type(screen.getByPlaceholderText("Mumbai Head Office"), "No File Branch");
    await userEvent.selectOptions(getCompanySelect(), "c1");
    await userEvent.click(screen.getByText("Create Branch"));

    await waitFor(() => expect(mockApi.createBranch).toHaveBeenCalled());
    expect(mockApi.uploadBranchGstCert).not.toHaveBeenCalled();
  });
});

// ── 8: Edit prefill ───────────────────────────────────────────────────────

describe("BranchForm — edit mode prefill", () => {
  const branchData = {
    company_id: "c1",
    branch_name: "Mumbai HO",
    branch_code: "MUM-HO",
    branch_type: "Head Office",
    branch_manager: "Aisha Sharma",
    branch_manager_id: "emp-1",
    landline: "02212345678",
    landline_country_code: "+91",
    email: "mum@acme.com",
    phone: "9876543210",
    phone_country_code: "+91",
    additional_emails: ["info@acme.com"],
    additional_phones: [{ number: "1234567890", country_code: "+1" }],
    gst_registered: false,
    gst_certificate_name: "",
    description: "",
  };

  beforeEach(() => {
    mockApi.getBranch.mockResolvedValue({ data: { data: branchData } });
  });

  it("prefills branch name and code from the API response", async () => {
    renderEditForm("br-1");
    await waitFor(() => expect(mockApi.getBranch).toHaveBeenCalled());

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Mumbai Head Office")).toHaveValue("Mumbai HO")
    );
    expect(screen.getByPlaceholderText("MUM-HO")).toHaveValue("MUM-HO");
  });

  it("shows '✓ Linked' when branch_manager_id is set in the loaded data", async () => {
    renderEditForm("br-1");
    await waitFor(() => expect(mockApi.getBranch).toHaveBeenCalled());

    await waitFor(() =>
      expect(screen.getByText(/✓ Linked/i)).toBeInTheDocument()
    );
  });

  it("restores primary email and additional email into separate input rows", async () => {
    renderEditForm("br-1");
    await waitFor(() => expect(mockApi.getBranch).toHaveBeenCalled());

    await waitFor(() => {
      const emailInputs = [
        screen.queryByPlaceholderText("mumbai@acmetech.in"),
        screen.queryByPlaceholderText("Additional email…"),
      ].filter(Boolean);
      expect(emailInputs.length).toBeGreaterThanOrEqual(2);
      expect(emailInputs[0]).toHaveValue("mum@acme.com");
      expect(emailInputs[1]).toHaveValue("info@acme.com");
    });
  });

  it("restores primary phone into first phone row and additional phone into second", async () => {
    renderEditForm("br-1");
    await waitFor(() => expect(mockApi.getBranch).toHaveBeenCalled());

    await waitFor(() => {
      const nums = getPhoneNumberInputs();
      expect(nums.length).toBeGreaterThanOrEqual(2);
      expect(nums[0]).toHaveValue("9876543210");
      expect(nums[1]).toHaveValue("1234567890");
    });
  });

  it("restores landline from API into the Landline input", async () => {
    renderEditForm("br-1");
    await waitFor(() => expect(mockApi.getBranch).toHaveBeenCalled());

    await waitFor(() =>
      expect(screen.getByPlaceholderText("02212345678")).toHaveValue("02212345678")
    );
  });
});

// ── 9: BranchList navigation ──────────────────────────────────────────────

describe("BranchList — navigation", () => {
  const branches = [
    { id: "br-1", branch_name: "Mumbai HO",    branch_code: "MUM-HO", is_active: true,  active_employees: 5, total_employees: 6 },
    { id: "br-2", branch_name: "Delhi Office", branch_code: "DEL-O",  is_active: true,  active_employees: 3, total_employees: 3 },
  ];

  beforeEach(() => {
    mockApi.listBranches.mockResolvedValue({ data: { data: { data: branches, total: 2 } } });
  });

  it("renders branch names returned by the API", async () => {
    renderList();
    await waitFor(() => expect(screen.getByText("Mumbai HO")).toBeInTheDocument());
    expect(screen.getByText("Delhi Office")).toBeInTheDocument();
  });

  it("navigates to /org/branches/new when '+ Add Branch' is clicked", async () => {
    renderList();
    await waitFor(() => expect(screen.getByRole("button", { name: /Add Branch/i })).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Add Branch/i }));

    await waitFor(() => expect(screen.getByText("New Branch Page")).toBeInTheDocument());
  });

  it("navigates to /:id/edit when the Edit button for a branch is clicked", async () => {
    renderList();
    await waitFor(() => expect(screen.getByText("Mumbai HO")).toBeInTheDocument());

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await userEvent.click(editButtons[0]);

    await waitFor(() => expect(screen.getByText("Edit Branch Page")).toBeInTheDocument());
  });
});
