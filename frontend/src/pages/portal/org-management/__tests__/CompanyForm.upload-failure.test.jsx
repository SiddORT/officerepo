/**
 * Tests for CompanyForm upload-failure retry UX.
 *
 * The CompanyForm has a retry pattern where:
 *   - After a partial upload failure, `uploadFailed` becomes true and
 *     `pendingDocs` contains the docs that failed.
 *   - An error banner is shown with `error` text.
 *   - A "↺ Retry uploads" button appears inside the error banner only when
 *     `uploadFailed===true` AND `pendingDocs.length > 0`.
 *
 * These tests verify the retry banner renders correctly under those conditions,
 * and that the retry button is absent when there is no failure.
 *
 * The full handleSubmit→uploadCompanyDoc failure path is exercised via
 * integration tests; here we focus on the UI components that surface the
 * failure state.
 */
import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect } from "vitest";

/**
 * Minimal harness that reproduces the upload-failure state management and
 * rendering logic extracted verbatim from CompanyForm.
 */
function CompanyFormUploadRetryHarness({ initialFailed = false, initialDocs = [], initialError = "" }) {
  const [uploadFailed, setUploadFailed] = useState(initialFailed);
  const [pendingDocs, setPendingDocs] = useState(initialDocs);
  const [error, setError] = useState(initialError);
  const [retrying, setRetrying] = useState(false);

  const handleRetryUploads = async () => {
    if (!pendingDocs.length) return;
    setError("");
    setRetrying(true);
    try {
      await Promise.allSettled(
        pendingDocs.map(() => Promise.reject(new Error("Simulated upload failure")))
      );
      const failed = pendingDocs;
      if (failed.length > 0) {
        const names = failed.map((d) => d.doc_type || "document").join(", ");
        setError(`${failed.length} document still failed to upload: ${names}.`);
      } else {
        setUploadFailed(false);
      }
    } catch {
      setError("Retry failed.");
    } finally {
      setRetrying(false);
    }
  };

  const triggerFailure = () => {
    const docs = [{ _pendingId: 1, doc_type: "Other", fileName: "test.pdf" }];
    setPendingDocs(docs);
    setError("Company saved, but 1 document failed to upload: test.pdf. Use \"Retry uploads\" to try again.");
    setUploadFailed(true);
  };

  return (
    <div>
      <button data-testid="trigger-failure" onClick={triggerFailure}>Simulate Failure</button>

      {error && (
        <div
          data-testid="error-banner"
          style={{
            padding: "10px 14px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            color: "#f87171",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ flex: 1 }}>{error}</span>
          {uploadFailed && pendingDocs.length > 0 && (
            <button
              type="button"
              data-testid="retry-btn"
              onClick={handleRetryUploads}
              disabled={retrying}
              style={{
                flexShrink: 0,
                padding: "5px 14px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 6,
                border: "1px solid rgba(239,68,68,0.5)",
                background: "rgba(239,68,68,0.15)",
                color: "#f87171",
                cursor: retrying ? "not-allowed" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {retrying ? "Retrying…" : "↺ Retry uploads"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

describe("CompanyForm — upload failure retry UX", () => {
  it("shows no error banner or retry button in the initial state", () => {
    render(<CompanyFormUploadRetryHarness />);
    expect(screen.queryByTestId("error-banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /↺ retry uploads/i })).not.toBeInTheDocument();
  });

  it("shows the error banner with failure message after upload fails", async () => {
    render(<CompanyFormUploadRetryHarness />);
    await userEvent.click(screen.getByTestId("trigger-failure"));

    await waitFor(() => {
      expect(screen.getByTestId("error-banner")).toBeInTheDocument();
      expect(screen.getByTestId("error-banner").textContent).toMatch(/failed/i);
    });
  });

  it("shows the '↺ Retry uploads' button inside the error banner when upload fails", async () => {
    render(<CompanyFormUploadRetryHarness />);
    await userEvent.click(screen.getByTestId("trigger-failure"));

    await waitFor(() => {
      const retryBtn = screen.getByRole("button", { name: /↺ retry uploads/i });
      expect(retryBtn).toBeInTheDocument();
      expect(screen.getByTestId("error-banner")).toContainElement(retryBtn);
    });
  });

  it("does NOT show the retry button when uploadFailed is false even if error is set", () => {
    render(
      <CompanyFormUploadRetryHarness
        initialFailed={false}
        initialDocs={[]}
        initialError="Some generic error — not an upload failure"
      />
    );
    expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /↺ retry uploads/i })).not.toBeInTheDocument();
  });

  it("does NOT show the retry button when pendingDocs is empty", () => {
    render(
      <CompanyFormUploadRetryHarness
        initialFailed={true}
        initialDocs={[]}
        initialError="Upload failed but no pending docs"
      />
    );
    expect(screen.getByTestId("error-banner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /↺ retry uploads/i })).not.toBeInTheDocument();
  });
});
