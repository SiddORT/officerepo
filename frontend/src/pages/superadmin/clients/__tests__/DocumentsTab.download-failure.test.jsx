import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "client-456" }),
  useNavigate: () => vi.fn(),
}));

const mockDownloadDocument = vi.fn();

vi.mock("../../../../services/apiClient", () => ({
  clientsApi: {
    downloadDocument: (...args) => mockDownloadDocument(...args),
    uploadDocument: vi.fn(),
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

const sampleDoc = {
  id: "doc-002",
  file_name: "invoice.pdf",
  document_type: "Invoice",
  has_file: true,
  created_at: "2026-01-01T00:00:00Z",
};

describe("Client DocumentsTab — download failure UX", () => {
  const mockOnChange = vi.fn();
  let alertSpy;

  beforeEach(() => {
    mockDownloadDocument.mockRejectedValue({
      response: { data: { detail: "File not found on server." } },
    });
    mockOnChange.mockClear();
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("calls alert with the server error message when download fails", async () => {
    render(
      <DocumentsTab
        clientId="client-456"
        documents={[sampleDoc]}
        options={{ document_type_master: [] }}
        onChange={mockOnChange}
      />
    );

    const downloadBtn = screen.getByRole("button", { name: /^download$/i });
    await userEvent.click(downloadBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("File not found on server.");
    });
  });

  it("calls alert with the fallback message when the server returns no detail", async () => {
    mockDownloadDocument.mockRejectedValue(new Error("Network Error"));

    render(
      <DocumentsTab
        clientId="client-456"
        documents={[sampleDoc]}
        options={{ document_type_master: [] }}
        onChange={mockOnChange}
      />
    );

    const downloadBtn = screen.getByRole("button", { name: /^download$/i });
    await userEvent.click(downloadBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Download failed.");
    });
  });

  it("calls downloadDocument with the correct client and document IDs", async () => {
    mockDownloadDocument.mockRejectedValue(new Error("Network Error"));

    render(
      <DocumentsTab
        clientId="client-456"
        documents={[sampleDoc]}
        options={{ document_type_master: [] }}
        onChange={mockOnChange}
      />
    );

    const downloadBtn = screen.getByRole("button", { name: /^download$/i });
    await userEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockDownloadDocument).toHaveBeenCalledWith("client-456", "doc-002");
    });
  });
});
