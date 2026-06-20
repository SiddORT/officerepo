import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const PAGE_SIZE = 20;

export default function InterviewList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [rows, setRows]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const [status, setStatus]     = useState(searchParams.get("status") || "");
  const [result, setResult]     = useState("");
  const [meta, setMeta]         = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    portalInterviewApi.metaOptions(subdomain, token).then(r => setMeta(r.data?.data || {})).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    portalInterviewApi.list(subdomain, token, {
      page, page_size: PAGE_SIZE,
      search: search || undefined, status: status || undefined, result: result || undefined,
    })
      .then(r => { const d = r.data?.data || {}; setRows(d.items || []); setTotal(d.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search, status, result]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const doAction = async (fn) => {
    try { await fn(); load(); } catch (e) { alert(e.response?.data?.message || "Action failed."); }
  };

  return (
    <div>
      <PageHeader
        title="Interviews"
        subtitle={`${total} total`}
        breadcrumbs={[{ label: "Interview Management", path: `/portal/${subdomain}/hrms/interviews` }, { label: "All Interviews" }]}
        actions={<button onClick={() => navigate(`/portal/${subdomain}/hrms/interviews/new`)} className="btn-primary">+ Schedule Interview</button>}
      />

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search candidate, round type, interviewers…" className="input-field" style={{ flex: 1, minWidth: 220 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 140 }}>
          <option value="">All Statuses</option>
          {(meta.interview_statuses || []).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={result} onChange={e => { setResult(e.target.value); setPage(1); }} className="input-field" style={{ width: "auto", minWidth: 130 }}>
          <option value="">All Results</option>
          {(meta.interview_results || []).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="portal-table-wrap" style={{ overflowX: "auto" }}>
        <table className="portal-table">
          <thead><tr>
            <th>Interview #</th><th>Candidate</th><th>Round</th>
            <th>Date</th><th>Mode</th><th>Interviewers</th>
            <th>Status</th><th>Result</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={9} style={{ textAlign: "center", padding: 40 }} className="t-muted">Loading…</td></tr>
              : rows.length === 0
              ? <tr><td colSpan={9} style={{ textAlign: "center", padding: 48 }} className="t-muted">No interviews found.</td></tr>
              : rows.map(r => (
                <tr key={r.id} onClick={() => navigate(`/portal/${subdomain}/hrms/interviews/${r.id}`)} style={{ cursor: "pointer" }}>
                  <td><span className="t-accent" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{r.interview_number}</span></td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.candidate_name || "—"}</div>
                    {r.opening_title && <div className="t-muted" style={{ fontSize: 11 }}>{r.opening_title}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>{r.round_type || r.round_name || `Round ${r.round_number}`}</div>
                    <div className="t-muted" style={{ fontSize: 11 }}>Round {r.round_number}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>{r.interview_date || "—"}</div>
                    {r.interview_time && <div className="t-muted" style={{ fontSize: 11 }}>{r.interview_time}</div>}
                  </td>
                  <td><span className="t-muted" style={{ fontSize: 12 }}>{r.mode || "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.interviewers ? r.interviewers.split(",").slice(0,2).join(", ") + (r.interviewers.split(",").length > 2 ? "…" : "") : "—"}</span></td>
                  <td><Badge status={r.status} /></td>
                  <td>
                    {r.result && r.result !== "Pending" ? <Badge status={r.result} /> : <span className="t-muted" style={{ fontSize: 11 }}>Pending</span>}
                  </td>
                  <td style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                    {r.status === "Scheduled" && <>
                      <button onClick={() => navigate(`/portal/${subdomain}/hrms/interviews/${r.id}/edit`)} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                      <button onClick={() => navigate(`/portal/${subdomain}/hrms/interviews/${r.id}/complete`)} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontSize: 12, marginLeft: 10 }}>Complete</button>
                      <button onClick={() => { if (window.confirm("Mark as No Show?")) doAction(() => portalInterviewApi.noShow(subdomain, token, r.id)); }} style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", fontSize: 12, marginLeft: 10 }}>No Show</button>
                      <button onClick={() => { if (window.confirm("Cancel this interview?")) doAction(() => portalInterviewApi.cancel(subdomain, token, r.id, {})); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, marginLeft: 10 }}>Cancel</button>
                    </>}
                    {r.status !== "Scheduled" && (
                      <button onClick={() => navigate(`/portal/${subdomain}/hrms/interviews/${r.id}`)} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>View →</button>
                    )}
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
