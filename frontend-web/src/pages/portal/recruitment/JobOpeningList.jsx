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

  return (
    <div>
      <PageHeader
        title="Job Openings"
        subtitle={`${total} total`}
        breadcrumbs={[{ label: "Recruitment", path: `/portal/${subdomain}/recruitment` }, { label: "Job Openings" }]}
        actions={<button onClick={() => navigate(`/portal/${subdomain}/recruitment/openings/new`)} className="btn-primary">+ New Opening</button>}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search title, department, location…" className="input-field" style={{ flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 140 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead><tr>
            <th>Opening #</th><th>Job Title</th><th>Department</th>
            <th>Location</th><th>Vacancies</th><th>Deadline</th>
            <th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8} style={{ textAlign: "center", padding: 40 }} className="t-muted">Loading…</td></tr>
              : rows.length === 0
              ? <tr><td colSpan={8} style={{ textAlign: "center", padding: 48 }} className="t-muted">No openings found. Create one to start receiving candidates.</td></tr>
              : rows.map(r => (
                <tr key={r.id}>
                  <td><span className="t-accent" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{r.opening_number}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{r.job_title}</span></td>
                  <td>{r.department_name || "—"}</td>
                  <td><span className="t-muted" style={{ fontSize: 12 }}>{r.location || "—"}</span></td>
                  <td style={{ textAlign: "center" }}>{r.number_of_vacancies}</td>
                  <td><span className="t-muted" style={{ fontSize: 12 }}>{r.application_deadline || "—"}</span></td>
                  <td><Badge status={r.status} /></td>
                  <td style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/portal/${subdomain}/recruitment/openings/${r.id}/edit`)} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                    {r.status === "Open" && <button onClick={e => updateStatus(r.id, "On Hold", e)} style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", fontSize: 12, marginLeft: 10 }}>Hold</button>}
                    {r.status === "On Hold" && <button onClick={e => updateStatus(r.id, "Open", e)} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontSize: 12, marginLeft: 10 }}>Reopen</button>}
                    {r.status !== "Closed" && r.status !== "Filled" && <button onClick={e => updateStatus(r.id, "Closed", e)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, marginLeft: 10 }}>Close</button>}
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
