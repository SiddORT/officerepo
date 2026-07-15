import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "lead-123" }),
  useNavigate: () => vi.fn(),
}));

const mockDownloadDocument = vi.fn();
const mockDocuments = vi.fn();

vi.mock("../../../../services/apiClient", () => ({
  leadsApi: {
    documents: (...args) => mockDocuments(...args),
    downloadDocument: (...args) => mockDownloadDocument(...args),
    uploadDocument: vi.fn(),
    replaceDocument: vi.fn(),
    deleteDocument: vi.fn(),
    spokespersons: vi.fn().mockResolvedValue({ data: { data: [] } }),
    activities: vi.fn().mockResolvedValue({ data: { data: [] } }),
    demos: vi.fn().mockResolvedValue({ data: { data: [] } }),
    followups: vi.fn().mockResolvedValue({ data: { data: [] } }),
    notes: vi.fn().mockResolvedValue({ data: { data: [] } }),
    proposals: vi.fn().mockResolvedValue({ data: { data: [] } }),
    negotiations: vi.fn().mockResolvedValue({ data: { data: [] } }),
    conversions: vi.fn().mockResolvedValue({ data: { data: [] } }),
    timeline: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
  rbacApi: {
    myPermissions: vi.fn().mockResolvedValue({ data: { data: { permissions: [] } } }),
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
vi.mock("../../../../components/ui/Textarea", () => ({
  default: ({ label, ...props }) => <div><label>{label}</label><textarea {...props} /></div>,
}));
vi.mock("../../../../components/ui/ActionIcons", () => ({
  EditIconBtn: ({ onClick, title }) => <button onClick={onClick}>{title || "Edit"}</button>,
  DeleteIconBtn: ({ onClick, title }) => <button onClick={onClick}>{title || "Delete"}</button>,
}));
vi.mock("../../../../components/ui/ConfirmDialog", () => ({
  default: ({ open, onConfirm, onCancel, title }) =>
    open ? <div><p>{title}</p><button onClick={onConfirm}>Confirm</button><button onClick={onCancel}>Cancel</button></div> : null,
}));
vi.mock("./components/StageBadge", () => ({
  StageBadge: ({ stage }) => <span>{stage}</span>,
  StatusBadge: ({ status }) => <span>{status}</span>,
}));
vi.mock("./components/ScoreBadge", () => ({
  default: () => <span>Score</span>,
}));
vi.mock("./components/Timeline", () => ({
  default: () => <div>Timeline</div>,
}));

import { DocumentsTab } from "../LeadDetails";

const sampleDoc = {
  id: "doc-001",
  file_name: "contract.pdf",
  document_type: "Contract",
  has_file: true,
  created_at: "2026-01-01T00:00:00Z",
};

describe("Lead DocumentsTab — download failure UX", () => {
  let alertSpy;

  beforeEach(() => {
    mockDocuments.mockResolvedValue({ data: { data: [sampleDoc] } });
    mockDownloadDocument.mockRejectedValue({
      response: { data: { detail: "File not found on server." } },
    });
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it("calls alert with the server error message when download fails", async () => {
    render(<DocumentsTab leadId="lead-123" options={{}} />);

    const downloadBtn = await screen.findByRole("button", { name: /download/i });
    await userEvent.click(downloadBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("File not found on server.");
    });
  });

  it("calls alert with the fallback message when the server returns no detail", async () => {
    mockDownloadDocument.mockRejectedValue(new Error("Network Error"));

    render(<DocumentsTab leadId="lead-123" options={{}} />);

    const downloadBtn = await screen.findByRole("button", { name: /download/i });
    await userEvent.click(downloadBtn);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Download failed.");
    });
  });

  it("calls downloadDocument with the correct lead and document IDs", async () => {
    mockDownloadDocument.mockRejectedValue(new Error("Network Error"));

    render(<DocumentsTab leadId="lead-123" options={{}} />);

    const downloadBtn = await screen.findByRole("button", { name: /download/i });
    await userEvent.click(downloadBtn);

    await waitFor(() => {
      expect(mockDownloadDocument).toHaveBeenCalledWith("lead-123", "doc-001");
    });
  });
});
