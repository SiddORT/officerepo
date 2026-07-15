import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const PAGE_SIZE = 20;

export default function JobOpeningList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalRecruitmentApi.metaOptions(subdomain, token).then(r => setStatuses(r.data?.data?.opening_statuses || [])).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    portalRecruitmentApi.listOpenings(subdomain, token, { page, page_size: PAGE_SIZE, search: search || undefined, status: status || undefined })
      .then(r => { const d = r.data?.data || {}; setRows(d.items || []); setTotal(d.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search, status]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const updateStatus = async (id, newStatus, e) => {
    e.stopPropagation();
    await portalRecruitmentApi.updateOpening(subdomain, token, id, { status: newStatus });
    load();
  };

  const iconBtn = (emoji, title, onClick, color = "var(--c-accent)") => (
    <button onClick={onClick} title={title} style={{ background: "none", border: "none", cursor: "pointer", color, fontSize: 15, padding: "2px 5px", lineHeight: 1 }}>{emoji}</button>
  );

  return (
    <div>
      <PageHeader
        title="Job Openings"
        subtitle={`${total} total`}
        breadcrumbs={[{ label: "Recruitment", path: `/portal/${subdomain}/recruitment` }, { label: "Job Openings" }]}
        actions={<button onClick={() => navigate(`/portal/${subdomain}/recruitment/openings/new`)} className="btn-primary">+ New Opening</button>}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search title, department…" className="input-field" style={{ flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 140 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead><tr>
            <th style={{ width: 48, textAlign: "center" }}>Sr No</th>
            <th>Opening #</th><th>Job Title</th><th>Department</th>
            <th>Vacancies</th><th>Deadline</th>
            <th>Status</th><th style={{ textAlign: "center" }}>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8} style={{ textAlign: "center", padding: 40 }} className="t-muted">Loading…</td></tr>
              : rows.length === 0
              ? <tr><td colSpan={8} style={{ textAlign: "center", padding: 48 }} className="t-muted">No openings found. Create one to start receiving candidates.</td></tr>
              : rows.map((r, idx) => (
                <tr key={r.id}>
                  <td style={{ textAlign: "center" }} className="t-muted">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td><span className="t-accent" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{r.opening_number}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{r.job_title}</span></td>
                  <td>{r.department_name || "—"}</td>
                  <td style={{ textAlign: "center" }}>{r.number_of_vacancies}</td>
                  <td><span className="t-muted" style={{ fontSize: 12 }}>{r.application_deadline || "—"}</span></td>
                  <td><Badge status={r.status} /></td>
                  <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                    {iconBtn("✏️", "Edit", () => navigate(`/portal/${subdomain}/recruitment/openings/${r.id}/edit`))}
                    {r.status === "Open" && iconBtn("⏸", "Put on Hold", e => updateStatus(r.id, "On Hold", e), "#f59e0b")}
                    {r.status === "On Hold" && iconBtn("▶️", "Reopen", e => updateStatus(r.id, "Open", e), "#22c55e")}
                    {r.status !== "Closed" && r.status !== "Filled" && iconBtn("🚫", "Close", e => updateStatus(r.id, "Closed", e), "#ef4444")}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
}
