import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("react-router-dom", () => ({
  useParams: () => ({ id: "lead-123" }),
  useNavigate: () => vi.fn(),
}));

const mockUploadDocument = vi.fn();
const mockDocuments = vi.fn();

vi.mock("../../../../services/apiClient", () => ({
  leadsApi: {
    documents: (...args) => mockDocuments(...args),
    uploadDocument: (...args) => mockUploadDocument(...args),
    spokespersons: vi.fn().mockResolvedValue({ data: { data: [] } }),
    activities: vi.fn().mockResolvedValue({ data: { data: [] } }),
    demos: vi.fn().mockResolvedValue({ data: { data: [] } }),
    followups: vi.fn().mockResolvedValue({ data: { data: [] } }),
    notes: vi.fn().mockResolvedValue({ data: { data: [] } }),
    proposals: vi.fn().mockResolvedValue({ data: { data: [] } }),
    negotiations: vi.fn().mockResolvedValue({ data: { data: [] } }),
    conversions: vi.fn().mockResolvedValue({ data: { data: [] } }),
    timeline: vi.fn().mockResolvedValue({ data: { data: [] } }),
    downloadDocument: vi.fn(),
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

describe("Lead DocumentsTab — upload failure UX", () => {
  beforeEach(() => {
    mockDocuments.mockResolvedValue({ data: { data: [] } });
    mockUploadDocument.mockRejectedValue({
      response: { data: { detail: "Upload failed. Use ↺ Retry to try again." } },
    });
  });

  it("shows the error banner with the failure message when upload fails", async () => {
    render(<DocumentsTab leadId="lead-123" options={{}} />);

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
    render(<DocumentsTab leadId="lead-123" options={{}} />);

    const fileInput = document.querySelector('input[type="file"]');
    const testFile = new File(["dummy content"], "test-fail.txt", { type: "text/plain" });
    await userEvent.upload(fileInput, testFile);

    const uploadBtn = screen.getByRole("button", { name: /^upload$/i });
    await userEvent.click(uploadBtn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /↺ retry upload/i })).toBeInTheDocument();
    });
  });

  it("does NOT show the retry button when there is no error", async () => {
    mockUploadDocument.mockResolvedValue({ data: { data: {} } });
    render(<DocumentsTab leadId="lead-123" options={{}} />);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /↺ retry upload/i })).not.toBeInTheDocument();
    });
  });
});
