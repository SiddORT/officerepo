import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

function StatusBadge({ active }) {
  const s = active
    ? { bg: "rgba(34,197,94,0.1)", color: "#4ade80" }
    : { bg: "rgba(100,116,139,0.15)", color: "var(--c-muted)" };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: s.bg, color: s.color }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function DepartmentList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200 })
      .then(r => {
        const list = r.data.data?.data || [];
        setCompanies(list);
        if (list.length > 0) setSelectedCompany(list[0].id);
      }).catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const r = await portalOrgApi.listDepts(subdomain, token, {
        company_id: selectedCompany, page_size: 200,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setRows(r.data.data?.data || []);
      setTotal(r.data.data?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [subdomain, token, selectedCompany, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (d) => {
    setActing(d.id);
    try {
      if (d.is_active) await portalOrgApi.deactivateDept(subdomain, token, d.id);
      else await portalOrgApi.activateDept(subdomain, token, d.id);
      showToast(d.is_active ? "Department deactivated." : "Department activated.");
      load();
    } catch (e) { showToast(e?.response?.data?.detail || "Action failed.", false); }
    finally { setActing(null); }
  };

  const companyName = companies.find(c => c.id === selectedCompany)?.company_name || "";

  return (
    <OrgLayout title="Departments">
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Departments</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>Functional units within a company — {total} total</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {selectedCompany && (
            <Link to={`/portal/${subdomain}/org/departments/hierarchy/${selectedCompany}`}
              style={{ padding: "8px 14px", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "var(--c-surface)", color: "var(--c-text)", textDecoration: "none", border: "1px solid var(--c-border)", whiteSpace: "nowrap" }}>
              View Tree
            </Link>
          )}
          {selectedCompany && (
            <Link to={`/portal/${subdomain}/org/departments/new?company_id=${selectedCompany}`}
              style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", textDecoration: "none", whiteSpace: "nowrap" }}>
              + Add Department
            </Link>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Company selector */}
        <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
          style={{ padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)", cursor: "pointer" }}>
          {companies.length === 0 && <option value="">No companies</option>}
          {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
        </select>

        {/* Status filter pills */}
        {["", "Active", "Inactive"].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: statusFilter === s ? "var(--c-accent)" : "var(--c-surface)",
              color: statusFilter === s ? "#fff" : "var(--c-muted)",
              border: `1px solid ${statusFilter === s ? "var(--c-accent)" : "var(--c-border)"}`,
            }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {companies.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            No companies found.{" "}
            <Link to={`/portal/${subdomain}/org/companies/new`} style={{ color: "var(--c-accent)", fontWeight: 500 }}>Add a company first.</Link>
          </div>
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No departments in {companyName}.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                {["Code", "Department", "Parent", "Status", ""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => {
                const parent = rows.find(r => r.id === d.parent_id);
                return (
                  <tr key={d.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                        {d.department_code}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{d.department_name}</div>
                      {d.description && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>{d.description}</div>}
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: "var(--c-muted)" }}>
                      {parent ? parent.department_name : <span style={{ color: "var(--c-muted)", opacity: 0.5 }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px" }}><StatusBadge active={d.is_active} /></td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 10 }}>
                        <Link to={`/portal/${subdomain}/org/departments/${d.id}/edit`}
                          style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 500, textDecoration: "none" }}>Edit</Link>
                        <button onClick={() => toggleStatus(d)} disabled={acting === d.id}
                          style={{ fontSize: 12, color: d.is_active ? "#f87171" : "#4ade80", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                          {acting === d.id ? "…" : d.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </OrgLayout>
  );
}
