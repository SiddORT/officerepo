import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

export default function InterviewReschedule() {
  const { subdomain, interviewId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const [interview, setInterview] = useState(null);
  const [meta, setMeta]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [form, setForm] = useState({
    interview_date: "", start_time: "", end_time: "", reschedule_reason: "",
    mode: "", location: "", meeting_url: "",
  });

  useEffect(() => {
    Promise.all([
      portalInterviewApi.get(subdomain, token, interviewId),
      portalInterviewApi.metaOptions(subdomain, token),
    ]).then(([iv, m]) => {
      const d = iv.data?.data || {};
      setInterview(d);
      setMeta(m.data?.data || {});
      setForm({
        interview_date: d.interview_date || "",
        start_time: d.start_time || "",
        end_time: d.end_time || "",
        reschedule_reason: "",
        mode: d.mode || "",
        location: d.location || "",
        meeting_url: d.meeting_url || "",
      });
    }).catch(() => navigate(base));
  }, [interviewId, subdomain, token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.interview_date) return setError("New interview date is required.");
    setSaving(true); setError("");
    try {
      await portalInterviewApi.reschedule(subdomain, token, interviewId, {
        interview_date: form.interview_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        reschedule_reason: form.reschedule_reason || null,
        mode: form.mode || null,
        location: form.location || null,
        meeting_url: form.meeting_url || null,
      });
      navigate(`${base}/${interviewId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reschedule interview.");
    } finally {
      setSaving(false);
    }
  };

  if (!interview) return <div className="t-muted" style={{ padding: 32 }}>Loading…</div>;

  const iv = interview;
  const GRID2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };
  const F = ({ label, required, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Reschedule Interview"
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "All Interviews",       path: `${base}/list` },
          { label: iv.interview_number,    path: `${base}/${interviewId}` },
          { label: "Reschedule" },
        ]}
      />

      <div className="card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
          Current Schedule
        </div>
        <div style={{ fontSize: 13, marginBottom: 4 }}><span className="t-muted">Candidate: </span><strong>{iv.candidate_name || "—"}</strong></div>
        <div style={{ fontSize: 13, marginBottom: 4 }}><span className="t-muted">Round: </span>{iv.round_type || iv.round_name || `Round ${iv.round_number}`}</div>
        <div style={{ fontSize: 13 }}><span className="t-muted">Date: </span>{iv.interview_date}{iv.start_time ? ` at ${iv.start_time}` : ""}</div>
        {iv.reschedule_count > 0 && <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 6 }}>Already rescheduled {iv.reschedule_count} time(s)</div>}
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
        {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>New Schedule</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
          <F label="New Date" required>
            <input type="date" value={form.interview_date} onChange={e => set("interview_date", e.target.value)} className="input-field" />
          </F>
          <F label="Start Time">
            <input type="time" value={form.start_time} onChange={e => set("start_time", e.target.value)} className="input-field" />
          </F>
          <F label="End Time">
            <input type="time" value={form.end_time} onChange={e => set("end_time", e.target.value)} className="input-field" />
          </F>
        </div>

        <div style={GRID2}>
          <F label="Mode">
            <select value={form.mode} onChange={e => set("mode", e.target.value)} className="input-field">
              <option value="">Keep same</option>
              {(meta.interview_modes || []).map(m => <option key={m}>{m}</option>)}
            </select>
          </F>
          <F label="Location / Room">
            <input value={form.location} onChange={e => set("location", e.target.value)} className="input-field" placeholder="e.g. Conference Room B" />
          </F>
          <F label="Meeting URL">
            <input type="url" value={form.meeting_url} onChange={e => set("meeting_url", e.target.value)} className="input-field" placeholder="https://…" />
          </F>
        </div>

        <div style={{ marginTop: 16, marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)", display: "block", marginBottom: 6 }}>Reason for Rescheduling</label>
          <textarea value={form.reschedule_reason} onChange={e => set("reschedule_reason", e.target.value)} className="input-field" rows={3} style={{ resize: "vertical", width: "100%", boxSizing: "border-box" }} placeholder="Reason for rescheduling…" />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Rescheduling…" : "Confirm Reschedule"}</button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
