import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi, portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

export default function InterviewScheduleForm({ editMode = false }) {
  const { subdomain, interviewId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const [meta, setMeta]             = useState({});
  const [candidates, setCandidates] = useState([]);
  const [openings, setOpenings]     = useState([]);
  const [pipelines, setPipelines]   = useState([]);
  const [stages, setStages]         = useState([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const [form, setForm] = useState({
    candidate_id: "", opening_id: "", pipeline_id: "", pipeline_stage_id: "",
    round_number: 1, round_type: "", round_name: "",
    interview_date: "", start_time: "", end_time: "",
    timezone: "Asia/Kolkata", duration_minutes: "",
    mode: "", location: "", meeting_url: "", instructions: "",
  });

  useEffect(() => {
    portalInterviewApi.metaOptions(subdomain, token)
      .then(r => setMeta(r.data?.data || {})).catch(() => {});
    portalRecruitmentApi.listCandidates(subdomain, token, { page: 1, page_size: 200 })
      .then(r => setCandidates(r.data?.data?.items || [])).catch(() => {});
    portalRecruitmentApi.listOpenings(subdomain, token, { page: 1, page_size: 200 })
      .then(r => setOpenings(r.data?.data?.items || [])).catch(() => {});
    portalInterviewApi.listPipelines(subdomain, token, { active_only: true })
      .then(r => setPipelines(r.data?.data || [])).catch(() => {});

    if (editMode && interviewId) {
      portalInterviewApi.get(subdomain, token, interviewId).then(r => {
        const d = r.data?.data || {};
        setForm({
          candidate_id: d.candidate_id || "", opening_id: d.opening_id || "",
          pipeline_id: d.pipeline_id || "", pipeline_stage_id: d.pipeline_stage_id || "",
          round_number: d.round_number || 1, round_type: d.round_type || "",
          round_name: d.round_name || "", interview_date: d.interview_date || "",
          start_time: d.start_time || "", end_time: d.end_time || "",
          timezone: d.timezone || "Asia/Kolkata",
          duration_minutes: d.duration_minutes || "",
          mode: d.mode || "", location: d.location || "",
          meeting_url: d.meeting_url || "", instructions: d.instructions || "",
        });
        if (d.pipeline_id) loadStages(d.pipeline_id);
      }).catch(() => navigate(base));
    }
  }, [editMode, interviewId, subdomain, token]);

  const loadStages = pid => {
    const pl = pipelines.find(p => p.id === pid);
    if (pl?.stages) { setStages(pl.stages); return; }
    portalInterviewApi.getPipeline(subdomain, token, pid)
      .then(r => setStages(r.data?.data?.stages || [])).catch(() => {});
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePipelineChange = pid => {
    set("pipeline_id", pid);
    set("pipeline_stage_id", "");
    set("round_type", "");
    set("round_name", "");
    if (pid) loadStages(pid);
    else setStages([]);
  };

  const handleStageChange = sid => {
    set("pipeline_stage_id", sid);
    if (sid) {
      const s = stages.find(st => st.id === sid);
      if (s) {
        if (s.round_type) set("round_type", s.round_type);
        set("round_name", s.stage_name);
      }
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.candidate_id) return setError("Please select a candidate.");
    if (!form.interview_date) return setError("Interview date is required.");
    setSaving(true); setError("");
    try {
      const payload = {
        candidate_id: form.candidate_id,
        opening_id: form.opening_id || null,
        pipeline_id: form.pipeline_id || null,
        pipeline_stage_id: form.pipeline_stage_id || null,
        round_number: parseInt(form.round_number) || 1,
        round_type: form.round_type || null,
        round_name: form.round_name || null,
        interview_date: form.interview_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        timezone: form.timezone || "Asia/Kolkata",
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        mode: form.mode || null,
        location: form.location || null,
        meeting_url: form.meeting_url || null,
        instructions: form.instructions || null,
      };
      if (editMode) {
        await portalInterviewApi.update(subdomain, token, interviewId, payload);
        navigate(`${base}/${interviewId}`);
      } else {
        const r = await portalInterviewApi.schedule(subdomain, token, payload);
        navigate(`${base}/${r.data?.data?.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save interview.");
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, required, children, half }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: half ? "auto" : undefined }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
    </div>
  );

  const inp = (k, type = "text", extra = {}) => (
    <input type={type} value={form[k]} onChange={e => set(k, e.target.value)} className="input-field" {...extra} />
  );
  const sel = (k, opts, placeholder = "Select…", special) => (
    <select value={form[k]} onChange={e => special ? special(e.target.value) : set(k, e.target.value)} className="input-field">
      <option value="">{placeholder}</option>
      {opts.map(o => typeof o === "string"
        ? <option key={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const GRID2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

  return (
    <div>
      <PageHeader
        title={editMode ? "Edit Interview" : "Schedule Interview"}
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "All Interviews",       path: `${base}/list` },
          { label: editMode ? "Edit" : "Schedule" },
        ]}
      />

      <form onSubmit={handleSubmit} className="card" style={{ padding: 24 }}>
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Candidate & Opening */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
          Candidate & Opening
        </div>
        <div style={GRID2}>
          <F label="Candidate" required>
            <select value={form.candidate_id} onChange={e => set("candidate_id", e.target.value)} className="input-field">
              <option value="">Select candidate…</option>
              {candidates.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()} — {c.candidate_number}
                </option>
              ))}
            </select>
          </F>
          <F label="Job Opening (optional)">
            <select value={form.opening_id} onChange={e => set("opening_id", e.target.value)} className="input-field">
              <option value="">None</option>
              {openings.map(o => <option key={o.id} value={o.id}>{o.job_title} — {o.opening_number}</option>)}
            </select>
          </F>
        </div>

        {/* Pipeline */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>
          Interview Pipeline (optional)
        </div>
        <div style={GRID2}>
          <F label="Pipeline">
            <select value={form.pipeline_id} onChange={e => handlePipelineChange(e.target.value)} className="input-field">
              <option value="">No pipeline — manual round</option>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.pipeline_name}</option>)}
            </select>
          </F>
          {form.pipeline_id && stages.length > 0 && (
            <F label="Pipeline Stage">
              <select value={form.pipeline_stage_id} onChange={e => handleStageChange(e.target.value)} className="input-field">
                <option value="">Select stage…</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.sequence}. {s.stage_name}{s.round_type ? ` (${s.round_type})` : ""}</option>)}
              </select>
            </F>
          )}
        </div>

        {/* Round details */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>
          Round Details
        </div>
        <div style={GRID2}>
          <F label="Round Number" required>
            <input type="number" min={1} value={form.round_number} onChange={e => set("round_number", e.target.value)} className="input-field" />
          </F>
          <F label="Round Type">{sel("round_type", meta.round_types || [], "Select type…")}</F>
          <F label="Round Name (optional)">{inp("round_name", "text", { placeholder: "e.g. Technical Round 1" })}</F>
          <F label="Interview Mode">{sel("mode", meta.interview_modes || [], "Select mode…")}</F>
        </div>

        {/* Schedule */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>
          Schedule
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <F label="Date" required>{inp("interview_date", "date")}</F>
          <F label="Start Time">{inp("start_time", "time")}</F>
          <F label="End Time">{inp("end_time", "time")}</F>
          <F label="Timezone">
            <input value={form.timezone} onChange={e => set("timezone", e.target.value)} className="input-field" placeholder="Asia/Kolkata" />
          </F>
          <F label="Duration (minutes)">{inp("duration_minutes", "number", { min: 1, placeholder: "e.g. 60" })}</F>
        </div>

        {/* Location */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>
          Location / Meeting
        </div>
        <div style={GRID2}>
          <F label="Location / Room">{inp("location", "text", { placeholder: "e.g. Conference Room A, 3rd Floor" })}</F>
          <F label="Meeting URL">
            <input type="url" value={form.meeting_url} onChange={e => set("meeting_url", e.target.value)} className="input-field" placeholder="https://meet.google.com/…" />
          </F>
        </div>

        {/* Instructions */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>
          Instructions for Candidate
        </div>
        <textarea
          value={form.instructions}
          onChange={e => set("instructions", e.target.value)}
          className="input-field" rows={3} style={{ resize: "vertical", width: "100%", boxSizing: "border-box" }}
          placeholder="Preparation instructions, topics to cover, documents to bring…"
        />

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Schedule Interview"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
