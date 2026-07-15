import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi, portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const F = ({ label, required, children, style }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>
      {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
    </label>
    {children}
  </div>
);

const ReadOnly = ({ value }) => (
  <div className="input-field" style={{ background: "var(--c-surface2)", color: "var(--c-text)", cursor: "default", userSelect: "none", minHeight: 38, display: "flex", alignItems: "center" }}>
    {value || <span style={{ color: "var(--c-muted)", fontStyle: "italic" }}>—</span>}
  </div>
);

const calcEndTime = (start, mins) => {
  if (!start || !mins) return "";
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + Number(mins);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

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
    portalRecruitmentApi.listCandidates(subdomain, token, { page: 1, page_size: 100 })
      .then(r => setCandidates(r.data?.data?.items || [])).catch(() => {});
    portalRecruitmentApi.listOpenings(subdomain, token, { page: 1, page_size: 100 })
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
    setForm(f => ({ ...f, pipeline_id: pid, pipeline_stage_id: "", round_type: "", round_name: "" }));
    if (pid) loadStages(pid);
    else setStages([]);
  };

  const handleStageChange = (sid, currentStartTime, currentDurationMinutes) => {
    if (!sid) {
      set("pipeline_stage_id", "");
      return;
    }
    const s = stages.find(st => st.id === sid);
    if (!s) { set("pipeline_stage_id", sid); return; }

    const newDuration = s.duration_minutes ? String(s.duration_minutes) : currentDurationMinutes;
    const newEnd = calcEndTime(currentStartTime, newDuration);

    setForm(f => ({
      ...f,
      pipeline_stage_id: sid,
      round_number: s.sequence || f.round_number,
      round_type: s.round_type || f.round_type,
      round_name: s.stage_name || f.round_name,
      duration_minutes: newDuration || f.duration_minutes,
      end_time: newEnd || f.end_time,
    }));
  };

  const handleStartTimeChange = (val) => {
    const newEnd = calcEndTime(val, form.duration_minutes);
    setForm(f => ({ ...f, start_time: val, end_time: newEnd || f.end_time }));
  };

  const handleDurationChange = (val) => {
    const newEnd = calcEndTime(form.start_time, val);
    setForm(f => ({ ...f, duration_minutes: val, end_time: newEnd || f.end_time }));
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

  const sel = (k, opts, placeholder = "Select…", special) => (
    <select value={form[k]} onChange={e => special ? special(e.target.value) : set(k, e.target.value)} className="input-field">
      <option value="">{placeholder}</option>
      {opts.map(o => typeof o === "string"
        ? <option key={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  const selectedStage = form.pipeline_stage_id ? stages.find(s => s.id === form.pipeline_stage_id) : null;
  const roundFromPipeline = !!selectedStage;

  return (
    <div>
      <style>{`
        .form-grid-4 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 900px) {
          .form-grid-4 { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 520px) {
          .form-grid-4 { grid-template-columns: 1fr; }
        }
      `}</style>
      <PageHeader
        title={editMode ? "Edit Interview" : "Schedule Interview"}
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "All Interviews", path: `${base}/list` },
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
        <div className="form-grid-4">
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
        <div className="form-grid-4">
          <F label="Pipeline" style={!(form.pipeline_id && stages.length > 0) ? { gridColumn: "1 / -1" } : undefined}>
            <select value={form.pipeline_id} onChange={e => handlePipelineChange(e.target.value)} className="input-field">
              <option value="">No pipeline — manual round</option>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.pipeline_name}</option>)}
            </select>
          </F>
          {form.pipeline_id && stages.length > 0 && (
            <F label="Pipeline Stage">
              <select value={form.pipeline_stage_id} onChange={e => handleStageChange(e.target.value, form.start_time, form.duration_minutes)} className="input-field">
                <option value="">Select stage…</option>
                {stages.map(s => <option key={s.id} value={s.id}>{s.sequence}. {s.stage_name}{s.round_type ? ` (${s.round_type})` : ""}</option>)}
              </select>
            </F>
          )}
        </div>

        {/* Round details */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>
          Round Details
          {roundFromPipeline && <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, color: "var(--c-accent)", textTransform: "none", letterSpacing: 0 }}>auto-filled from pipeline</span>}
        </div>
        <div className="form-grid-4">
          <F label="Round Number" required>
            {roundFromPipeline
              ? <ReadOnly value={`Round ${form.round_number}`} />
              : <input type="number" min={1} value={form.round_number} onChange={e => set("round_number", e.target.value)} className="input-field" />}
          </F>
          <F label="Round Type">
            {roundFromPipeline
              ? <ReadOnly value={form.round_type} />
              : sel("round_type", meta.round_types || [], "Select type…")}
          </F>
          <F label="Round Name">
            {roundFromPipeline
              ? <ReadOnly value={form.round_name} />
              : <input value={form.round_name} onChange={e => set("round_name", e.target.value)} className="input-field" placeholder="e.g. Technical Round 1" />}
          </F>
          <F label="Interview Mode">{sel("mode", meta.interview_modes || [], "Select mode…")}</F>
        </div>

        {/* Schedule */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>
          Schedule
        </div>
        <div className="form-grid-4">
          <F label="Date" required>
            <input type="date" value={form.interview_date} onChange={e => set("interview_date", e.target.value)} className="input-field" />
          </F>
          <F label="Start Time">
            <input type="time" value={form.start_time} onChange={e => handleStartTimeChange(e.target.value)} className="input-field" />
          </F>
          <F label="End Time">
            <input type="time" value={form.end_time} onChange={e => set("end_time", e.target.value)} className="input-field" />
          </F>
          <F label="Timezone">
            <input value={form.timezone} onChange={e => set("timezone", e.target.value)} className="input-field" placeholder="Asia/Kolkata" />
          </F>
          <F label="Duration (minutes)">
            {roundFromPipeline && selectedStage?.duration_minutes
              ? <ReadOnly value={`${selectedStage.duration_minutes} min`} />
              : <input type="number" min={1} value={form.duration_minutes} onChange={e => handleDurationChange(e.target.value)} className="input-field" placeholder="e.g. 60" />}
          </F>
        </div>

        {/* Location / Meeting (optional) */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>
          Location / Meeting <span style={{ fontWeight: 400, fontSize: 11, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </div>
        <div className="form-grid-4">
          <F label="Location / Room">
            <input value={form.location} onChange={e => set("location", e.target.value)} className="input-field" placeholder="e.g. Conference Room A, 3rd Floor" />
          </F>
          <F label="Meeting URL">
            <input type="url" value={form.meeting_url} onChange={e => set("meeting_url", e.target.value)} className="input-field" placeholder="https://meet.google.com/…" />
          </F>
        </div>

        {/* Instructions */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "20px 0 12px" }}>
          Instructions for Candidate <span style={{ fontWeight: 400, fontSize: 11, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
        </div>
        {roundFromPipeline && selectedStage?.instructions && !form.instructions && (
          <div style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12, color: "var(--c-muted)" }}>
            Pipeline hint: {selectedStage.instructions}
          </div>
        )}
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
