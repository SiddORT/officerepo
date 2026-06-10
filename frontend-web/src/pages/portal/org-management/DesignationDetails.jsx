import React, { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

// ── Level badge ───────────────────────────────────────────────────────────────
const LEVEL_COLORS = [
  null,
  { bg: "rgba(245,158,11,0.15)", color: "#f59e0b" },   // L1 CEO
  { bg: "rgba(249,115,22,0.15)", color: "#f97316" },   // L2 Director
  { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },   // L3 Head
  { bg: "rgba(59,130,246,0.15)", color: "#3b82f6" },   // L4 Manager
  { bg: "rgba(6,182,212,0.15)",  color: "#06b6d4" },   // L5 Team Lead
  { bg: "rgba(34,197,94,0.15)",  color: "#22c55e" },   // L6 Senior
  { bg: "rgba(100,116,139,0.15)",color: "#94a3b8" },   // L7
  { bg: "rgba(100,116,139,0.12)",color: "#94a3b8" },   // L8
  { bg: "rgba(100,116,139,0.10)",color: "#94a3b8" },   // L9
  { bg: "rgba(100,116,139,0.08)",color: "#94a3b8" },   // L10
];

function LevelBadge({ level }) {
  if (level == null) return <span style={{ color: "var(--c-muted)", fontSize: 12 }}>—</span>;
  const s = LEVEL_COLORS[level] || LEVEL_COLORS[7];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: s.bg, color: s.color, border: `1px solid ${s.color}40` }}>
      L{level}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
      background: active ? "rgba(34,197,94,0.1)" : "rgba(100,116,139,0.15)",
      color: active ? "#4ade80" : "var(--c-muted)" }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function EmpStatusBadge({ active }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 999,
      background: active ? "rgba(34,197,94,0.08)" : "rgba(100,116,139,0.1)",
      color: active ? "#4ade80" : "var(--c-muted)" }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

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
        <button onClick={() => navigate(-1)} style={{ fontSize: 13, color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
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
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: "18px 20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Icon */}
            <div style={{ width: 48, height: 48, borderRadius: 10, background: "linear-gradient(135deg,var(--c-accent),#ff7a1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
              🎖️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--c-text)" }}>{desig.designation_name}</h2>
                <StatusBadge active={desig.is_active} />
                {desig.level != null && <LevelBadge level={desig.level} />}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontSize: 11, padding: "1px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                  {desig.designation_code}
                </span>
                {levelLabel && (
                  <span style={{ fontSize: 12, color: "var(--c-muted)" }}>{levelLabel}</span>
                )}
                <span style={{ fontSize: 12, color: "var(--c-muted)" }}>
                  {desig.total_employees ?? 0} {desig.total_employees === 1 ? "employee" : "employees"}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link to={`/portal/${subdomain}/org/designations/${desigId}/edit`}
              style={{ padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "var(--c-accent)", color: "#fff", textDecoration: "none" }}>
              Edit
            </Link>
            <button onClick={toggleStatus}
              style={{ padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", background: "transparent", border: `1px solid ${desig.is_active ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, color: desig.is_active ? "#f87171" : "#4ade80" }}>
              {desig.is_active ? "Deactivate" : "Activate"}
            </button>
            <button onClick={() => navigate(-1)}
              style={{ padding: "7px 12px", borderRadius: 6, fontSize: 13, background: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
              ←
            </button>
          </div>
        </div>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
          {/* Details card */}
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", marginBottom: 14 }}>Designation Details</div>
            {[
              ["Code",         <span style={{ fontFamily: "monospace", fontSize: 12, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>{desig.designation_code}</span>],
              ["Name",         desig.designation_name],
              ["Level",        desig.level != null ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}><LevelBadge level={desig.level} /><span style={{ fontSize: 12, color: "var(--c-muted)" }}>{levelLabel}</span></span> : "—"],
              ["Status",       <StatusBadge active={desig.is_active} />],
              ["Description",  desig.description || <span style={{ opacity: 0.5 }}>—</span>],
              ["Employees",    <span style={{ fontWeight: 600, color: "var(--c-text)" }}>{desig.total_employees ?? 0}</span>],
              ["Created",      desig.created_at ? new Date(desig.created_at).toLocaleDateString() : "—"],
              ["Last Updated", desig.updated_at ? new Date(desig.updated_at).toLocaleDateString() : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--c-border)" }}>
                <div style={{ width: 120, fontSize: 12, color: "var(--c-muted)", fontWeight: 500, flexShrink: 0 }}>{label}</div>
                <div style={{ fontSize: 13, color: "var(--c-text)" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Stats card */}
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", marginBottom: 14 }}>Employee Count</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: "var(--c-accent)" }}>{desig.total_employees ?? 0}</div>
                <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 4 }}>total employees</div>
              </div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--c-border)" }}>
              <button onClick={() => setTab("Employees")}
                style={{ width: "100%", padding: "8px 0", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "rgba(0,174,236,0.08)", color: "var(--c-accent)", border: "1px solid rgba(0,174,236,0.2)", cursor: "pointer" }}>
                View Employees →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Employees Tab ── */}
      {tab === "Employees" && (
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>Employees — {empTotal} total</div>
          </div>
          {empLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
          ) : employees.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No employees assigned to this designation.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                  {["#", "Code", "Name", "Department", "Status"].map(h => (
                    <th key={h} style={{ padding: "9px 14px", textAlign: h === "#" ? "center" : "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", width: h === "#" ? 40 : undefined }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, i) => (
                  <tr key={emp.id} style={{ borderBottom: i < employees.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                    <td style={{ padding: "11px 14px", width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{i + 1}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                        {emp.employee_code}
                      </span>
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <Link to={`/portal/${subdomain}/employees/${emp.id}`}
                        style={{ fontSize: 13, fontWeight: 600, color: "var(--c-accent)", textDecoration: "none" }}>
                        {emp.full_name}
                      </Link>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: 12, color: "var(--c-muted)" }}>
                      {emp.department_name || <span style={{ opacity: 0.5 }}>—</span>}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <EmpStatusBadge active={emp.is_active} />
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
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
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
                const isCreate = a.action.includes("CREATED");
                const isDeact  = a.action.includes("DEACTIVATED");
                const isAct    = a.action.includes("ACTIVATED") && !isDeact;
                const color = isCreate ? "#4ade80" : isDeact ? "#f87171" : isAct ? "#4ade80" : "var(--c-accent)";
                return (
                  <div key={a.id} style={{ display: "flex", gap: 12, padding: "10px 4px", borderBottom: "1px solid var(--c-border)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: "var(--c-text)", fontWeight: 500 }}>{label}</div>
                      {a.extra && typeof a.extra === "object" && a.extra.designation_name && (
                        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>{a.extra.designation_name}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--c-muted)", whiteSpace: "nowrap" }}>
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
