import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

const LEVEL_LABELS = {
  1: "Executive", 2: "Director", 3: "Head of Department",
  4: "Manager", 5: "Team Lead", 6: "Senior", 7: "Employee",
  8: "Employee", 9: "Employee", 10: "Employee",
};

const TABS = ["Overview", "Employees", "Activities"];

export default function DesignationDetails() {
  const { subdomain, desigId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [desig, setDesig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Overview");
  const [toast, setToast] = useState(null);

  const [employees, setEmployees] = useState([]);
  const [empTotal, setEmpTotal] = useState(0);
  const [empLoading, setEmpLoading] = useState(false);

  const [activities, setActivities] = useState([]);
  const [actTotal, setActTotal] = useState(0);
  const [actLoading, setActLoading] = useState(false);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  const loadDesig = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await portalOrgApi.getDesig(subdomain, token, desigId);
      setDesig(r.data?.data);
    } catch { setError("Failed to load designation."); }
    finally { setLoading(false); }
  }, [subdomain, token, desigId]);

  useEffect(() => { loadDesig(); }, [loadDesig]);

  useEffect(() => {
    if (tab !== "Employees" || !desigId) return;
    setEmpLoading(true);
    portalOrgApi.getDesigEmployees(subdomain, token, desigId, { page_size: 100 })
      .then(r => { setEmployees(r.data?.data?.data || []); setEmpTotal(r.data?.data?.total || 0); })
      .catch(() => {})
      .finally(() => setEmpLoading(false));
  }, [tab, subdomain, token, desigId]);

  useEffect(() => {
    if (tab !== "Activities" || !desigId) return;
    setActLoading(true);
    portalOrgApi.getDesigActivities(subdomain, token, desigId, { page_size: 50 })
      .then(r => { setActivities(r.data?.data?.data || []); setActTotal(r.data?.data?.total || 0); })
      .catch(() => {})
      .finally(() => setActLoading(false));
  }, [tab, subdomain, token, desigId]);

  const toggleStatus = async () => {
    try {
      if (desig.is_active) await portalOrgApi.deactivateDesig(subdomain, token, desigId);
      else await portalOrgApi.activateDesig(subdomain, token, desigId);
      showToast(desig.is_active ? "Designation deactivated." : "Designation activated.");
      loadDesig();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
  };

  if (loading) return (
    <OrgLayout title="Designation">
      <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
    </OrgLayout>
  );
  if (error || !desig) return (
    <OrgLayout title="Designation">
      <div style={{ padding: 20 }}>
        <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error || "Designation not found."}</div>
        <button onClick={() => navigate(-1)} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Back</button>
      </div>
    </OrgLayout>
  );

  const levelLabel = desig.level ? LEVEL_LABELS[desig.level] || "Employee" : null;

  return (
    <OrgLayout title={desig.designation_name}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <PageHeader
        title={desig.designation_name}
        subtitle={desig.designation_code}
        actions={
          <>
            <button onClick={() => navigate(-1)} className="btn-secondary">← Back</button>
            <Link to={`/portal/${subdomain}/org/designations/${desigId}/edit`} className="btn-primary">
              Edit
            </Link>
            <button onClick={toggleStatus} className={desig.is_active ? "btn-danger" : "btn-primary"} style={{ minWidth: 100 }}>
              {desig.is_active ? "Deactivate" : "Activate"}
            </button>
          </>
        }
      />

      <div style={{ marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <Badge status={desig.is_active ? "Active" : "Inactive"} />
        {desig.level != null && <span className="badge-purple">L{desig.level}</span>}
        {levelLabel && <span className="t-muted" style={{ fontSize: 12 }}>{levelLabel}</span>}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--c-border)", marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 16px", fontSize: 13, fontWeight: tab === t ? 700 : 400, background: "none", border: "none", cursor: "pointer", color: tab === t ? "var(--c-accent)" : "var(--c-text2)", borderBottom: `2px solid ${tab === t ? "var(--c-accent)" : "transparent"}`, transition: "color 0.15s" }}>
            {t}
            {t === "Employees" && desig.total_employees > 0 && (
              <span style={{ marginLeft: 5, fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 999, background: "rgba(0,174,236,0.15)", color: "var(--c-accent)" }}>
                {desig.total_employees}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === "Overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, alignItems: "start" }}>
          <div className="portal-form-card">
            <div className="portal-form-title">Designation Details</div>
            {[
              ["Code",         <span style={{ fontFamily: "monospace", fontSize: 12, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>{desig.designation_code}</span>],
              ["Name",         desig.designation_name],
              ["Level",        desig.level != null ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="badge-purple">L{desig.level}</span><span className="t-muted" style={{ fontSize: 12 }}>{levelLabel}</span></span> : "—"],
              ["Status",       <Badge status={desig.is_active ? "Active" : "Inactive"} />],
              ["Description",  desig.description || <span className="t-muted" style={{ opacity: 0.5 }}>—</span>],
              ["Employees",    <span style={{ fontWeight: 600, color: "var(--c-text)" }}>{desig.total_employees ?? 0}</span>],
              ["Created",      desig.created_at ? new Date(desig.created_at).toLocaleDateString() : "—"],
              ["Last Updated", desig.updated_at ? new Date(desig.updated_at).toLocaleDateString() : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--c-border)" }}>
                <div style={{ width: 120 }} className="portal-form-label">{label}</div>
                <div style={{ fontSize: 13, color: "var(--c-text)" }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="portal-form-card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: "var(--c-accent)" }}>{desig.total_employees ?? 0}</div>
            <div className="t-muted" style={{ fontSize: 14, marginTop: 4 }}>total employees</div>
            <div style={{ marginTop: 24 }}>
              <button onClick={() => setTab("Employees")} className="btn-secondary" style={{ width: "100%" }}>
                View Employees →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Employees Tab ── */}
      {tab === "Employees" && (
        <div className="portal-table-wrap">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>Employees — {empTotal} total</div>
          </div>
          {empLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
          ) : employees.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No employees assigned to this designation.</div>
          ) : (
            <table className="portal-table">
              <thead>
                <tr>
                  {["#", "Code", "Name", "Department", "Status"].map(h => (
                    <th key={h} style={{ textAlign: h === "#" ? "center" : "left", width: h === "#" ? 40 : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={emp.id}>
                    <td style={{ width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{i + 1}</td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                        {emp.employee_code}
                      </span>
                    </td>
                    <td>
                      <Link to={`/portal/${subdomain}/employees/${emp.id}`}
                        className="t-accent" style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
                        {emp.full_name}
                      </Link>
                    </td>
                    <td className="t-muted" style={{ fontSize: 12 }}>
                      {emp.department_name || <span style={{ opacity: 0.5 }}>—</span>}
                    </td>
                    <td>
                      <Badge status={emp.is_active ? "Active" : "Inactive"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Activities Tab ── */}
      {tab === "Activities" && (
        <div className="portal-table-wrap">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--c-border)" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>Activity Log — {actTotal} entries</div>
          </div>
          {actLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
          ) : activities.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No activity recorded yet.</div>
          ) : (
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 1 }}>
              {activities.map(a => {
                const label = a.action.replace(/_/g, " ").replace(/^DESIGNATION /, "");
                const isDeact  = a.action.includes("DEACTIVATED");
                const color = isDeact ? "#f87171" : "#4ade80";
                return (
                  <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 4px", borderBottom: "1px solid var(--c-border)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--c-text)", fontWeight: 500 }}>{label}</div>
                      {a.extra && typeof a.extra === "object" && a.extra.designation_name && (
                        <div className="t-muted" style={{ fontSize: 11, marginTop: 2 }}>{a.extra.designation_name}</div>
                      )}
                    </div>
                    <div className="t-muted" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </OrgLayout>
  );
}
