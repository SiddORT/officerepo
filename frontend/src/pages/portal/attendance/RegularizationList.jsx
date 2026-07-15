import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  Pending:  "bg-yellow-500/15 text-yellow-400",
  Approved: "bg-green-500/15 text-green-400",
  Rejected: "bg-red-500/15 text-red-400",
};

function StatusBadge({ status }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-gray-500/15 text-gray-400"}`}>{status}</span>;
}

const STATUSES = ["", "Pending", "Approved", "Rejected"];

export default function RegularizationList() {
  const { subdomain, token } = usePortalAuth();
  const navigate = useNavigate();
  const [items, setItems]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewErr, setReviewErr]   = useState("");

  const PAGE_SIZE = 20;
  const base = `/portal/${subdomain}/hrms/attendance`;

  const load = useCallback(() => {
    setLoading(true);
    portalAttendanceApi.listRegularizations(subdomain, token, { page, page_size: PAGE_SIZE, status })
      .then(r => { setItems(r.data?.data?.items || []); setTotal(r.data?.data?.total || 0); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token, page, status]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (id, newStatus) => {
    try {
      await portalAttendanceApi.reviewRegularization(subdomain, token, id, {
        status: newStatus, review_notes: reviewNote,
      });
      setReviewing(null); setReviewNote(""); load();
    } catch (e) {
      setReviewErr(e.response?.data?.detail || "Review failed.");
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold t-heading">Regularization Requests</h1>
        <button onClick={() => navigate(`${base}/regularizations/new`)} className="btn-primary text-sm px-4 py-2">
          + New Request
        </button>
      </div>

      <div className="card p-3 flex gap-3">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input">
          {STATUSES.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center t-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center t-muted">No regularization requests found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["Employee","Date","Requested In","Requested Out","Reason","Status",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left t-muted font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <React.Fragment key={r.id}>
                    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="t-heading font-medium">{r.employee_name || "—"}</p>
                        <p className="t-muted text-xs">{r.employee_code}</p>
                      </td>
                      <td className="px-4 py-3 t-muted">{r.attendance_date}</td>
                      <td className="px-4 py-3 t-muted">
                        {r.requested_checkin ? new Date(r.requested_checkin).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-4 py-3 t-muted">
                        {r.requested_checkout ? new Date(r.requested_checkout).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="px-4 py-3 t-muted max-w-xs truncate">{r.reason}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3">
                        {r.status === "Pending" && (
                          <button onClick={() => { setReviewing(r.id); setReviewErr(""); }}
                            className="text-xs t-accent hover:underline">Review</button>
                        )}
                      </td>
                    </tr>
                    {reviewing === r.id && (
                      <tr className="border-b border-white/10 bg-white/5">
                        <td colSpan={7} className="px-4 py-4">
                          {reviewErr && <p className="text-red-400 text-xs mb-2">{reviewErr}</p>}
                          <div className="flex gap-3 flex-wrap items-end">
                            <div className="flex-1 min-w-[200px]">
                              <label className="block text-xs t-muted mb-1">Review Note (optional)</label>
                              <input className="input w-full text-sm" value={reviewNote}
                                onChange={e => setReviewNote(e.target.value)} placeholder="Reason for approval/rejection" />
                            </div>
                            <button onClick={() => handleReview(r.id, "Approved")} className="btn-approve">✓ Approve</button>
                            <button onClick={() => handleReview(r.id, "Rejected")} className="btn-danger">✕ Reject</button>
                            <button onClick={() => setReviewing(null)} className="text-xs t-muted hover:t-heading">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm t-muted">
          <span>{total} requests</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">←</button>
            <span className="px-2 py-1">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary px-3 py-1 disabled:opacity-40">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
