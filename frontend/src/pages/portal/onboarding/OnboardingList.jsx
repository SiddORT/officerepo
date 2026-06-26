import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalOnboardingApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

const STATUSES = [
  "Preboarding", "Onboarding In Progress", "Ready For Activation",
  "Completed", "On Hold", "Cancelled", "Deferred",
];

const STATUS_COLOR = {
  "Preboarding":           "#6366f1",
  "Onboarding In Progress":"var(--c-accent)",
  "Ready For Activation":  "#f59e0b",
  "Completed":             "#22c55e",
  "On Hold":               "#6b7280",
  "Cancelled":             "#ef4444",
  "Deferred":              "#9ca3af",
};

const PROGRESS_BAR = ({ pct, status }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 6, background: "var(--c-border)", borderRadius: 4, overflow: "hidden" }}>
      <div style={{
        width: `${pct}%`, height: "100%", borderRadius: 4,
        background: pct === 100 ? "#22c55e" : status === "Ready For Activation" ? "#f59e0b" : "var(--c-accent)",
        transition: "width 0.3s",
      }} />
    </div>
    <span style={{ fontSize: 11, color: "var(--c-muted)", minWidth: 30, textAlign: "right" }}>{pct}%</span>
  </div>
);

export default function OnboardingList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate   = useNavigate();
  const base       = `/portal/${subdomain}/hrms/onboarding`;

  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 20;

  const load = (pg = page, q = search, st = status) => {
    setLoading(true);
    portalOnboardingApi.list(subdomain, token, { page: pg, page_size: PAGE_SIZE, search: q, status: st })
      .then(r => { const d = r.data?.data || {}; setItems(d.items || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1, search, status); }, [subdomain, token]);

  const doSearch = e => { e.preventDefault(); setPage(1); load(1, search, status); };
  const onStatus = v => { setStatus(v); setPage(1); load(1, search, v); };
  const onPage   = p => { setPage(p); load(p, search, status); };

  return (
    <div>
      <PageHeader
        title="All Onboardings"
        breadcrumbs={[
          { label: "Employee Onboarding", path: base },
          { label: "All Records" },
        ]}
        actions={<button onClick={() => navigate(`${base}/start`)} className="btn-primary">+ Start Onboarding</button>}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <form onSubmit={doSearch} style={{ display: "flex", gap: 6 }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, code, number…"
            style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13, width: 240 }} />
          <button type="submit" className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>Search</button>
        </form>
        <select value={status} onChange={e => onStatus(e.target.value)}
          style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13 }}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="t-muted" style={{ fontSize: 12, marginLeft: "auto" }}>{total} record{total !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }} className="t-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div className="t-muted">No onboarding records found.</div>
            <button onClick={() => navigate(`${base}/start`)} className="btn-primary" style={{ marginTop: 16 }}>Start First Onboarding</button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--c-border)" }}>
                {["#", "Employee", "Designation", "Joining", "Status", "Progress", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((ob, i) => (
                <tr key={ob.id}
                  style={{ borderBottom: "1px solid var(--c-border)", cursor: "pointer", transition: "background 0.15s" }}
                  onClick={() => navigate(`${base}/${ob.id}`)}
                  onMouseEnter={e => { e.currentTarget.style.background = "var(--c-hover)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                  <td style={{ padding: "10px 14px", fontSize: 11, color: "var(--c-muted)" }}>{ob.onboarding_number}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{ob.employee_name || "—"}</div>
                    <div className="t-muted" style={{ fontSize: 11 }}>{ob.employee_code || ""}</div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13 }}>
                    <div>{ob.designation_name || "—"}</div>
                    <div className="t-muted" style={{ fontSize: 11 }}>{ob.department_name || ""}</div>
                  </td>
                  <td style={{ padding: "10px 14px", fontSize: 13, color: "var(--c-muted)" }}>{ob.joining_date || "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{
                      display: "inline-block", padding: "3px 10px", borderRadius: 12,
                      fontSize: 11, fontWeight: 600, background: (STATUS_COLOR[ob.status] || "#6b7280") + "22",
                      color: STATUS_COLOR[ob.status] || "#6b7280",
                    }}>{ob.status}</span>
                  </td>
                  <td style={{ padding: "10px 14px", minWidth: 120 }}>
                    <PROGRESS_BAR pct={ob.progress_percent || 0} status={ob.status} />
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <button onClick={e => { e.stopPropagation(); navigate(`${base}/${ob.id}`); }}
                      className="btn-secondary" style={{ padding: "4px 12px", fontSize: 12 }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
          <button onClick={() => onPage(page - 1)} disabled={page === 1} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 13 }}>← Prev</button>
          <span className="t-muted" style={{ lineHeight: "32px", fontSize: 13 }}>Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
          <button onClick={() => onPage(page + 1)} disabled={page >= Math.ceil(total / PAGE_SIZE)} className="btn-secondary" style={{ padding: "6px 14px", fontSize: 13 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
