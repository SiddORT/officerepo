import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalOnboardingApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const TABS = ["Overview", "Checklist", "Documents", "Assets", "Accounts", "Training", "Activities"];

const STATUS_COLOR = {
  "Preboarding":           "#6366f1",
  "Onboarding In Progress":"var(--c-accent)",
  "Ready For Activation":  "#f59e0b",
  "Completed":             "#22c55e",
  "On Hold":               "#6b7280",
  "Cancelled":             "#ef4444",
  "Deferred":              "#9ca3af",
};

const TASK_STATUS_COLOR = {
  "Pending":     "#6b7280",
  "In Progress": "var(--c-accent)",
  "Completed":   "#22c55e",
  "Skipped":     "#9ca3af",
};

const Field = ({ label, value }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 13 }} className="t-heading">{value || <span className="t-muted">—</span>}</div>
  </div>
);

const ProgressBar = ({ pct, status }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div style={{ flex: 1, height: 8, background: "var(--c-border)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`, height: "100%", borderRadius: 4, transition: "width 0.4s",
        background: pct === 100 ? "#22c55e" : status === "Ready For Activation" ? "#f59e0b" : "var(--c-accent)",
      }} />
    </div>
    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", minWidth: 36 }}>{pct}%</span>
  </div>
);

export default function OnboardingDetails() {
  const { subdomain, onboardingId } = useParams();
  const { token } = usePortalAuth();
  const navigate  = useNavigate();
  const base      = `/portal/${subdomain}/hrms/onboarding`;

  const [ob,        setOb]        = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [tab,       setTab]       = useState("Overview");
  const [loading,   setLoading]   = useState(true);
  const [acting,    setActing]    = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  // Sub-data loaded per-tab
  const [tasks,     setTasks]     = useState(null);
  const [accounts,  setAccounts]  = useState(null);
  const [training,  setTraining]  = useState(null);
  const [activities,setActivities]= useState(null);

  // Inline form state
  const [addTaskForm,  setAddTaskForm]  = useState(null);
  const [addAcctForm,  setAddAcctForm]  = useState(null);
  const [addTrainForm, setAddTrainForm] = useState(null);
  const [editAcct,     setEditAcct]     = useState(null);
  const [editTrain,    setEditTrain]    = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    portalOnboardingApi.get(subdomain, token, onboardingId)
      .then(r => {
        const d = r.data?.data || {};
        setOb(d);
        setTasks(d.tasks || []);
        setAccounts(d.accounts || []);
        setTraining(d.training || []);
        setActivities(d.activities || []);
      })
      .catch(() => navigate(base))
      .finally(() => setLoading(false));
  }, [subdomain, token, onboardingId]);

  useEffect(() => { load(); }, [load]);

  const loadReadiness = () => {
    portalOnboardingApi.readiness(subdomain, token, onboardingId)
      .then(r => setReadiness(r.data?.data || null))
      .catch(() => {});
  };

  useEffect(() => { if (tab === "Overview") loadReadiness(); }, [tab, onboardingId]);

  const doActivate = async () => {
    if (!window.confirm("Activate this employee? Their status will change to Active.")) return;
    setActing(true); setError(""); setSuccess("");
    try {
      await portalOnboardingApi.activate(subdomain, token, onboardingId);
      setSuccess("Employee activated successfully!");
      load();
    } catch (err) {
      const d = err.response?.data;
      const blockers = d?.detail?.blockers || d?.blockers || [];
      setError(blockers.length ? `Cannot activate: ${blockers.join(", ")}` : (d?.message || d?.detail || "Activation failed."));
    } finally {
      setActing(false);
    }
  };

  const doUpdateTaskStatus = async (taskId, status) => {
    try {
      await portalOnboardingApi.updateTask(subdomain, token, onboardingId, taskId, { status });
      const r = await portalOnboardingApi.get(subdomain, token, onboardingId);
      const d = r.data?.data || {};
      setOb(d);
      setTasks(d.tasks || []);
    } catch (err) {
      alert(err.response?.data?.message || "Update failed.");
    }
  };

  const doAddTask = async () => {
    if (!addTaskForm?.task_name?.trim()) return;
    try {
      await portalOnboardingApi.addTask(subdomain, token, onboardingId, addTaskForm);
      setAddTaskForm(null);
      load();
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
  };

  const doAddAccount = async () => {
    if (!addAcctForm?.account_type) return;
    try {
      await portalOnboardingApi.createAccount(subdomain, token, onboardingId, addAcctForm);
      setAddAcctForm(null);
      const r = await portalOnboardingApi.listAccounts(subdomain, token, onboardingId);
      setAccounts(r.data?.data || []);
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
  };

  const doUpdateAccount = async (accountId, data) => {
    try {
      await portalOnboardingApi.updateAccount(subdomain, token, onboardingId, accountId, data);
      setEditAcct(null);
      const r = await portalOnboardingApi.listAccounts(subdomain, token, onboardingId);
      setAccounts(r.data?.data || []);
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
  };

  const doDeleteAccount = async (accountId) => {
    if (!window.confirm("Remove this account?")) return;
    try {
      await portalOnboardingApi.deleteAccount(subdomain, token, onboardingId, accountId);
      setAccounts(a => a.filter(x => x.id !== accountId));
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
  };

  const doAddTraining = async () => {
    if (!addTrainForm?.course_name?.trim()) return;
    try {
      await portalOnboardingApi.createTraining(subdomain, token, onboardingId, addTrainForm);
      setAddTrainForm(null);
      const r = await portalOnboardingApi.listTraining(subdomain, token, onboardingId);
      setTraining(r.data?.data || []);
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
  };

  const doUpdateTraining = async (trainingId, data) => {
    try {
      await portalOnboardingApi.updateTraining(subdomain, token, onboardingId, trainingId, data);
      setEditTrain(null);
      const r = await portalOnboardingApi.listTraining(subdomain, token, onboardingId);
      setTraining(r.data?.data || []);
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
  };

  const doDeleteTraining = async (trainingId) => {
    if (!window.confirm("Remove this training?")) return;
    try {
      await portalOnboardingApi.deleteTraining(subdomain, token, onboardingId, trainingId);
      setTraining(t => t.filter(x => x.id !== trainingId));
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center" }} className="t-muted">Loading onboarding details…</div>;
  if (!ob)     return null;

  const statusColor = STATUS_COLOR[ob.status] || "#6b7280";
  const isActive    = ["Preboarding", "Onboarding In Progress", "Ready For Activation"].includes(ob.status);
  const canActivate = ob.status === "Ready For Activation";

  return (
    <div>
      <PageHeader
        title={ob.employee_name || "Onboarding"}
        subtitle={`${ob.onboarding_number} · ${ob.designation_name || ""}`}
        breadcrumbs={[
          { label: "Employee Onboarding", path: base },
          { label: "All Records", path: `${base}/list` },
          { label: ob.employee_name || ob.onboarding_number },
        ]}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {canActivate && (
              <button onClick={doActivate} disabled={acting} className="btn-primary"
                style={{ background: "#22c55e", borderColor: "#22c55e" }}>
                {acting ? "Activating…" : "✓ Activate Employee"}
              </button>
            )}
            {isActive && !canActivate && (
              <button onClick={() => setTab("Checklist")} className="btn-secondary">📋 Checklist</button>
            )}
          </div>
        }
      />

      {/* Header card */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{
              display: "inline-block", padding: "4px 12px", borderRadius: 12,
              fontSize: 12, fontWeight: 700, background: statusColor + "22", color: statusColor,
            }}>{ob.status}</span>
            {ob.joining_date && <span className="t-muted" style={{ fontSize: 12 }}>📅 Joining: {ob.joining_date}</span>}
          </div>
          <ProgressBar pct={ob.progress_percent || 0} status={ob.status} />
        </div>
        {ob.template_name && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Template</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{ob.template_name}</div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#991b1b", fontSize: 13 }}>
          {error} <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#991b1b" }}>✕</button>
        </div>
      )}
      {success && (
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#166534", fontSize: 13 }}>
          {success} <button onClick={() => setSuccess("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: "#166534" }}>✕</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid var(--c-border)", marginBottom: 24, overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: "10px 18px", background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: tab === t ? 700 : 500,
              color: tab === t ? "var(--c-accent)" : "var(--c-muted)",
              borderBottom: tab === t ? "2px solid var(--c-accent)" : "2px solid transparent",
              marginBottom: -2, whiteSpace: "nowrap",
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {tab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }} className="t-heading">Employee Details</div>
            <Field label="Name"        value={ob.employee_name} />
            <Field label="Code"        value={ob.employee_code} />
            <Field label="Category"    value={ob.employee_category} />
            <Field label="Designation" value={ob.designation_name} />
            <Field label="Department"  value={ob.department_name} />
            <Field label="Joining Date" value={ob.joining_date} />
          </div>

          <div className="card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }} className="t-heading">Onboarding Info</div>
            <Field label="Number"     value={ob.onboarding_number} />
            <Field label="Status"     value={ob.status} />
            <Field label="Started"    value={ob.started_at?.slice(0, 10)} />
            <Field label="Completed"  value={ob.completed_at?.slice(0, 10)} />
            <Field label="Activated"  value={ob.activated_at?.slice(0, 10)} />
            {ob.notes && <Field label="Notes" value={ob.notes} />}
          </div>

          {/* Readiness panel */}
          {readiness && (
            <div className="card" style={{ padding: 20, gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }} className="t-heading">Activation Readiness</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    fontSize: 24, fontWeight: 800,
                    color: readiness.can_activate ? "#22c55e" : "#f59e0b",
                  }}>{readiness.readiness_score}%</span>
                  {readiness.can_activate ? (
                    <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>✓ Ready to activate</span>
                  ) : (
                    <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>⚠ Blockers remain</span>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                {(readiness.checks || []).map(c => (
                  <div key={c.label} style={{
                    padding: "10px 12px", borderRadius: 8,
                    border: `1px solid ${c.ok ? "#22c55e44" : "#f59e0b44"}`,
                    background: c.ok ? "#22c55e11" : "#f59e0b11",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{c.label}</span>
                      <span style={{ fontSize: 16 }}>{c.ok ? "✅" : "⚠️"}</span>
                    </div>
                    <span className="t-muted" style={{ fontSize: 11 }}>{c.done}/{c.total} done</span>
                  </div>
                ))}
              </div>
              {(readiness.blockers || []).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", marginBottom: 6 }}>Blockers</div>
                  {readiness.blockers.map((b, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#f59e0b", marginBottom: 3 }}>• {b}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Checklist ─────────────────────────────────────────────────────── */}
      {tab === "Checklist" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="t-muted" style={{ fontSize: 13 }}>{(tasks || []).filter(t => t.status === "Completed").length} / {(tasks || []).length} tasks done</div>
            {isActive && (
              <button onClick={() => setAddTaskForm({ task_name: "", category: "HR", owner_team: "", is_mandatory: false, due_date: "" })}
                className="btn-secondary" style={{ padding: "5px 14px", fontSize: 12 }}>+ Add Task</button>
            )}
          </div>

          {addTaskForm && (
            <div className="card" style={{ padding: 16, marginBottom: 16, border: "1px dashed var(--c-accent)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 8, alignItems: "center" }}>
                <input value={addTaskForm.task_name} onChange={e => setAddTaskForm(f => ({ ...f, task_name: e.target.value }))}
                  placeholder="Task name…" autoFocus
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13 }} />
                <select value={addTaskForm.category} onChange={e => setAddTaskForm(f => ({ ...f, category: e.target.value }))}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }}>
                  {["HR","IT","Admin","Manager","Finance"].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={doAddTask} className="btn-primary" style={{ padding: "7px 14px", fontSize: 12 }}>Add</button>
                <button onClick={() => setAddTaskForm(null)} className="btn-secondary" style={{ padding: "7px 12px", fontSize: 12 }}>✕</button>
              </div>
            </div>
          )}

          {["HR", "IT", "Admin", "Manager", "Finance"].map(cat => {
            const catTasks = (tasks || []).filter(t => t.category === cat);
            if (catTasks.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                  {cat} ({catTasks.filter(t => t.status === "Completed").length}/{catTasks.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {catTasks.map(t => (
                    <div key={t.id} className="card" style={{
                      padding: "10px 14px", display: "flex", alignItems: "center", gap: 12,
                      opacity: t.status === "Skipped" ? 0.6 : 1,
                      borderLeft: `3px solid ${TASK_STATUS_COLOR[t.status] || "#6b7280"}`,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, textDecoration: t.status === "Completed" ? "line-through" : "none" }}>
                            {t.task_name}
                          </span>
                          {t.is_mandatory && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>REQUIRED</span>}
                        </div>
                        <div className="t-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {t.owner_team && `Owner: ${t.owner_team} · `}
                          {t.due_date && `Due: ${t.due_date} · `}
                          {t.completed_by && `Completed by ${t.completed_by}`}
                        </div>
                      </div>
                      {isActive && (
                        <div style={{ display: "flex", gap: 6 }}>
                          {t.status !== "Completed" && (
                            <button onClick={() => doUpdateTaskStatus(t.id, "Completed")}
                              style={{ padding: "4px 10px", fontSize: 11, background: "#22c55e22", border: "1px solid #22c55e", color: "#22c55e", borderRadius: 6, cursor: "pointer" }}>
                              ✓ Done
                            </button>
                          )}
                          {t.status === "Pending" && (
                            <button onClick={() => doUpdateTaskStatus(t.id, "Skipped")}
                              style={{ padding: "4px 10px", fontSize: 11, background: "none", border: "1px solid var(--c-border)", color: "var(--c-muted)", borderRadius: 6, cursor: "pointer" }}>
                              Skip
                            </button>
                          )}
                          {(t.status === "Completed" || t.status === "Skipped") && (
                            <button onClick={() => doUpdateTaskStatus(t.id, "Pending")}
                              style={{ padding: "4px 10px", fontSize: 11, background: "none", border: "1px solid var(--c-border)", color: "var(--c-muted)", borderRadius: 6, cursor: "pointer" }}>
                              Undo
                            </button>
                          )}
                        </div>
                      )}
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                        background: (TASK_STATUS_COLOR[t.status] || "#6b7280") + "22",
                        color: TASK_STATUS_COLOR[t.status] || "#6b7280",
                      }}>{t.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {(tasks || []).length === 0 && (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div className="t-muted">No tasks. Add tasks manually or use a template when starting onboarding.</div>
            </div>
          )}
        </div>
      )}

      {/* ── Documents ─────────────────────────────────────────────────────── */}
      {tab === "Documents" && (
        <div>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="t-muted" style={{ fontSize: 13 }}>Employee documents are managed in the Employee Documents module.</div>
            <button onClick={() => navigate(`/portal/${subdomain}/hrms/employee-documents/${ob.employee_id}`)}
              className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}>
              Open Employee Documents →
            </button>
          </div>
          {ob.doc_summary && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }} className="t-heading">Document Summary</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
                <div style={{ textAlign: "center", padding: 14, background: "var(--c-hover)", borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }} className="t-heading">{ob.doc_summary.total || 0}</div>
                  <div className="t-muted" style={{ fontSize: 12 }}>Total Docs</div>
                </div>
                <div style={{ textAlign: "center", padding: 14, background: "#22c55e11", borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#22c55e" }}>{ob.doc_summary.verified || 0}</div>
                  <div className="t-muted" style={{ fontSize: 12 }}>Verified</div>
                </div>
                <div style={{ textAlign: "center", padding: 14, background: ob.doc_summary.all_mandatory_verified ? "#22c55e11" : "#f59e0b11", borderRadius: 8 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: ob.doc_summary.all_mandatory_verified ? "#22c55e" : "#f59e0b" }}>
                    {ob.doc_summary.completion_percent || 0}%
                  </div>
                  <div className="t-muted" style={{ fontSize: 12 }}>Mandatory Complete</div>
                </div>
              </div>
              {(ob.doc_summary.pending_mandatory || []).length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", marginBottom: 6 }}>Pending Mandatory Docs</div>
                  {ob.doc_summary.pending_mandatory.map((nm, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#f59e0b", marginBottom: 3 }}>• {nm}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Assets ────────────────────────────────────────────────────────── */}
      {tab === "Assets" && (
        <div>
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }} className="t-heading">Assigned Assets ({(ob.asset_summary?.assignments || []).length})</div>
            <button onClick={() => navigate(`/portal/${subdomain}/hrms/assets`)} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 12 }}>
              Asset Inventory →
            </button>
          </div>
          {(ob.asset_summary?.assignments || []).length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
              <div className="t-muted">No assets assigned yet. Assign from the Asset Inventory module.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ob.asset_summary.assignments.map(a => (
                <div key={a.assignment_id} className="card" style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ fontSize: 24 }}>🖥️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.asset_name || "—"}</div>
                    <div className="t-muted" style={{ fontSize: 11 }}>{a.asset_code} · {a.category}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Assigned</div>
                    {a.assigned_date && <div className="t-muted" style={{ fontSize: 11 }}>{a.assigned_date}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Accounts ──────────────────────────────────────────────────────── */}
      {tab === "Accounts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }} className="t-heading">Provisioned Accounts ({(accounts || []).length})</div>
            {isActive && (
              <button onClick={() => setAddAcctForm({ account_type: "", username: "", notes: "", status: "Pending", created_date: "" })}
                className="btn-secondary" style={{ padding: "5px 14px", fontSize: 12 }}>+ Add Account</button>
            )}
          </div>

          {addAcctForm && (
            <div className="card" style={{ padding: 16, marginBottom: 16, border: "1px dashed var(--c-accent)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--c-muted)", display: "block", marginBottom: 4 }}>Account Type *</label>
                  <select value={addAcctForm.account_type} onChange={e => setAddAcctForm(f => ({ ...f, account_type: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }}>
                    <option value="">— Select —</option>
                    {["Official Email","Employee Portal Access","VPN Access","HRMS Access","Project Tools","Slack / Teams","GitHub / GitLab","Other"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--c-muted)", display: "block", marginBottom: 4 }}>Username</label>
                  <input value={addAcctForm.username} onChange={e => setAddAcctForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="e.g. john.doe@company.com"
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "var(--c-muted)", display: "block", marginBottom: 4 }}>Status</label>
                  <select value={addAcctForm.status} onChange={e => setAddAcctForm(f => ({ ...f, status: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }}>
                    {["Pending","Created","Active","Suspended"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={doAddAccount} className="btn-primary" style={{ padding: "6px 16px", fontSize: 12 }}>Save</button>
                <button onClick={() => setAddAcctForm(null)} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          )}

          {(accounts || []).length === 0 && !addAcctForm ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💻</div>
              <div className="t-muted">No accounts provisioned yet.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(accounts || []).map(a => (
                editAcct?.id === a.id ? (
                  <div key={a.id} className="card" style={{ padding: 14, border: "1px solid var(--c-accent)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <input value={editAcct.username || ""} onChange={e => setEditAcct(f => ({ ...f, username: e.target.value }))}
                        placeholder="Username"
                        style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }} />
                      <select value={editAcct.status} onChange={e => setEditAcct(f => ({ ...f, status: e.target.value }))}
                        style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }}>
                        {["Pending","Created","Active","Suspended"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input value={editAcct.notes || ""} onChange={e => setEditAcct(f => ({ ...f, notes: e.target.value }))}
                        placeholder="Notes"
                        style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }} />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => doUpdateAccount(a.id, { username: editAcct.username, status: editAcct.status, notes: editAcct.notes })} className="btn-primary" style={{ padding: "5px 14px", fontSize: 12 }}>Save</button>
                      <button onClick={() => setEditAcct(null)} className="btn-secondary" style={{ padding: "5px 12px", fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={a.id} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{a.account_type}</div>
                      <div className="t-muted" style={{ fontSize: 11 }}>
                        {a.username || "No username set"}
                        {a.notes ? ` · ${a.notes}` : ""}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                      background: a.status === "Active" ? "#22c55e22" : a.status === "Pending" ? "#f59e0b22" : "#6b728022",
                      color: a.status === "Active" ? "#22c55e" : a.status === "Pending" ? "#f59e0b" : "#6b7280",
                    }}>{a.status}</span>
                    {isActive && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditAcct({ ...a })} className="btn-secondary" style={{ padding: "3px 10px", fontSize: 11 }}>Edit</button>
                        <button onClick={() => doDeleteAccount(a.id)} style={{ padding: "3px 10px", fontSize: 11, background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 6, cursor: "pointer" }}>✕</button>
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Training ──────────────────────────────────────────────────────── */}
      {tab === "Training" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }} className="t-heading">Training Assignments ({(training || []).length})</div>
            {isActive && (
              <button onClick={() => setAddTrainForm({ course_name: "", course_type: "", provider: "", is_mandatory: false, assigned_date: "", due_date: "", status: "Assigned" })}
                className="btn-secondary" style={{ padding: "5px 14px", fontSize: 12 }}>+ Assign Training</button>
            )}
          </div>

          {addTrainForm && (
            <div className="card" style={{ padding: 16, marginBottom: 16, border: "1px dashed var(--c-accent)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <input value={addTrainForm.course_name} onChange={e => setAddTrainForm(f => ({ ...f, course_name: e.target.value }))}
                  placeholder="Course name *" autoFocus
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }} />
                <select value={addTrainForm.course_type} onChange={e => setAddTrainForm(f => ({ ...f, course_type: e.target.value }))}
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }}>
                  <option value="">Type</option>
                  {["Mandatory","Policy","Compliance","Technical","Soft Skills","Optional"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={addTrainForm.due_date} onChange={e => setAddTrainForm(f => ({ ...f, due_date: e.target.value }))}
                  type="date" placeholder="Due date"
                  style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }} />
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                <input value={addTrainForm.provider} onChange={e => setAddTrainForm(f => ({ ...f, provider: e.target.value }))}
                  placeholder="Provider / platform"
                  style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }} />
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                  <input type="checkbox" checked={addTrainForm.is_mandatory} onChange={e => setAddTrainForm(f => ({ ...f, is_mandatory: e.target.checked }))} />
                  Mandatory
                </label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={doAddTraining} className="btn-primary" style={{ padding: "6px 16px", fontSize: 12 }}>Save</button>
                <button onClick={() => setAddTrainForm(null)} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }}>Cancel</button>
              </div>
            </div>
          )}

          {(training || []).length === 0 && !addTrainForm ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
              <div className="t-muted">No training assigned yet.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(training || []).map(tr => (
                editTrain?.id === tr.id ? (
                  <div key={tr.id} className="card" style={{ padding: 14, border: "1px solid var(--c-accent)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                      <div>
                        <label style={{ fontSize: 11, color: "var(--c-muted)", display: "block", marginBottom: 4 }}>Status</label>
                        <select value={editTrain.status} onChange={e => setEditTrain(f => ({ ...f, status: e.target.value }))}
                          style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12 }}>
                          {["Assigned","In Progress","Completed","Skipped"].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: "var(--c-muted)", display: "block", marginBottom: 4 }}>Completed Date</label>
                        <input type="date" value={editTrain.completed_date || ""} onChange={e => setEditTrain(f => ({ ...f, completed_date: e.target.value }))}
                          style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 12, boxSizing: "border-box" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => doUpdateTraining(tr.id, { status: editTrain.status, completed_date: editTrain.completed_date || null })} className="btn-primary" style={{ padding: "5px 14px", fontSize: 12 }}>Save</button>
                      <button onClick={() => setEditTrain(null)} className="btn-secondary" style={{ padding: "5px 12px", fontSize: 12 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div key={tr.id} className="card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {tr.course_name}
                        {tr.is_mandatory && <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700, marginLeft: 8 }}>REQUIRED</span>}
                      </div>
                      <div className="t-muted" style={{ fontSize: 11 }}>
                        {tr.course_type || "General"}
                        {tr.provider ? ` · ${tr.provider}` : ""}
                        {tr.due_date  ? ` · Due: ${tr.due_date}` : ""}
                        {tr.completed_date ? ` · Completed: ${tr.completed_date}` : ""}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                      background: tr.status === "Completed" ? "#22c55e22" : tr.status === "In Progress" ? "var(--c-accent)22" : "#6b728022",
                      color: tr.status === "Completed" ? "#22c55e" : tr.status === "In Progress" ? "var(--c-accent)" : "#6b7280",
                    }}>{tr.status}</span>
                    {isActive && (
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setEditTrain({ ...tr })} className="btn-secondary" style={{ padding: "3px 10px", fontSize: 11 }}>Edit</button>
                        <button onClick={() => doDeleteTraining(tr.id)} style={{ padding: "3px 10px", fontSize: 11, background: "none", border: "1px solid #ef4444", color: "#ef4444", borderRadius: 6, cursor: "pointer" }}>✕</button>
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Activities ─────────────────────────────────────────────────────── */}
      {tab === "Activities" && (
        <div>
          {(activities || []).length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div className="t-muted">No activity recorded yet.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {(activities || []).map((a, i) => (
                <div key={a.id} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < activities.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--c-accent)", marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.action}</div>
                    <div className="t-muted" style={{ fontSize: 11 }}>
                      {a.actor && `by ${a.actor} · `}
                      {a.created_at?.slice(0, 16).replace("T", " ")}
                    </div>
                    {(a.old_value || a.new_value) && (
                      <div style={{ fontSize: 12, marginTop: 4, color: "var(--c-muted)" }}>
                        {a.old_value && <span style={{ textDecoration: "line-through", marginRight: 8 }}>{a.old_value}</span>}
                        {a.new_value && <span>{a.new_value}</span>}
                      </div>
                    )}
                    {a.notes && <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>{a.notes}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
