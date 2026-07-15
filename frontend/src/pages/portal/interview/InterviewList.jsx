import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { portalInterviewApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Pagination from "../shared/Pagination";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

const PAGE_SIZE = 20;

const STATUS_COLOR = {
  Scheduled: "#3b82f6", Rescheduled: "#8b5cf6", Completed: "#10b981",
  Cancelled: "#6b7280", "No Show": "#f59e0b",
};
const RESULT_COLOR = {
  Pending: "#6b7280", Pass: "#22c55e", Fail: "#ef4444",
  Hold: "#f59e0b", Selected: "#10b981", Rejected: "#ef4444",
};

const IBtn = ({ onClick, title, children, color = "var(--c-muted)" }) => (
  <button onClick={onClick} title={title} style={{
    background: "none", border: "none", cursor: "pointer",
    fontSize: 17, padding: "2px 4px", color, lineHeight: 1, display: "inline-flex", alignItems: "center",
  }}>{children}</button>
);

export default function InterviewList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const base = `/portal/${subdomain}/hrms/interviews`;

  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState(searchParams.get("status") || "");
  const [result, setResult]   = useState("");
  const [meta, setMeta]       = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalInterviewApi.metaOptions(subdomain, token)
      .then(r => setMeta(r.data?.data || {})).catch(() => {});
  }, [subdomain, token]);

  const load = () => {
    setLoading(true);
    portalInterviewApi.list(subdomain, token, {
      page, page_size: PAGE_SIZE,
      search: search || undefined,
      status: status || undefined,
      result: result || undefined,
    })
      .then(r => { const d = r.data?.data || {}; setRows(d.items || []); setTotal(d.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, search, status, result]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [confirmDlg, setConfirmDlg] = useState({ open: false, fn: null, message: "" });
  const doAction = (fn, msg) => {
    if (msg) { setConfirmDlg({ open: true, fn, message: msg }); return; }
    fn().then(() => load()).catch(e => alert(e.response?.data?.message || "Action failed."));
  };
  const confirmAction = async () => {
    const fn = confirmDlg.fn;
    setConfirmDlg({ open: false, fn: null, message: "" });
    try { await fn(); load(); } catch (e) { alert(e.response?.data?.message || "Action failed."); }
  };

  const COL_COUNT = 9;

  return (
    <div>
      <PageHeader
        title="All Interviews"
        subtitle={`${total} total`}
        breadcrumbs={[
          { label: "Interview Management", path: base },
          { label: "All Interviews" },
        ]}
        actions={
          <button onClick={() => navigate(`${base}/schedule/new`)} className="btn-primary">+ Schedule Interview</button>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search candidate, round type…" className="input-field"
          style={{ flex: 1, minWidth: 220 }}
        />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input-field" style={{ width: "auto", minWidth: 140 }}>
          <option value="">All Statuses</option>
          {(meta.interview_statuses || []).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={result} onChange={e => { setResult(e.target.value); setPage(1); }}
          className="input-field" style={{ width: "auto", minWidth: 130 }}>
          <option value="">All Results</option>
          {(meta.interview_results || []).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <ConfirmDialog
        open={confirmDlg.open}
        title="Confirm Action"
        message={confirmDlg.message}
        confirmLabel="Confirm"
        confirmVariant="warning"
        onConfirm={confirmAction}
        onCancel={() => setConfirmDlg({ open: false, fn: null, message: "" })}
      />

      <div className="portal-table-wrap" style={{ overflowX: "auto" }}>
        <table className="portal-table">
          <thead><tr>
            <th style={{ width: 40 }}>#</th>
            <th>Interview #</th><th>Candidate</th><th>Round</th>
            <th>Date / Time</th><th>Mode</th><th>Status</th><th>Result</th>
            <th style={{ textAlign: "right" }}>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={COL_COUNT} style={{ textAlign: "center", padding: 40 }} className="t-muted">Loading…</td></tr>
              : rows.length === 0
              ? <tr><td colSpan={COL_COUNT} style={{ textAlign: "center", padding: 48 }} className="t-muted">No interviews found.</td></tr>
              : rows.map((r, idx) => (
                <tr key={r.id} onClick={() => navigate(`${base}/${r.id}`)} style={{ cursor: "pointer" }}>
                  <td className="t-muted" style={{ fontSize: 12 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td>
                    <span className="t-accent" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>
                      {r.interview_number}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.candidate_name || "—"}</div>
                    {r.opening_title && <div className="t-muted" style={{ fontSize: 11 }}>{r.opening_title}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>{r.round_type || r.round_name || `Round ${r.round_number}`}</div>
                    <div className="t-muted" style={{ fontSize: 11 }}>Round {r.round_number}{r.pipeline_name ? ` · ${r.pipeline_name}` : ""}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{r.interview_date || "—"}</div>
                    {r.start_time && <div className="t-muted" style={{ fontSize: 11 }}>{r.start_time}{r.end_time ? ` – ${r.end_time}` : ""}</div>}
                  </td>
                  <td><span className="t-muted" style={{ fontSize: 12 }}>{r.mode || "—"}</span></td>
                  <td>
                    <span style={{
                      background: `${STATUS_COLOR[r.status] || "#6b7280"}20`,
                      color: STATUS_COLOR[r.status] || "#6b7280",
                      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${STATUS_COLOR[r.status] || "#6b7280"}40`,
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.result && r.result !== "Pending"
                      ? <span style={{
                          background: `${RESULT_COLOR[r.result] || "#6b7280"}20`,
                          color: RESULT_COLOR[r.result] || "#6b7280",
                          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${RESULT_COLOR[r.result] || "#6b7280"}40`,
                        }}>{r.result}</span>
                      : <span className="t-muted" style={{ fontSize: 11 }}>Pending</span>}
                  </td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
                    {(r.status === "Scheduled" || r.status === "Rescheduled") && <>
                      <IBtn onClick={() => navigate(`${base}/${r.id}/complete`)} title="Mark Complete" color="#22c55e">✅</IBtn>
                      <IBtn onClick={() => navigate(`${base}/${r.id}/reschedule`)} title="Reschedule" color="#8b5cf6">📅</IBtn>
                      <IBtn onClick={() => doAction(() => portalInterviewApi.noShow(subdomain, token, r.id), "Mark this interview as No Show?")} title="No Show" color="#f59e0b">🚫</IBtn>
                      <IBtn onClick={() => doAction(() => portalInterviewApi.cancel(subdomain, token, r.id, {}), "Cancel this interview?")} title="Cancel" color="#ef4444">❌</IBtn>
                    </>}
                    {r.status === "Completed" && (
                      <IBtn onClick={() => navigate(`${base}/${r.id}?tab=feedback`)} title="View Feedback" color="var(--c-accent)">💬</IBtn>
                    )}
                    {["Cancelled", "No Show"].includes(r.status) && (
                      <IBtn onClick={() => navigate(`${base}/${r.id}`)} title="View Details" color="var(--c-accent)">👁</IBtn>
                    )}
                    <IBtn onClick={() => navigate(`${base}/${r.id}`)} title="View Details" color="var(--c-muted)">→</IBtn>
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
