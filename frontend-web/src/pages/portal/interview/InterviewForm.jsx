import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi, portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

export default function InterviewForm({ editMode = false }) {
  const { subdomain, interviewId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [meta, setMeta]         = useState({});
  const [candidates, setCandidates] = useState([]);
  const [openings, setOpenings] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const [form, setForm] = useState({
    candidate_id: "", opening_id: "", round_number: 1,
    round_type: "", round_name: "", interview_date: "",
    interview_time: "", duration_minutes: "", mode: "",
    location: "", meeting_link: "", interviewers: "", notes: "",
  });

  useEffect(() => {
    portalInterviewApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
    portalRecruitmentApi.listCandidates(subdomain, token, { page: 1, page_size: 100 })
      .then(r => setCandidates(r.data?.data?.items || [])).catch(() => {});
    portalRecruitmentApi.listOpenings(subdomain, token, { page: 1, page_size: 100 })
      .then(r => setOpenings(r.data?.data?.items || [])).catch(() => {});
    if (editMode && interviewId) {
      portalInterviewApi.get(subdomain, token, interviewId).then(r => {
        const d = r.data?.data || {};
        setForm({
          candidate_id: d.candidate_id || "", opening_id: d.opening_id || "",
          round_number: d.round_number || 1, round_type: d.round_type || "",
          round_name: d.round_name || "", interview_date: d.interview_date || "",
          interview_time: d.interview_time || "", duration_minutes: d.duration_minutes || "",
          mode: d.mode || "", location: d.location || "",
          meeting_link: d.meeting_link || "", interviewers: d.interviewers || "",
          notes: d.notes || "",
        });
      }).catch(() => navigate(`/portal/${subdomain}/hrms/interviews`));
    }
  }, [editMode, interviewId]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.candidate_id) return setError("Please select a candidate.");
    if (!form.interview_date) return setError("Interview date is required.");
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        round_number: parseInt(form.round_number) || 1,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        opening_id: form.opening_id || null,
        round_type: form.round_type || null,
        round_name: form.round_name || null,
        interview_time: form.interview_time || null,
        mode: form.mode || null,
        location: form.location || null,
        meeting_link: form.meeting_link || null,
        interviewers: form.interviewers || null,
        notes: form.notes || null,
      };
      if (editMode) {
        await portalInterviewApi.update(subdomain, token, interviewId, payload);
        navigate(`/portal/${subdomain}/hrms/interviews/${interviewId}`);
      } else {
        const r = await portalInterviewApi.create(subdomain, token, payload);
        navigate(`/portal/${subdomain}/hrms/interviews/${r.data?.data?.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save interview.");
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, required, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );

  const inp = (k, type = "text", extra = {}) => (
    <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} className="input-field" {...extra} />
  );

  const sel = (k, opts, placeholder = "Select…") => (
    <select value={form[k]} onChange={e => set(k, e.target.value)} className="input-field">
      <option value="">{placeholder}</option>
      {opts.map(o => typeof o === "string" ? <option key={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const GRID2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

  return (
    <div>
      <PageHeader
        title={editMode ? "Edit Interview" : "Schedule Interview"}
        breadcrumbs={[
          { label: "Interview Management", path: `/portal/${subdomain}/hrms/interviews` },
          { label: editMode ? "Edit" : "Schedule" },
        ]}
      />

      <form onSubmit={handleSubmit} className="card" style={{ padding: 24, maxWidth: 800 }}>
        {error && <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>Candidate & Opening</div>
        <div style={GRID2}>
          <F label="Candidate" required>
            <select value={form.candidate_id} onChange={e => set("candidate_id", e.target.value)} className="input-field">
              <option value="">Select candidate…</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name || `${c.first_name} ${c.last_name}`} — {c.candidate_number}</option>)}
            </select>
          </F>
          <F label="Job Opening (optional)">
            <select value={form.opening_id} onChange={e => set("opening_id", e.target.value)} className="input-field">
              <option value="">None</option>
              {openings.map(o => <option key={o.id} value={o.id}>{o.job_title} — {o.opening_number}</option>)}
            </select>
          </F>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>Round Details</div>
        <div style={GRID2}>
          <F label="Round Number" required>
            <input type="number" min={1} value={form.round_number} onChange={e => set("round_number", e.target.value)} className="input-field" />
          </F>
          <F label="Round Type">{sel("round_type", meta.round_types || [], "Select type…")}</F>
          <F label="Round Name (optional)">{inp("round_name")}</F>
          <F label="Interview Mode">{sel("mode", meta.interview_modes || [], "Select mode…")}</F>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>Schedule</div>
        <div style={GRID2}>
          <F label="Interview Date" required>{inp("interview_date", "date")}</F>
          <F label="Time (optional)">{inp("interview_time", "time")}</F>
          <F label="Duration (minutes)">{inp("duration_minutes", "number", { min: 1, placeholder: "e.g. 60" })}</F>
          <div />
          <F label="Location / Room">{inp("location", "text", { placeholder: "e.g. Conference Room A" })}</F>
          <F label="Meeting Link">{inp("meeting_link", "url", { placeholder: "https://meet.google.com/…" })}</F>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>Interviewers</div>
        <F label="Interviewers (comma-separated names)">
          <input value={form.interviewers} onChange={e => set("interviewers", e.target.value)} className="input-field" placeholder="e.g. Alice Smith, Bob Jones" />
        </F>

        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>Notes</div>
        <F label="Internal Notes">
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="input-field" rows={3} style={{ resize: "vertical" }} placeholder="Preparation notes, topics to cover…" />
        </F>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : editMode ? "Save Changes" : "Schedule Interview"}</button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
