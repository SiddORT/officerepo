import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalOnboardingApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const CATS    = ["HR", "IT", "Admin", "Manager", "Finance"];
const EMP_CATS = ["Full-Time Employee", "Part-Time Employee", "Intern", "Contractor", "Consultant", "Remote Employee", "Probationer"];

const emptyTask = () => ({ id: null, task_name: "", category: "HR", owner_team: "", description: "", due_offset_days: 0, sequence: 1, is_mandatory: true, is_active: true });

export default function TemplateForm({ editMode = false }) {
  const { subdomain, templateId } = useParams();
  const { token } = usePortalAuth();
  const navigate  = useNavigate();
  const base      = `/portal/${subdomain}/hrms/onboarding`;

  const [form, setForm] = useState({
    template_name: "", employee_category: "", description: "",
    department_name: "", designation_name: "", is_active: true, is_default: false,
  });
  const [tasks,   setTasks]   = useState([emptyTask()]);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(editMode);

  useEffect(() => {
    if (!editMode || !templateId) return;
    portalOnboardingApi.getTemplate(subdomain, token, templateId)
      .then(r => {
        const d = r.data?.data || {};
        setForm({
          template_name:     d.template_name || "",
          employee_category: d.employee_category || "",
          description:       d.description || "",
          department_name:   d.department_name || "",
          designation_name:  d.designation_name || "",
          is_active:         d.is_active !== false,
          is_default:        d.is_default === true,
        });
        if ((d.tasks || []).length > 0) {
          setTasks(d.tasks.map(t => ({
            id:              t.id,
            task_name:       t.task_name || "",
            category:        t.category || "HR",
            owner_team:      t.owner_team || "",
            description:     t.description || "",
            due_offset_days: t.due_offset_days || 0,
            sequence:        t.sequence || 1,
            is_mandatory:    t.is_mandatory !== false,
            is_active:       t.is_active !== false,
          })));
        }
      })
      .catch(() => navigate(`${base}/templates`))
      .finally(() => setLoading(false));
  }, [editMode, templateId]);

  const setF   = (k, v)       => setForm(f => ({ ...f, [k]: v }));
  const setT   = (i, k, v)    => setTasks(ts => ts.map((t, j) => j === i ? { ...t, [k]: v } : t));
  const addTask = ()           => setTasks(ts => [...ts, { ...emptyTask(), sequence: ts.length + 1 }]);
  const removeTask = i         => setTasks(ts => ts.filter((_, j) => j !== i).map((t, j) => ({ ...t, sequence: j + 1 })));
  const moveTask = (i, dir)    => {
    const ts = [...tasks];
    const ni = i + dir;
    if (ni < 0 || ni >= ts.length) return;
    [ts[i], ts[ni]] = [ts[ni], ts[i]];
    setTasks(ts.map((t, j) => ({ ...t, sequence: j + 1 })));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.template_name.trim()) { setError("Template name is required."); return; }
    setSaving(true); setError("");

    try {
      if (editMode) {
        await portalOnboardingApi.updateTemplate(subdomain, token, templateId, form);
        // Sync tasks: add new ones, update existing
        for (const t of tasks) {
          const td = { task_name: t.task_name, category: t.category, owner_team: t.owner_team || null, description: t.description || null, due_offset_days: parseInt(t.due_offset_days) || 0, sequence: t.sequence, is_mandatory: t.is_mandatory, is_active: t.is_active };
          if (t.id) {
            await portalOnboardingApi.updateTemplateTask(subdomain, token, templateId, t.id, td);
          } else if (t.task_name.trim()) {
            await portalOnboardingApi.addTemplateTask(subdomain, token, templateId, td);
          }
        }
      } else {
        const r = await portalOnboardingApi.createTemplate(subdomain, token, form);
        const tid = r.data?.data?.id;
        for (const t of tasks) {
          if (!t.task_name.trim()) continue;
          await portalOnboardingApi.addTemplateTask(subdomain, token, tid, {
            task_name: t.task_name, category: t.category, owner_team: t.owner_team || null,
            description: t.description || null, due_offset_days: parseInt(t.due_offset_days) || 0,
            sequence: t.sequence, is_mandatory: t.is_mandatory,
          });
        }
      }
      navigate(`${base}/templates`);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Save failed.");
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }} className="t-muted">Loading…</div>;

  return (
    <div>
      <PageHeader
        title={editMode ? "Edit Template" : "New Template"}
        breadcrumbs={[
          { label: "Employee Onboarding", path: base },
          { label: "Templates", path: `${base}/templates` },
          { label: editMode ? "Edit" : "New" },
        ]}
      />

      <form onSubmit={handleSubmit} style={{ maxWidth: 760 }}>
        {error && (
          <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 18, color: "#991b1b", fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Template info */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 18 }} className="t-heading">Template Details</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="t-muted" style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Template Name *</label>
              <input value={form.template_name} onChange={e => setF("template_name", e.target.value)} required
                placeholder="e.g. Full-Time Employee Onboarding"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13, boxSizing: "border-box" }} />
            </div>

            <div>
              <label className="t-muted" style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Employee Category</label>
              <select value={form.employee_category} onChange={e => setF("employee_category", e.target.value)}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13 }}>
                <option value="">— General (any) —</option>
                {EMP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="t-muted" style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Designation</label>
              <input value={form.designation_name} onChange={e => setF("designation_name", e.target.value)}
                placeholder="Optional"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13, boxSizing: "border-box" }} />
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <label className="t-muted" style={{ display: "block", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Description</label>
              <textarea value={form.description} onChange={e => setF("description", e.target.value)}
                rows={2} placeholder="Optional description…"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
            </div>

            <div style={{ display: "flex", gap: 20, gridColumn: "1 / -1" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setF("is_active", e.target.checked)} />
                Active
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={form.is_default} onChange={e => setF("is_default", e.target.checked)} />
                ★ Set as Default Template
              </label>
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }} className="t-heading">Checklist Tasks ({tasks.length})</div>
            <button type="button" onClick={addTask} className="btn-secondary" style={{ padding: "5px 14px", fontSize: 12 }}>+ Add Task</button>
          </div>

          {tasks.length === 0 ? (
            <div className="t-muted" style={{ fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              No tasks yet. Click "+ Add Task" to add the first checklist item.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {tasks.map((t, i) => (
                <div key={i} style={{ border: "1px solid var(--c-border)", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 4 }}>
                      <button type="button" onClick={() => moveTask(i, -1)} disabled={i === 0}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 14, lineHeight: 1, padding: "0 4px" }}>▲</button>
                      <span style={{ fontSize: 11, color: "var(--c-muted)", textAlign: "center" }}>{i + 1}</span>
                      <button type="button" onClick={() => moveTask(i, 1)} disabled={i === tasks.length - 1}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 14, lineHeight: 1, padding: "0 4px" }}>▼</button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input value={t.task_name} onChange={e => setT(i, "task_name", e.target.value)}
                        placeholder={`Task ${i + 1} name…`}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13, boxSizing: "border-box" }} />
                    </div>
                    <button type="button" onClick={() => removeTask(i)}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 18, paddingTop: 6 }}>✕</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto auto", gap: 10, alignItems: "center" }}>
                    <select value={t.category} onChange={e => setT(i, "category", e.target.value)}
                      style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }}>
                      {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input value={t.owner_team} onChange={e => setT(i, "owner_team", e.target.value)}
                      placeholder="Owner team"
                      style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }} />
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input type="number" min={0} value={t.due_offset_days} onChange={e => setT(i, "due_offset_days", e.target.value)}
                        style={{ width: 60, padding: "7px 8px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12, textAlign: "center" }} />
                      <span style={{ fontSize: 11, color: "var(--c-muted)", whiteSpace: "nowrap" }}>days after joining</span>
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={t.is_mandatory} onChange={e => setT(i, "is_mandatory", e.target.checked)} />
                      Required
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : editMode ? "Save Changes" : "Create Template"}</button>
          <button type="button" onClick={() => navigate(`${base}/templates`)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
