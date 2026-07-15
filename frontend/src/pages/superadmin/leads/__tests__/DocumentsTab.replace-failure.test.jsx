import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "lead-123" }),
  useNavigate: () => vi.fn(),
}));

const mockReplaceDocument = vi.fn();
const mockDocuments = vi.fn();

vi.mock("../../../../services/apiClient", () => ({
  leadsApi: {
    documents: (...args) => mockDocuments(...args),
    uploadDocument: vi.fn().mockResolvedValue({ data: { data: {} } }),
    replaceDocument: (...args) => mockReplaceDocument(...args),
    deleteDocument: vi.fn(),
    downloadDocument: vi.fn(),
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

const STUB_DOC = {
  id: "doc-001",
  file_name: "contract.pdf",
  document_type: "Contract",
  created_at: "2024-01-01T00:00:00Z",
  has_file: true,
};

describe("Lead DocumentsTab — replace failure UX", () => {
  beforeEach(() => {
    mockDocuments.mockResolvedValue({ data: { data: [STUB_DOC] } });
    mockReplaceDocument.mockRejectedValue({
      response: { data: { detail: "Replace failed. Use ↺ Retry to try again." } },
    });
  });

  it("shows the error banner when replace fails", async () => {
    render(<DocumentsTab leadId="lead-123" options={{}} />);

    const replaceBtn = await screen.findByRole("button", { name: /^replace$/i });
    await userEvent.click(replaceBtn);

    const fileInput = document.querySelector('.fixed input[type="file"]');
    const testFile = new File(["pdf content"], "new-contract.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput, testFile);

    const submitBtn = screen.getByRole("button", { name: /^replace file$/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/replace failed/i)).toBeInTheDocument();
    });
  });

  it("shows the '↺ Retry replace' button when replace fails and a file is still chosen", async () => {
    render(<DocumentsTab leadId="lead-123" options={{}} />);

    const replaceBtn = await screen.findByRole("button", { name: /^replace$/i });
    await userEvent.click(replaceBtn);

    const fileInput = document.querySelector('.fixed input[type="file"]');
    const testFile = new File(["pdf content"], "new-contract.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput, testFile);

    const submitBtn = screen.getByRole("button", { name: /^replace file$/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /↺ retry replace/i })).toBeInTheDocument();
    });
  });

  it("does NOT show the retry replace button before any replace attempt", async () => {
    render(<DocumentsTab leadId="lead-123" options={{}} />);

    await screen.findByRole("button", { name: /^replace$/i });

    expect(screen.queryByRole("button", { name: /↺ retry replace/i })).not.toBeInTheDocument();
  });
});
