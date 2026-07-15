import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const ROUND_TYPES = [
  "Telephonic Screening", "Video Interview", "Physical Interview",
  "Technical Interview", "Aptitude Test", "Coding Test",
  "Group Discussion", "Manager Discussion", "HR Discussion",
  "Leadership Round", "Client Interview", "Culture Fit Interview",
];

const EMPTY_STAGE = { stage_name: "", round_type: "", is_mandatory: true, duration_minutes: "", instructions: "" };

const F = ({ label, required, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)" }}>
      {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
    </label>
    {children}
  </div>
);

export default function PipelineForm({ editMode = false }) {
  const { subdomain, pipelineId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [dragIdx, setDragIdx]   = useState(null);

  const [form, setForm] = useState({
    pipeline_name: "", description: "",
    company_id: "", department_id: "", designation_id: "",
    is_default: false,
  });
  const [stages, setStages] = useState([{ ...EMPTY_STAGE }]);

  useEffect(() => {
    if (editMode && pipelineId) {
      portalInterviewApi.getPipeline(subdomain, token, pipelineId)
        .then(r => {
          const d = r.data?.data || {};
          setForm({
            pipeline_name: d.pipeline_name || "",
            description: d.description || "",
            company_id: d.company_id || "",
            department_id: d.department_id || "",
            designation_id: d.designation_id || "",
            is_default: d.is_default || false,
          });
          const existing = (d.stages || []).filter(s => s.is_active !== false);
          setStages(existing.length ? existing.map(s => ({
            id: s.id,
            stage_name: s.stage_name || "",
            round_type: s.round_type || "",
            is_mandatory: s.is_mandatory !== false,
            duration_minutes: s.duration_minutes || "",
            instructions: s.instructions || "",
          })) : [{ ...EMPTY_STAGE }]);
        })
        .catch(() => navigate(`${base}/pipelines`));
    }
  }, [editMode, pipelineId, subdomain, token]);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const setStage = (i, k, v) => setStages(ss => {
    const n = [...ss]; n[i] = { ...n[i], [k]: v }; return n;
  });

  const addStage = () => setStages(ss => [...ss, { ...EMPTY_STAGE }]);
  const removeStage = i => setStages(ss => ss.filter((_, idx) => idx !== i));

  const moveStage = (from, to) => {
    if (to < 0 || to >= stages.length) return;
    setStages(ss => {
      const n = [...ss];
      const [item] = n.splice(from, 1);
      n.splice(to, 0, item);
      return n;
    });
  };

  // Drag and drop
  const onDragStart = (e, i) => { setDragIdx(i); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver  = (e, i) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === i) return;
    moveStage(dragIdx, i);
    setDragIdx(i);
  };
  const onDragEnd   = () => setDragIdx(null);

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.pipeline_name.trim()) return setError("Pipeline name is required.");
    if (stages.some(s => !s.stage_name.trim())) return setError("All stages must have a name.");
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        company_id: form.company_id || null,
        department_id: form.department_id || null,
        designation_id: form.designation_id || null,
        stages: stages.map((s, i) => ({
          stage_name: s.stage_name,
          round_type: s.round_type || null,
          sequence: i + 1,
          is_mandatory: s.is_mandatory,
          duration_minutes: s.duration_minutes ? parseInt(s.duration_minutes) : null,
          instructions: s.instructions || null,
        })),
      };
      if (editMode) {
        // Update pipeline meta
        await portalInterviewApi.updatePipeline(subdomain, token, pipelineId, {
          pipeline_name: form.pipeline_name,
          description: form.description || null,
          is_default: form.is_default,
        });
        // For existing stages with IDs, update them; for new ones, add them
        for (const [i, s] of stages.entries()) {
          if (s.id) {
            await portalInterviewApi.updateStage(subdomain, token, pipelineId, s.id, {
              stage_name: s.stage_name, round_type: s.round_type || null,
              sequence: i + 1, is_mandatory: s.is_mandatory,
              duration_minutes: s.duration_minutes ? parseInt(s.duration_minutes) : null,
              instructions: s.instructions || null,
            });
          } else {
            await portalInterviewApi.addStage(subdomain, token, pipelineId, {
              stage_name: s.stage_name, round_type: s.round_type || null,
              sequence: i + 1, is_mandatory: s.is_mandatory,
              duration_minutes: s.duration_minutes ? parseInt(s.duration_minutes) : null,
              instructions: s.instructions || null,
            });
          }
        }
        navigate(`${base}/pipelines/${pipelineId}`);
      } else {
        const r = await portalInterviewApi.createPipeline(subdomain, token, payload);
        navigate(`${base}/pipelines/${r.data?.data?.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save pipeline.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={editMode ? "Edit Pipeline" : "New Interview Pipeline"}
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "Pipelines",           path: `${base}/pipelines` },
          { label: editMode ? "Edit" : "New Pipeline" },
        ]}
      />

      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Pipeline details */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
            Pipeline Details
          </div>
          <div className="form-grid-2" style={{ marginBottom: 16 }}>
            <F label="Pipeline Name" required>
              <input value={form.pipeline_name} onChange={e => setField("pipeline_name", e.target.value)} className="input-field" placeholder="e.g. Software Engineer Pipeline" />
            </F>
            <F label="Description">
              <input value={form.description} onChange={e => setField("description", e.target.value)} className="input-field" placeholder="Short description of this pipeline" />
            </F>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={form.is_default} onChange={e => setField("is_default", e.target.checked)} />
            Set as default pipeline
          </label>
        </div>

        {/* Stages builder */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Interview Rounds
              </div>
              <div className="t-muted" style={{ fontSize: 12, marginTop: 2 }}>Drag to reorder. Add as many rounds as needed.</div>
            </div>
            <button type="button" onClick={addStage} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}>
              + Add Round
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {stages.map((s, i) => (
              <div key={i}
                draggable onDragStart={e => onDragStart(e, i)} onDragOver={e => onDragOver(e, i)} onDragEnd={onDragEnd}
                style={{
                  background: dragIdx === i ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${dragIdx === i ? "rgba(99,102,241,0.4)" : "var(--c-border)"}`,
                  borderRadius: 10, padding: "14px 16px", cursor: "grab",
                  transition: "border-color 0.15s, background 0.15s",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 16, cursor: "grab", color: "var(--c-muted)" }}>⠿</span>
                  <span style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", width: 26, height: 26, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto auto", gap: 10, alignItems: "center" }}>
                    <input
                      value={s.stage_name}
                      onChange={e => setStage(i, "stage_name", e.target.value)}
                      className="input-field" placeholder="Stage name *"
                      style={{ fontSize: 13 }}
                    />
                    <select value={s.round_type} onChange={e => setStage(i, "round_type", e.target.value)} className="input-field" style={{ fontSize: 13 }}>
                      <option value="">Round type…</option>
                      {ROUND_TYPES.map(rt => <option key={rt}>{rt}</option>)}
                    </select>
                    <input
                      type="number" min={1} value={s.duration_minutes}
                      onChange={e => setStage(i, "duration_minutes", e.target.value)}
                      className="input-field" placeholder="Mins" style={{ width: 70, fontSize: 13 }}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={s.is_mandatory} onChange={e => setStage(i, "is_mandatory", e.target.checked)} />
                      Required
                    </label>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" onClick={() => moveStage(i, i - 1)} disabled={i === 0}
                      style={{ background: "none", border: "1px solid var(--c-border)", color: "var(--c-muted)", width: 28, height: 28, borderRadius: 6, cursor: i === 0 ? "not-allowed" : "pointer", fontSize: 12, opacity: i === 0 ? 0.4 : 1 }}>
                      ↑
                    </button>
                    <button type="button" onClick={() => moveStage(i, i + 1)} disabled={i === stages.length - 1}
                      style={{ background: "none", border: "1px solid var(--c-border)", color: "var(--c-muted)", width: 28, height: 28, borderRadius: 6, cursor: i === stages.length - 1 ? "not-allowed" : "pointer", fontSize: 12, opacity: i === stages.length - 1 ? 0.4 : 1 }}>
                      ↓
                    </button>
                    {stages.length > 1 && (
                      <button type="button" onClick={() => removeStage(i)}
                        style={{ background: "none", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", width: 28, height: 28, borderRadius: 6, cursor: "pointer", fontSize: 12 }}>
                        ×
                      </button>
                    )}
                  </div>
                </div>
                <input
                  value={s.instructions || ""}
                  onChange={e => setStage(i, "instructions", e.target.value)}
                  className="input-field" placeholder="Instructions for this round (optional)…"
                  style={{ fontSize: 12, marginLeft: 38, width: "calc(100% - 38px)", boxSizing: "border-box" }}
                />
              </div>
            ))}
          </div>

          {/* Preview flow */}
          {stages.length > 1 && (
            <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(99,102,241,0.06)", borderRadius: 8, border: "1px solid rgba(99,102,241,0.15)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#a5b4fc", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Pipeline Flow Preview
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {stages.map((s, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="t-muted" style={{ fontSize: 12 }}>→</span>}
                    <span style={{ background: "rgba(99,102,241,0.12)", color: "#c4b5fd", padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                      {s.stage_name || `Round ${i + 1}`}
                      {!s.is_mandatory && <span style={{ color: "#f59e0b", marginLeft: 4, fontSize: 10 }}>opt</span>}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Pipeline"}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
