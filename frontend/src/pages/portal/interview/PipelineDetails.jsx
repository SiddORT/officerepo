import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

export default function PipelineDetails() {
  const { subdomain, pipelineId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    portalInterviewApi.getPipeline(subdomain, token, pipelineId)
      .then(r => setPipeline(r.data?.data || null))
      .catch(() => navigate(`${base}/pipelines`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [pipelineId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await portalInterviewApi.deletePipeline(subdomain, token, pipelineId);
      navigate(`${base}/pipelines`);
    } catch (e) {
      alert(e.response?.data?.message || "Delete failed.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const toggleActive = async () => {
    try {
      await portalInterviewApi.updatePipeline(subdomain, token, pipelineId, { is_active: !pipeline.is_active });
      load();
    } catch (e) { alert(e.response?.data?.message || "Update failed."); }
  };

  if (loading) return <div className="t-muted" style={{ padding: 32 }}>Loading…</div>;
  if (!pipeline) return <div style={{ color: "#ef4444", padding: 32 }}>Pipeline not found.</div>;

  const activeStages = (pipeline.stages || []).filter(s => s.is_active !== false).sort((a, b) => a.sequence - b.sequence);

  return (
    <div style={{ maxWidth: 760 }}>
      <PageHeader
        title={pipeline.pipeline_name}
        subtitle={pipeline.description || "Interview Pipeline"}
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "Pipelines", path: `${base}/pipelines` },
          { label: pipeline.pipeline_name },
        ]}
        actions={<>
          <button onClick={toggleActive} className="btn-secondary">
            {pipeline.is_active ? "Deactivate" : "Activate"}
          </button>
          <button onClick={() => navigate(`${base}/pipelines/${pipelineId}/edit`)} className="btn-secondary">
            Edit
          </button>
          <button onClick={() => setConfirmDelete(true)} className="btn-danger" style={{ background: "#ef4444", color: "#fff", border: "none" }}>
            Delete
          </button>
        </>}
      />

      {/* Header card — stacks to column at ≤640px */}
      <div className="card detail-header-card" style={{ padding: 20, marginBottom: 16 }}>
        <div className="form-grid-3">
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Status</div>
            <span style={{
              background: pipeline.is_active ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.1)",
              color: pipeline.is_active ? "#22c55e" : "#6b7280",
              padding: "3px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              border: `1px solid ${pipeline.is_active ? "rgba(34,197,94,0.3)" : "rgba(107,114,128,0.3)"}`,
            }}>
              {pipeline.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          {pipeline.is_default && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Type</div>
              <span style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4", padding: "3px 10px", borderRadius: 10, fontSize: 12, fontWeight: 600, border: "1px solid rgba(6,182,212,0.3)" }}>
                Default Pipeline
              </span>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Total Rounds</div>
            <div style={{ fontSize: 18, fontWeight: 700 }} className="t-heading">{activeStages.length}</div>
          </div>
          {pipeline.department_name && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Department</div>
              <div style={{ fontSize: 13 }} className="t-heading">{pipeline.department_name}</div>
            </div>
          )}
          {pipeline.designation_name && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Designation</div>
              <div style={{ fontSize: 13 }} className="t-heading">{pipeline.designation_name}</div>
            </div>
          )}
          {pipeline.company_name && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Company</div>
              <div style={{ fontSize: 13 }} className="t-heading">{pipeline.company_name}</div>
            </div>
          )}
        </div>
      </div>

      {/* Stages */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }} className="t-heading">
          Interview Rounds
        </div>

        {/* Flow preview */}
        {activeStages.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 20, padding: "10px 14px", background: "rgba(99,102,241,0.06)", borderRadius: 8, border: "1px solid rgba(99,102,241,0.15)" }}>
            {activeStages.map((s, i) => (
              <React.Fragment key={s.id}>
                {i > 0 && <span className="t-muted" style={{ fontSize: 12 }}>→</span>}
                <span style={{ background: "rgba(99,102,241,0.12)", color: "#c4b5fd", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                  {s.stage_name}
                  {!s.is_mandatory && <span style={{ color: "#f59e0b", marginLeft: 4, fontSize: 10 }}>opt</span>}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {activeStages.map((s, i) => (
            <div key={s.id} style={{ border: "1px solid var(--c-border)", borderRadius: 10, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: s.instructions ? 6 : 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }} className="t-heading">{s.stage_name}</span>
                  {s.round_type && (
                    <span style={{ background: "rgba(6,182,212,0.1)", color: "#06b6d4", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                      {s.round_type}
                    </span>
                  )}
                  {!s.is_mandatory && (
                    <span style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                      Optional
                    </span>
                  )}
                  {s.duration_minutes && (
                    <span className="t-muted" style={{ fontSize: 12 }}>⏱ {s.duration_minutes} min</span>
                  )}
                </div>
                {s.instructions && (
                  <div className="t-muted" style={{ fontSize: 12, marginTop: 4 }}>{s.instructions}</div>
                )}
              </div>
            </div>
          ))}
          {activeStages.length === 0 && (
            <div className="t-muted" style={{ padding: 24, textAlign: "center", fontSize: 13 }}>
              No rounds defined. <button onClick={() => navigate(`${base}/pipelines/${pipelineId}/edit`)} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Edit pipeline</button> to add rounds.
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Pipeline"
        message={`Delete "${pipeline.pipeline_name}"? This cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
