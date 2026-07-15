import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const PAGE_SIZE = 20;

export default function CandidateList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalRecruitmentApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    portalRecruitmentApi.listCandidates(subdomain, token, { page, page_size: PAGE_SIZE, search: search || undefined, status: status || undefined, source: source || undefined })
      .then(r => { const d = r.data?.data || {}; setRows(d.items || []); setTotal(d.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search, status, source]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const iconBtn = (label, onClick, color = "var(--c-accent)") => (
    <button onClick={onClick} title={label} style={{ background: "none", border: "none", cursor: "pointer", color, fontSize: 15, padding: "2px 5px", lineHeight: 1 }}>{label}</button>
  );

  return (
    <div>
      <PageHeader
        title="Candidates"
        subtitle={`${total} candidates`}
        breadcrumbs={[{ label: "Recruitment", path: `/portal/${subdomain}/recruitment` }, { label: "Candidates" }]}
        actions={<button onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates/new`)} className="btn-primary">+ Add Candidate</button>}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, email, mobile, company…" className="input-field" style={{ flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 160 }}>
          <option value="">All Statuses</option>
          {(meta.candidate_statuses || []).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={source} onChange={e => { setSource(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 140 }}>
          <option value="">All Sources</option>
          {(meta.candidate_sources || []).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="portal-table-wrap" style={{ overflowX: "auto" }}>
        <table className="portal-table">
          <thead><tr>
            <th style={{ width: 48, textAlign: "center" }}>Sr No</th>
            <th>Candidate</th><th>Applied For</th><th>Experience</th>
            <th>Current</th><th>Source</th><th>Resume</th>
            <th>Status</th><th style={{ textAlign: "center" }}>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={9} style={{ textAlign: "center", padding: 40 }} className="t-muted">Loading…</td></tr>
              : rows.length === 0
              ? <tr><td colSpan={9} style={{ textAlign: "center", padding: 48 }} className="t-muted">No candidates found.</td></tr>
              : rows.map((r, idx) => (
                <tr key={r.id} onClick={() => navigate(`/portal/${subdomain}/recruitment/candidates/${r.id}`)}>
                  <td style={{ textAlign: "center" }} className="t-muted">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.full_name}</div>
                    <div className="t-muted" style={{ fontSize: 11 }}>{r.email}</div>
                    <div className="t-muted" style={{ fontSize: 11, fontFamily: "monospace" }}>{r.candidate_number}</div>
                  </td>
                  <td><span style={{ fontSize: 12 }}>{r.applied_position || "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.total_experience || "—"}</span></td>
                  <td>
                    <div style={{ fontSize: 12 }}>{r.current_company || "—"}</div>
                    {r.current_designation && <div className="t-muted" style={{ fontSize: 11 }}>{r.current_designation}</div>}
                  </td>
                  <td><span style={{ fontSize: 12 }}>{r.source || "—"}</span></td>
                  <td style={{ textAlign: "center" }}>{r.has_resume ? "📄" : "—"}</td>
                  <td><Badge status={r.status} /></td>
                  <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                    {iconBtn("👁", () => navigate(`/portal/${subdomain}/recruitment/candidates/${r.id}`))}
                    {iconBtn("✏️", () => navigate(`/portal/${subdomain}/recruitment/candidates/${r.id}/edit`))}
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
