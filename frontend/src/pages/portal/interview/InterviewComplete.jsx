import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const RESULT_COLORS = {
  Pass: "#22c55e", Selected: "#10b981", Fail: "#ef4444",
  Hold: "#f59e0b", Pending: "var(--c-muted)",
};

export default function InterviewComplete() {
  const { subdomain, interviewId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const [interview, setInterview] = useState(null);
  const [meta, setMeta]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [form, setForm] = useState({ result: "", notes: "" });

  useEffect(() => {
    Promise.all([
      portalInterviewApi.get(subdomain, token, interviewId),
      portalInterviewApi.metaOptions(subdomain, token),
    ]).then(([iv, m]) => {
      setInterview(iv.data?.data || {});
      setMeta(m.data?.data || {});
    }).catch(() => navigate(base));
  }, [interviewId, subdomain, token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.result) return setError("Please select a result.");
    setSaving(true); setError("");
    try {
      await portalInterviewApi.complete(subdomain, token, interviewId, {
        result: form.result,
        notes: form.notes || null,
      });
      navigate(`${base}/${interviewId}?tab=Feedback`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to complete interview.");
    } finally {
      setSaving(false);
    }
  };

  if (!interview) return <div className="t-muted" style={{ padding: 32 }}>Loading…</div>;

  const iv = interview;
  const results = (meta.interview_results || []).filter(r => r !== "Pending");

  return (
    <div>
      <PageHeader
        title="Complete Interview"
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "All Interviews",       path: `${base}/list` },
          { label: iv.interview_number,    path: `${base}/${interviewId}` },
          { label: "Complete" },
        ]}
      />

      <div className="card" style={{ padding: 20, maxWidth: 520, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
          Interview Summary
        </div>
        <div style={{ fontSize: 13, marginBottom: 4 }}><span className="t-muted">Candidate: </span><strong>{iv.candidate_name || "—"}</strong></div>
        <div style={{ fontSize: 13, marginBottom: 4 }}><span className="t-muted">Round: </span>{iv.round_type || iv.round_name || `Round ${iv.round_number}`}</div>
        <div style={{ fontSize: 13 }}><span className="t-muted">Date: </span>{iv.interview_date}{iv.start_time ? ` at ${iv.start_time}` : ""}</div>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 24, maxWidth: 520 }}>
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)", display: "block", marginBottom: 8 }}>
            Result <span style={{ color: "#ef4444" }}>*</span>
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {results.map(r => (
              <button key={r} type="button" onClick={() => set("result", r)}
                style={{
                  padding: "8px 18px", borderRadius: 8, border: "2px solid",
                  borderColor: form.result === r ? RESULT_COLORS[r] || "var(--c-accent)" : "var(--c-border)",
                  background: form.result === r ? `${RESULT_COLORS[r] || "var(--c-accent)"}22` : "transparent",
                  color: form.result === r ? RESULT_COLORS[r] || "var(--c-accent)" : "var(--c-fg)",
                  cursor: "pointer", fontSize: 13,
                  fontWeight: form.result === r ? 700 : 400,
                }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)", display: "block", marginBottom: 6 }}>
            Notes (optional)
          </label>
          <textarea
            value={form.notes}
            onChange={e => set("notes", e.target.value)}
            className="input-field" rows={3}
            style={{ resize: "vertical", width: "100%", boxSizing: "border-box" }}
            placeholder="Brief notes about the outcome…"
          />
        </div>

        <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "12px 14px", marginBottom: 20, fontSize: 12, color: "#a5b4fc" }}>
          💡 After completing, you'll be taken to the Feedback tab to add a detailed scorecard and recommendation.
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Mark Completed"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
