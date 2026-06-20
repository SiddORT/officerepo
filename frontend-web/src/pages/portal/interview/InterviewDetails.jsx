import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

export default function InterviewDetails() {
  const { subdomain, interviewId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    portalInterviewApi.get(subdomain, token, interviewId)
      .then(r => setInterview(r.data?.data || null))
      .catch(() => navigate(`/portal/${subdomain}/hrms/interviews`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [interviewId]);

  const doAction = async (fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try { await fn(); load(); } catch (e) { alert(e.response?.data?.message || "Action failed."); }
  };

  if (loading) return <div className="t-muted" style={{ padding: 32 }}>Loading…</div>;
  if (!interview) return null;

  const iv = interview;
  const isScheduled = iv.status === "Scheduled";

  const RESULT_COLORS = { Pass: "#22c55e", Selected: "#10b981", Fail: "#ef4444", Hold: "#f59e0b" };

  const Row = ({ label, value }) => value ? (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--c-border)" }}>
      <div style={{ minWidth: 160, fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>{label}</div>
      <div style={{ fontSize: 13 }}>{value}</div>
    </div>
  ) : null;

  const SectionHead = ({ label }) => (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 8px" }}>{label}</div>
  );

  return (
    <div>
      <PageHeader
        title={iv.interview_number}
        subtitle={`${iv.round_type || iv.round_name || `Round ${iv.round_number}`} · ${iv.candidate_name || "—"}`}
        breadcrumbs={[
          { label: "Interview Management", path: `/portal/${subdomain}/hrms/interviews` },
          { label: "All Interviews", path: `/portal/${subdomain}/hrms/interviews/list` },
          { label: iv.interview_number },
        ]}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isScheduled && <>
              <button onClick={() => navigate(`/portal/${subdomain}/hrms/interviews/${iv.id}/edit`)} className="btn-secondary">Edit</button>
              <button onClick={() => navigate(`/portal/${subdomain}/hrms/interviews/${iv.id}/complete`)} className="btn-primary">Mark Complete</button>
              <button onClick={() => doAction(() => portalInterviewApi.noShow(subdomain, token, iv.id), "Mark as No Show?")}
                style={{ padding: "8px 16px", background: "none", border: "1px solid #f59e0b", color: "#f59e0b", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                No Show
              </button>
              <button onClick={() => doAction(() => portalInterviewApi.cancel(subdomain, token, iv.id, {}), "Cancel this interview?")}
                style={{ padding: "8px 16px", background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                Cancel
              </button>
            </>}
          </div>
        }
      />

      {/* Status banner */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <Badge status={iv.status} />
        {iv.result && iv.result !== "Pending" && (
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: (RESULT_COLORS[iv.result] || "#6b7280") + "22", color: RESULT_COLORS[iv.result] || "#6b7280" }}>
            {iv.result}
          </span>
        )}
        {iv.feedback_rating && (
          <span className="t-muted" style={{ fontSize: 12 }}>Rating: {iv.feedback_rating}</span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Left column */}
        <div className="card" style={{ padding: 20 }}>
          <SectionHead label="Interview Details" />
          <Row label="Interview #"    value={iv.interview_number} />
          <Row label="Candidate"      value={iv.candidate_name} />
          <Row label="Job Opening"    value={iv.opening_title} />
          <Row label="Round"          value={`Round ${iv.round_number}${iv.round_type ? ` — ${iv.round_type}` : ""}${iv.round_name ? ` (${iv.round_name})` : ""}`} />

          <SectionHead label="Schedule" />
          <Row label="Date"           value={iv.interview_date} />
          <Row label="Time"           value={iv.interview_time} />
          <Row label="Duration"       value={iv.duration_minutes ? `${iv.duration_minutes} minutes` : null} />
          <Row label="Mode"           value={iv.mode} />
          <Row label="Location"       value={iv.location} />
          {iv.meeting_link && (
            <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--c-border)" }}>
              <div style={{ minWidth: 160, fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>Meeting Link</div>
              <a href={iv.meeting_link} target="_blank" rel="noreferrer" className="t-accent" style={{ fontSize: 13, wordBreak: "break-all" }}>{iv.meeting_link}</a>
            </div>
          )}
          <Row label="Interviewers"   value={iv.interviewers} />
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(iv.feedback || iv.feedback_rating) && (
            <div className="card" style={{ padding: 20 }}>
              <SectionHead label="Feedback" />
              {iv.feedback_rating && <div style={{ marginBottom: 8 }}><span className="t-muted" style={{ fontSize: 12 }}>Rating: </span><span style={{ fontWeight: 600 }}>{iv.feedback_rating}</span></div>}
              {iv.feedback && <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{iv.feedback}</p>}
            </div>
          )}

          {iv.notes && (
            <div className="card" style={{ padding: 20 }}>
              <SectionHead label="Notes" />
              <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{iv.notes}</p>
            </div>
          )}

          <div className="card" style={{ padding: 20 }}>
            <SectionHead label="Record Info" />
            <Row label="Created By"  value={iv.created_by} />
            <Row label="Created"     value={iv.created_at?.split("T")[0]} />
            <Row label="Updated"     value={iv.updated_at?.split("T")[0]} />
          </div>
        </div>
      </div>
    </div>
  );
}
