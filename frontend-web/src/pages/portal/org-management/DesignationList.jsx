import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

function StatusBadge({ active }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: active ? "rgba(22,163,74,0.12)" : "rgba(107,114,128,0.12)",
      color: active ? "#16a34a" : "#6b7280",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function DesignationList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(null);

  useEffect(() => {
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200 })
      .then(r => {
        const list = r.data.data?.data || [];
        setCompanies(list);
        if (list.length > 0) setSelectedCompany(list[0].id);
      }).catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (!selectedCompany) return;
    setSelectedDept("");
    portalOrgApi.listDepts(subdomain, token, { company_id: selectedCompany, page_size: 200 })
      .then(r => setDepartments(r.data.data?.data || []))
      .catch(() => {});
  }, [subdomain, token, selectedCompany]);

  const load = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const r = await portalOrgApi.listDesigs(subdomain, token, {
        company_id: selectedCompany,
        department_id: selectedDept || undefined,
        page_size: 200,
        search: search || undefined,
        status: status || undefined,
      });
      setRows(r.data.data?.data || []);
      setTotal(r.data.data?.total || 0);
    } catch {} finally { setLoading(false); }
  }, [subdomain, token, selectedCompany, selectedDept, search, status]);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (d) => {
    setActing(d.id);
    try {
      if (d.is_active) await portalOrgApi.deactivateDesig(subdomain, token, d.id);
      else await portalOrgApi.activateDesig(subdomain, token, d.id);
      load();
    } catch (e) { alert(e?.response?.data?.detail || "Action failed."); }
    finally { setActing(null); }
  };

  return (
    <OrgLayout title="Designations">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>Designations</h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>Job titles and seniority levels</p>
          </div>
          {selectedCompany && (
            <Link to={`/portal/${subdomain}/org/designations/new?company_id=${selectedCompany}${selectedDept ? `&department_id=${selectedDept}` : ""}`}
              className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg"
              style={{ background: "var(--c-primary)", color: "#fff" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Designation
            </Link>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
            {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
          <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)}
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
            <option value="">All departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search designations…"
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", minWidth: 180 }} />
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="text-sm rounded-lg px-3 py-2"
            style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          {companies.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: "var(--c-muted)" }}>
              <Link to={`/portal/${subdomain}/org/companies/new`} style={{ color: "var(--c-primary)" }}>Add a company first.</Link>
            </div>
          ) : loading ? (
            <div className="py-16 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: "var(--c-muted)" }}>No designations found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--c-surface-alt)", borderBottom: "1px solid var(--c-border)" }}>
                  {["Code", "Designation", "Department", "Level", "Status", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide" style={{ color: "var(--c-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((d, i) => {
                  const dept = departments.find(x => x.id === d.department_id);
                  return (
                    <tr key={d.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none", background: "var(--c-surface)" }}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: "var(--c-surface-alt)", color: "var(--c-muted)" }}>
                          {d.designation_code}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--c-text)" }}>{d.designation_name}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--c-muted)" }}>{dept?.department_name || "—"}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--c-muted)" }}>
                        {d.level != null ? <span className="font-mono px-2 py-0.5 rounded" style={{ background: "var(--c-surface-alt)" }}>L{d.level}</span> : "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge active={d.is_active} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Link to={`/portal/${subdomain}/org/designations/${d.id}/edit`}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium"
                            style={{ background: "var(--c-surface-alt)", color: "var(--c-text)", border: "1px solid var(--c-border)" }}>Edit</Link>
                          <button onClick={() => toggleStatus(d)} disabled={acting === d.id}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium"
                            style={{ background: d.is_active ? "rgba(239,68,68,0.08)" : "rgba(22,163,74,0.08)",
                              color: d.is_active ? "#ef4444" : "#16a34a",
                              border: `1px solid ${d.is_active ? "rgba(239,68,68,0.2)" : "rgba(22,163,74,0.2)"}` }}>
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
        {total > 0 && <p className="text-xs" style={{ color: "var(--c-muted)" }}>{total} designation{total !== 1 ? "s" : ""}</p>}
      </div>
    </OrgLayout>
  );
}
