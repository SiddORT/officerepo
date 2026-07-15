import React, { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../contexts/PortalAuthContext";
import { portalUserMgmtApi, portalOrgApi } from "../../services/apiClient";
import StatCard from "./shared/StatCard";

const MODULE_CARDS = [
  {
    key: "user-management",
    label: "User Management",
    description: "Manage workspace members, roles, sessions and login logs.",
    icon: "👥",
    path: "user-management/users",
    color: "#00aeec",
    links: [
      { label: "Users",    path: "user-management/users"    },
      { label: "Roles",    path: "user-management/roles"    },
      { label: "Sessions", path: "user-management/sessions" },
    ],
  },
  {
    key: "employees",
    label: "Employees",
    description: "View and manage employee profiles, records and documents.",
    icon: "🪪",
    path: "employees",
    color: "#a855f7",
    links: [
      { label: "All Employees", path: "employees"     },
      { label: "Add Employee",  path: "employees/new" },
    ],
  },
  {
    key: "org-management",
    label: "Organisation",
    description: "Companies, departments, designations and reporting structure.",
    icon: "🏢",
    path: "org/companies",
    color: "#f59e0b",
    links: [
      { label: "Companies",    path: "org/companies"    },
      { label: "Departments",  path: "org/departments"  },
      { label: "Designations", path: "org/designations" },
    ],
  },
];

function getExpiryStatus(dateStr) {
  if (!dateStr) return "ok";
  const [year, month, day] = String(dateStr).slice(0, 10).split("-").map(Number);
  const expiry = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor((expiry - today) / 86400000);
  if (daysLeft < 0) return { status: "expired", daysLeft };
  if (daysLeft <= 30) return { status: "expiring_soon", daysLeft };
  return { status: "ok", daysLeft };
}

function ExpiringDocumentsPanel({ subdomain, token }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token || !subdomain) return;
    setLoading(true);
    portalOrgApi.listExpiringDocs(subdomain, token, 30)
      .then(r => setDocs(r.data?.data || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, [token, subdomain]);

  if (loading || dismissed || docs.length === 0) return null;

  const expired = docs.filter(d => {
    const r = getExpiryStatus(d.expiry_date);
    return r.status === "expired";
  });
  const expiringSoon = docs.filter(d => {
    const r = getExpiryStatus(d.expiry_date);
    return r.status === "expiring_soon";
  });

  return (
    <div style={{
      borderRadius: 12,
      border: "1px solid rgba(251,191,36,0.35)",
      background: "rgba(251,191,36,0.06)",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
        borderBottom: "1px solid rgba(251,191,36,0.2)",
        background: "rgba(251,191,36,0.09)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#d97706" }}>
              Document Expiry Alerts
            </div>
            <div style={{ fontSize: 11, color: "#92400e", marginTop: 1 }}>
              {expired.length > 0 && (
                <span style={{ color: "#ef4444", fontWeight: 600 }}>{expired.length} expired</span>
              )}
              {expired.length > 0 && expiringSoon.length > 0 && <span style={{ color: "#92400e" }}> · </span>}
              {expiringSoon.length > 0 && (
                <span style={{ color: "#d97706", fontWeight: 600 }}>{expiringSoon.length} expiring within 30 days</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          title="Dismiss"
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#92400e", fontSize: 16, padding: "2px 6px", borderRadius: 4,
            opacity: 0.7, lineHeight: 1,
          }}>
          ✕
        </button>
      </div>

      {/* Document rows */}
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {docs.map(doc => {
          const dateStr = doc.expiry_date ? String(doc.expiry_date).slice(0, 10) : null;
          const info = getExpiryStatus(dateStr);
          const isExpired = info.status === "expired";
          const daysLeft = info.daysLeft;
          return (
            <div key={doc.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 18px",
              borderBottom: "1px solid rgba(251,191,36,0.12)",
              transition: "background 0.1s",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(251,191,36,0.08)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* Status dot */}
              <div style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: isExpired ? "#ef4444" : "#f59e0b",
                boxShadow: isExpired ? "0 0 0 3px rgba(239,68,68,0.18)" : "0 0 0 3px rgba(245,158,11,0.18)",
              }} />

              {/* Doc info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }} className="t-heading">
                  {doc.doc_type}
                  {doc.doc_number && (
                    <span style={{ fontFamily: "monospace", fontWeight: 400, fontSize: 11, marginLeft: 6, opacity: 0.7 }} className="t-muted">
                      #{doc.doc_number}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11 }} className="t-muted">
                  {doc.company_name}
                </div>
              </div>

              {/* Expiry date + badge */}
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div style={{ fontSize: 11, fontFamily: "monospace" }} className="t-muted">
                  {dateStr || "—"}
                </div>
                <div style={{ marginTop: 2 }}>
                  {isExpired ? (
                    <span style={{
                      display: "inline-block", padding: "1px 7px", borderRadius: 10,
                      fontSize: 10, fontWeight: 700,
                      background: "rgba(239,68,68,0.14)", color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.3)",
                    }}>
                      Expired
                    </span>
                  ) : (
                    <span style={{
                      display: "inline-block", padding: "1px 7px", borderRadius: 10,
                      fontSize: 10, fontWeight: 700,
                      background: "rgba(245,158,11,0.14)", color: "#d97706",
                      border: "1px solid rgba(245,158,11,0.3)",
                    }}>
                      {daysLeft === 0 ? "Today" : `${daysLeft}d left`}
                    </span>
                  )}
                </div>
              </div>

              {/* Company link */}
              <Link
                to={`/portal/${subdomain}/org/companies/${doc.company_id}`}
                title={`Open ${doc.company_name}`}
                style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 600,
                  color: "var(--c-accent)", textDecoration: "none",
                  padding: "4px 10px", borderRadius: 6,
                  border: "1px solid var(--c-border)",
                  background: "var(--c-surface2)",
                  whiteSpace: "nowrap",
                }}
              >
                View →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PortalDashboard() {
  const { subdomain } = useParams();
  const { user, token } = usePortalAuth();
  const workspaceName = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
  const [stats, setStats] = useState({ users: "—", active: "—", roles: "—", sessions: "—" });

  useEffect(() => {
    if (!token || !subdomain) return;
    portalUserMgmtApi.listUsers(subdomain, token, { page: 1, page_size: 1 })
      .then(r => setStats(s => ({ ...s, users: r.data?.data?.total ?? "—" }))).catch(() => {});
    portalUserMgmtApi.listUsers(subdomain, token, { page: 1, page_size: 1, status: "Active" })
      .then(r => setStats(s => ({ ...s, active: r.data?.data?.total ?? "—" }))).catch(() => {});
    portalUserMgmtApi.listRoles(subdomain, token)
      .then(r => { const d = r.data?.data; setStats(s => ({ ...s, roles: Array.isArray(d) ? d.length : "—" })); }).catch(() => {});
    portalUserMgmtApi.listSessions(subdomain, token, { page: 1, page_size: 1, active_only: true })
      .then(r => setStats(s => ({ ...s, sessions: r.data?.data?.total ?? "—" }))).catch(() => {});
  }, [token, subdomain]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gap: 24 }}>
      {/* Welcome banner */}
      <div style={{
        borderRadius: 16, padding: "24px 28px",
        background: "linear-gradient(135deg, rgba(0,174,236,0.08) 0%, rgba(255,122,26,0.06) 100%)",
        border: "1px solid rgba(0,174,236,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, #00aeec, #ff7a1a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }} className="t-heading">
              Welcome back, {user?.name?.split(" ")[0] || "Admin"} 👋
            </h1>
            <p style={{ margin: "3px 0 0", fontSize: 13 }} className="t-muted">
              {workspaceName} Workspace · Office Repo
            </p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <StatCard icon="👥" label="Total Members"   value={stats.users}    color="#00aeec" />
        <StatCard icon="✅" label="Active Users"    value={stats.active}   color="#4ade80" />
        <StatCard icon="🛡️" label="Roles Defined"   value={stats.roles}    color="#a855f7" />
        <StatCard icon="🖥️" label="Active Sessions" value={stats.sessions} color="#f59e0b" />
      </div>

      {/* Document expiry warnings (only shown when org module is accessible and docs are expiring) */}
      <ExpiringDocumentsPanel subdomain={subdomain} token={token} />

      {/* Module cards */}
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }} className="t-muted">Modules</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {MODULE_CARDS.map(m => (
            <div key={m.key} className="card" style={{ padding: 0, borderRadius: 14, overflow: "hidden", transition: "box-shadow 0.15s, transform 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.14)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
              <Link to={`/portal/${subdomain}/${m.path}`} style={{ display: "block", padding: "20px 20px 14px", textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${m.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {m.icon}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700 }} className="t-heading">{m.label}</div>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }} className="t-muted">{m.description}</div>
              </Link>
              <div style={{ borderTop: "1px solid var(--c-border)", padding: "10px 20px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {m.links.map(lnk => (
                  <Link key={lnk.path} to={`/portal/${subdomain}/${lnk.path}`}
                    style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 999, background: "var(--c-surface2)", textDecoration: "none", border: "1px solid var(--c-border)", whiteSpace: "nowrap" }} className="t-body">
                    {lnk.label} →
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!import.meta.env.VITE_BASE_DOMAIN && (
        <div style={{ borderRadius: 10, padding: "10px 16px", fontSize: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)" }} className="t-muted">
          <span style={{ color: "#818cf8", fontWeight: 600 }}>Dev mode</span> — running at{" "}
          <code style={{ fontFamily: "monospace" }}>{window.location.origin}/portal/{subdomain}</code>.{" "}
          Set <code style={{ fontFamily: "monospace" }}>VITE_BASE_DOMAIN=officerepo.com</code> in production.
        </div>
      )}
    </div>
  );
}
