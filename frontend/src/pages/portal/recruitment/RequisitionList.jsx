import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const PAGE_SIZE = 20;

export default function RequisitionList() {
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
    portalRecruitmentApi.metaOptions(subdomain, token).then(r => setStatuses(r.data?.data?.requisition_statuses || [])).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    portalRecruitmentApi.listRequisitions(subdomain, token, { page, page_size: PAGE_SIZE, search: search || undefined, status: status || undefined })
      .then(r => { const d = r.data?.data || {}; setRows(d.items || []); setTotal(d.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search, status]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Job Requisitions"
        subtitle={`${total} total`}
        breadcrumbs={[{ label: "Recruitment", path: `/portal/${subdomain}/recruitment` }, { label: "Job Requisitions" }]}
        actions={<button onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions/new`)} className="btn-primary">+ New Requisition</button>}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by number, department, designation…" className="input-field" style={{ flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 140 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead><tr>
            <th style={{ width: 48, textAlign: "center" }}>Sr No</th>
            <th>Req #</th><th>Department</th><th>Designation</th>
            <th>Positions</th><th>Type</th><th>Target Date</th>
            <th>Status</th><th style={{ textAlign: "center" }}>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={9} style={{ textAlign: "center", padding: 40 }} className="t-muted">Loading…</td></tr>
              : rows.length === 0
              ? <tr><td colSpan={9} style={{ textAlign: "center", padding: 48 }} className="t-muted">No requisitions found.</td></tr>
              : rows.map((r, idx) => (
                <tr key={r.id} onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions/${r.id}`)}>
                  <td style={{ textAlign: "center" }} className="t-muted">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td><span className="t-accent" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{r.requisition_number}</span></td>
                  <td>{r.department_name || "—"}</td>
                  <td>{r.designation_name || "—"}</td>
                  <td style={{ textAlign: "center" }}>{r.number_of_positions}</td>
                  <td><span className="t-muted" style={{ fontSize: 12 }}>{r.employment_type || "—"}</span></td>
                  <td><span className="t-muted" style={{ fontSize: 12 }}>{r.target_joining_date || "—"}</span></td>
                  <td><Badge status={r.status} /></td>
                  <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions/${r.id}`)} title="View" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-accent)", fontSize: 15, padding: "2px 5px" }}>👁</button>
                    <button onClick={() => navigate(`/portal/${subdomain}/recruitment/requisitions/${r.id}/edit`)} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-accent)", fontSize: 15, padding: "2px 5px" }}>✏️</button>
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
