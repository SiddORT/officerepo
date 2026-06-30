import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalOnboardingApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

export default function TemplateList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate   = useNavigate();
  const base       = `/portal/${subdomain}/hrms/onboarding`;

  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState(null);

  const load = () => {
    setLoading(true);
    portalOnboardingApi.listTemplates(subdomain, token)
      .then(r => setTemplates(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [subdomain, token]);

  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);

  const doDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    setDeleting(id);
    try {
      await portalOnboardingApi.deleteTemplate(subdomain, token, id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed.");
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async () => {
    if (!confirmToggle) return;
    const t = confirmToggle;
    setConfirmToggle(null);
    try {
      await portalOnboardingApi.updateTemplate(subdomain, token, t.id, { is_active: !t.is_active });
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Update failed.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Onboarding Templates"
        breadcrumbs={[
          { label: "Employee Onboarding", path: base },
          { label: "Templates" },
        ]}
        actions={<button onClick={() => navigate(`${base}/templates/new`)} className="btn-primary">+ New Template</button>}
      />

      {loading ? (
        <div className="t-muted" style={{ padding: 40, textAlign: "center" }}>Loading…</div>
      ) : templates.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }} className="t-heading">No templates yet</div>
          <div className="t-muted" style={{ fontSize: 13, marginBottom: 20 }}>
            Create reusable onboarding templates with task checklists for different employee types.
          </div>
          <button onClick={() => navigate(`${base}/templates/new`)} className="btn-primary">Create First Template</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }} className="t-heading">{t.template_name}</div>
                  <div className="t-muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {t.employee_category || "General"} · {(t.tasks || []).length} tasks
                    {t.is_default && <span style={{ color: "var(--c-accent)", marginLeft: 6, fontWeight: 600 }}>★ Default</span>}
                  </div>
                </div>
                <button title={t.is_active ? "Click to deactivate" : "Click to activate"} onClick={() => setConfirmToggle(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <span style={{
                    display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: t.is_active ? "#22c55e22" : "#6b728022",
                    color: t.is_active ? "#22c55e" : "#6b7280",
                  }}>
                    {t.is_active ? "Active" : "Inactive"}
                  </span>
                </button>
              </div>

              {t.description && (
                <div className="t-muted" style={{ fontSize: 12, marginBottom: 10 }}>{t.description}</div>
              )}

              {/* Task preview */}
              {(t.tasks || []).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", marginBottom: 6 }}>Tasks</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {(t.tasks || []).slice(0, 6).map(tk => (
                      <span key={tk.id} style={{
                        padding: "2px 8px", borderRadius: 10, fontSize: 11,
                        background: "var(--c-hover)", color: "var(--c-muted)",
                      }}>
                        {tk.category}
                      </span>
                    ))}
                    {(t.tasks || []).length > 6 && (
                      <span className="t-muted" style={{ fontSize: 11, padding: "2px 6px" }}>+{(t.tasks || []).length - 6} more</span>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <EditIconBtn onClick={() => navigate(`${base}/templates/${t.id}/edit`)} title="Edit template" />
                <DeleteIconBtn onClick={() => setConfirmDelete({ id: t.id, name: t.template_name })} disabled={deleting === t.id} title="Delete template" />
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Template"
        message={`Delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.is_active ? "Deactivate Template" : "Activate Template"}
        message={`${confirmToggle?.is_active ? "Deactivate" : "Activate"} "${confirmToggle?.template_name}"?`}
        confirmLabel={confirmToggle?.is_active ? "Deactivate" : "Activate"}
        confirmVariant={confirmToggle?.is_active ? "danger" : "primary"}
        onConfirm={toggleActive}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
