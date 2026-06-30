import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

export default function PipelineList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading]     = useState(true);

  const load = () => {
    setLoading(true);
    portalInterviewApi.listPipelines(subdomain, token, {})
      .then(r => setPipelines(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [subdomain, token]);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      await portalInterviewApi.deletePipeline(subdomain, token, id);
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Delete failed.");
    }
  };

  const toggleActive = async () => {
    if (!confirmToggle) return;
    const p = confirmToggle;
    setConfirmToggle(null);
    try {
      await portalInterviewApi.updatePipeline(subdomain, token, p.id, { is_active: !p.is_active });
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Update failed.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Interview Pipelines"
        subtitle="Reusable interview workflow templates with ordered rounds."
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "Pipelines" },
        ]}
        actions={
          <button onClick={() => navigate(`${base}/pipelines/new`)} className="btn-primary">
            + New Pipeline
          </button>
        }
      />

      {loading ? (
        <div className="t-muted" style={{ padding: 32 }}>Loading…</div>
      ) : pipelines.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔀</div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }} className="t-heading">No pipelines yet</div>
          <div className="t-muted" style={{ fontSize: 13, marginBottom: 20 }}>
            Create interview pipelines to standardize workflows for different roles.
          </div>
          <button onClick={() => navigate(`${base}/pipelines/new`)} className="btn-primary">
            + Create First Pipeline
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pipelines.map(p => (
            <div key={p.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }} className="t-heading">{p.pipeline_name}</div>
                    {p.is_default && (
                      <span style={{ background: "rgba(6,182,212,0.15)", color: "#06b6d4", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, border: "1px solid rgba(6,182,212,0.3)" }}>
                        Default
                      </span>
                    )}
                    <button title={p.is_active ? "Click to deactivate" : "Click to activate"} onClick={() => setConfirmToggle(p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      <span style={{
                        display: "inline-block",
                        background: p.is_active ? "rgba(34,197,94,0.1)" : "rgba(107,114,128,0.1)",
                        color: p.is_active ? "#22c55e" : "#6b7280",
                        padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                        border: `1px solid ${p.is_active ? "rgba(34,197,94,0.3)" : "rgba(107,114,128,0.3)"}`,
                      }}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </div>

                  {p.description && <div className="t-muted" style={{ fontSize: 13, marginBottom: 8 }}>{p.description}</div>}

                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
                    {p.department_name && <span className="t-muted" style={{ fontSize: 12 }}>🏢 {p.department_name}</span>}
                    {p.designation_name && <span className="t-muted" style={{ fontSize: 12 }}>💼 {p.designation_name}</span>}
                    {p.company_name && <span className="t-muted" style={{ fontSize: 12 }}>🏛 {p.company_name}</span>}
                  </div>

                  {/* Stages */}
                  {p.stages?.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      {p.stages.filter(s => s.is_active !== false).map((s, i) => (
                        <React.Fragment key={s.id}>
                          {i > 0 && <span className="t-muted" style={{ fontSize: 12 }}>→</span>}
                          <span style={{
                            background: "rgba(99,102,241,0.1)", color: "#a5b4fc",
                            padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: "1px solid rgba(99,102,241,0.25)",
                          }}>
                            {s.stage_name}
                            {s.round_type ? ` (${s.round_type})` : ""}
                            {!s.is_mandatory && <span style={{ color: "#f59e0b", marginLeft: 4 }}>opt</span>}
                          </span>
                        </React.Fragment>
                      ))}
                      <span className="t-muted" style={{ fontSize: 11 }}>
                        {p.stages.filter(s => s.is_active !== false).length} rounds
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 16 }}>
                  <button onClick={() => navigate(`${base}/pipelines/${p.id}`)} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}>
                    View
                  </button>
                  <EditIconBtn onClick={() => navigate(`${base}/pipelines/${p.id}/edit`)} title="Edit pipeline" />
                  <DeleteIconBtn onClick={() => setConfirmDelete({ id: p.id, name: p.pipeline_name })} title="Delete pipeline" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Pipeline"
        message={`Delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.is_active ? "Deactivate Pipeline" : "Activate Pipeline"}
        message={`${confirmToggle?.is_active ? "Deactivate" : "Activate"} "${confirmToggle?.pipeline_name}"?`}
        confirmLabel={confirmToggle?.is_active ? "Deactivate" : "Activate"}
        confirmVariant={confirmToggle?.is_active ? "danger" : "primary"}
        onConfirm={toggleActive}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
