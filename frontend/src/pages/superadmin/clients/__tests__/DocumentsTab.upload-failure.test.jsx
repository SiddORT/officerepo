import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "client-456" }),
  useNavigate: () => vi.fn(),
}));

const mockUploadDocument = vi.fn();

vi.mock("../../../../services/apiClient", () => ({
  clientsApi: {
    uploadDocument: (...args) => mockUploadDocument(...args),
    downloadDocument: vi.fn(),
    replaceDocument: vi.fn(),
    deleteDocument: vi.fn(),
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

describe("Client DocumentsTab — upload failure UX", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockUploadDocument.mockRejectedValue({
      response: { data: { detail: "Upload failed. Use ↺ Retry to try again." } },
    });
    mockOnChange.mockClear();
  });

  it("shows the error banner with the failure message when upload fails", async () => {
    render(
      <DocumentsTab
        clientId="client-456"
        documents={[]}
        options={{ document_type_master: [] }}
        onChange={mockOnChange}
      />
    );

    const fileInput = document.querySelector('input[type="file"]');
    const testFile = new File(["dummy content"], "test-fail.txt", { type: "text/plain" });
    await userEvent.upload(fileInput, testFile);

    const uploadBtn = screen.getByRole("button", { name: /^upload$/i });
    await userEvent.click(uploadBtn);

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  it("shows the '↺ Retry upload' button when upload fails and a file is still selected", async () => {
    render(
      <DocumentsTab
        clientId="client-456"
        documents={[]}
        options={{ document_type_master: [] }}
        onChange={mockOnChange}
      />
    );

    const fileInput = document.querySelector('input[type="file"]');
    const testFile = new File(["dummy content"], "test-fail.txt", { type: "text/plain" });
    await userEvent.upload(fileInput, testFile);

    const uploadBtn = screen.getByRole("button", { name: /^upload$/i });
    await userEvent.click(uploadBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /↺ retry upload/i })).toBeInTheDocument();
    });
  });

  it("does not show the retry button before any upload attempt", () => {
    render(
      <DocumentsTab
        clientId="client-456"
        documents={[]}
        options={{ document_type_master: [] }}
        onChange={mockOnChange}
      />
    );

    expect(screen.queryByRole("button", { name: /↺ retry upload/i })).not.toBeInTheDocument();
  });
});
