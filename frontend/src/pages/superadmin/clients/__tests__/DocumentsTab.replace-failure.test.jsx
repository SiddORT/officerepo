import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "client-456" }),
  useNavigate: () => vi.fn(),
}));

const mockReplaceDocument = vi.fn();

vi.mock("../../../../services/apiClient", () => ({
  clientsApi: {
    uploadDocument: vi.fn().mockResolvedValue({ data: { data: {} } }),
    replaceDocument: (...args) => mockReplaceDocument(...args),
    deleteDocument: vi.fn(),
    downloadDocument: vi.fn(),
    contacts: vi.fn().mockResolvedValue({ data: { data: [] } }),
    billing: vi.fn().mockResolvedValue({ data: { data: null } }),
    subscription: vi.fn().mockResolvedValue({ data: { data: null } }),
    modules: vi.fn().mockResolvedValue({ data: { data: [] } }),
    database: vi.fn().mockResolvedValue({ data: { data: null } }),
    domains: vi.fn().mockResolvedValue({ data: { data: [] } }),
    adminUsers: vi.fn().mockResolvedValue({ data: { data: [] } }),
    activities: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

vi.mock("../../../../components/ui/Modal", () => ({
  default: ({ children, open }) => open ? <div data-testid="modal">{children}</div> : null,
}));
vi.mock("../../../../components/ui/Input", () => ({
  default: ({ label, ...props }) => <div><label>{label}</label><input {...props} /></div>,
}));
vi.mock("../../../../components/ui/Select", () => ({
  default: ({ label, children, ...props }) => <div><label>{label}</label><select {...props}>{children}</select></div>,
}));
vi.mock("../../../../components/ui/CountryCodeSelect", () => ({
  default: (props) => <select {...props}><option value="+91">+91</option></select>,
}));
vi.mock("../../../../components/ui/Toggle", () => ({
  default: ({ checked, onChange }) => <input type="checkbox" checked={checked} onChange={onChange} />,
}));
vi.mock("../../../../components/ui/ActionIcons", () => ({
  EditIconBtn: ({ onClick, title }) => <button onClick={onClick}>{title || "Edit"}</button>,
  DeleteIconBtn: ({ onClick, title, disabled }) => <button onClick={onClick} disabled={disabled}>{title || "Delete"}</button>,
}));
vi.mock("../../../../components/ui/ConfirmDialog", () => ({
  default: ({ open, onConfirm, onCancel, title }) =>
    open ? <div><p>{title}</p><button onClick={onConfirm}>Confirm</button><button onClick={onCancel}>Cancel</button></div> : null,
}));
vi.mock("./components/StatusBadge", () => ({
  StatusBadge: ({ status }) => <span>{status}</span>,
  DbStatusBadge: ({ status }) => <span>{status}</span>,
  SubscriptionStatusBadge: ({ status }) => <span>{status}</span>,
  AdminStatusBadge: ({ status }) => <span>{status}</span>,
}));

import { DocumentsTab } from "../ClientDetails";

const STUB_DOC = {
  id: "doc-001",
  file_name: "contract.pdf",
  document_type: "Contract",
  created_at: "2024-01-01T00:00:00Z",
  has_file: true,
};

describe("Client DocumentsTab — replace failure UX", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockReplaceDocument.mockRejectedValue({
      response: { data: { detail: "Replace failed. Use ↺ Retry to try again." } },
    });
    mockOnChange.mockClear();
  });

  it("shows the error banner when replace fails", async () => {
    render(
      <DocumentsTab
        clientId="client-456"
        documents={[STUB_DOC]}
        options={{ document_type_master: [] }}
        onChange={mockOnChange}
      />
    );

    const [replaceBtn] = screen.getAllByRole("button", { name: /^replace$/i });
    await userEvent.click(replaceBtn);

    const modal = document.querySelector(".fixed");
    const testFile = new File(["pdf content"], "new-contract.pdf", { type: "application/pdf" });
    await userEvent.upload(modal.querySelector('input[type="file"]'), testFile);

    const submitBtn = within(modal).getByRole("button", { name: /^replace$/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/replace failed/i)).toBeInTheDocument();
    });
  });

  it("shows the '↺ Retry replace' button when replace fails and a file is still chosen", async () => {
    render(
      <DocumentsTab
        clientId="client-456"
        documents={[STUB_DOC]}
        options={{ document_type_master: [] }}
        onChange={mockOnChange}
      />
    );

    const [replaceBtn] = screen.getAllByRole("button", { name: /^replace$/i });
    await userEvent.click(replaceBtn);

    const modal = document.querySelector(".fixed");
    const testFile = new File(["pdf content"], "new-contract.pdf", { type: "application/pdf" });
    await userEvent.upload(modal.querySelector('input[type="file"]'), testFile);

    const submitBtn = within(modal).getByRole("button", { name: /^replace$/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /↺ retry replace/i })).toBeInTheDocument();
    });
  });

  it("does NOT show the retry replace button before any replace attempt", () => {
    render(
      <DocumentsTab
        clientId="client-456"
        documents={[STUB_DOC]}
        options={{ document_type_master: [] }}
        onChange={mockOnChange}
      />
    );

    expect(screen.queryByRole("button", { name: /↺ retry replace/i })).not.toBeInTheDocument();
  });
});
