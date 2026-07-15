import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalLeaveApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  "Draft":            "bg-gray-100 text-gray-600",
  "Pending Approval": "bg-yellow-100 text-yellow-700",
  "Approved":         "bg-green-100 text-green-700",
  "Rejected":         "bg-red-100 text-red-700",
  "Cancelled":        "bg-gray-100 text-gray-500",
};

function ReviewModal({ req, onClose, onDone }) {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [action, setAction] = useState("approve");
  const [comments, setComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setSaving(true); setErr("");
    try {
      await portalLeaveApi.reviewLeave(subdomain, token, req.id, { status: action, comments });
      onDone();
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h3 className="font-bold" style={{ color: "var(--c-heading)" }}>
          Review Leave — {req.employee_name}
        </h3>
        <div className="text-sm rounded-xl p-3 space-y-1" style={{ background: "var(--c-bg)" }}>
          <div><span style={{ color: "var(--c-muted)" }}>Type:</span> <span style={{ color: "var(--c-text)" }}>{req.leave_type_name}</span></div>
          <div><span style={{ color: "var(--c-muted)" }}>Dates:</span> <span style={{ color: "var(--c-text)" }}>{req.start_date} → {req.end_date} ({req.leave_days}d)</span></div>
          {req.reason && <div><span style={{ color: "var(--c-muted)" }}>Reason:</span> <span style={{ color: "var(--c-text)" }}>{req.reason}</span></div>}
        </div>
        {err && <div style={{ fontSize: 13, color: "#ef4444", background: "rgba(239,68,68,0.1)", borderRadius: 6, padding: "8px 12px" }}>{err}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setAction("approve")} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: `2px solid ${action === "approve" ? "#22c55e" : "var(--c-border)"}`,
            background: action === "approve" ? "rgba(34,197,94,0.12)" : "transparent",
            color: action === "approve" ? "#22c55e" : "var(--c-muted)",
            cursor: "pointer", transition: "all 0.15s",
          }}>✓ Approve</button>
          <button onClick={() => setAction("reject")} style={{
            flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 600,
            border: `2px solid ${action === "reject" ? "#ef4444" : "var(--c-border)"}`,
            background: action === "reject" ? "rgba(239,68,68,0.12)" : "transparent",
            color: action === "reject" ? "#ef4444" : "var(--c-muted)",
            cursor: "pointer", transition: "all 0.15s",
          }}>✕ Reject</button>
        </div>
        <textarea rows={3} style={{ width: "100%", borderRadius: 8, padding: "8px 12px", fontSize: 13, background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", resize: "vertical", boxSizing: "border-box" }}
          placeholder="Comments (optional)…" value={comments} onChange={e => setComments(e.target.value)} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={submit} disabled={saving}
            className={action === "reject" ? "btn-danger" : "btn-approve"} style={{ flex: 1 }}>
            {saving ? "…" : (action === "approve" ? "✓ Approve" : "✕ Reject")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LeaveRequestList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", page: 1, page_size: 20 });
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [reviewReq, setReviewReq] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const load = () => {
    setLoading(true);
    const params = { page: filters.page, page_size: filters.page_size };
    if (filters.status) params.status = filters.status;
    portalLeaveApi.listRequests(subdomain, token, params)
      .then(r => setData(r.data?.data || r.data || { items: [], total: 0 }))
      .catch(() => setData({ items: [], total: 0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    portalLeaveApi.metaOptions(subdomain, token)
      .then(r => setLeaveTypes((r.data?.data || r.data)?.leave_types || []))
      .catch(() => {});
  }, [subdomain, token]);

  useEffect(load, [subdomain, token, filters.status, filters.page]);

  async function cancelReq(id) {
    setCancelling(id);
    try {
      await portalLeaveApi.cancelLeave(subdomain, token, id, { reason: "" });
      load();
    } finally { setCancelling(null); }
  }

  const STATUSES = ["", "Draft", "Pending Approval", "Approved", "Rejected", "Cancelled"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>Leave Requests</h1>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>
            {data.total} request{data.total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link to={`/portal/${subdomain}/hrms/leave/requests/new`}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "var(--c-accent)" }}>
          + Apply Leave
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button key={s || "all"}
            onClick={() => setFilters(f => ({ ...f, status: s, page: 1 }))}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${filters.status === s ? "text-white" : "border"}`}
            style={{
              background: filters.status === s ? "var(--c-accent)" : "transparent",
              borderColor: "var(--c-border)",
              color: filters.status === s ? "white" : "var(--c-muted)",
            }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: "var(--c-muted)" }}>Loading…</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
                {["#","Employee","Leave Type","Dates","Days","Status","Applied",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--c-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data.items?.length && (
                <tr><td colSpan={8} className="px-4 py-10 text-center" style={{ color: "var(--c-muted)" }}>
                  No leave requests found
                </td></tr>
              )}
              {data.items?.map(r => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--c-muted)" }}>
                    {r.request_number || r.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: "var(--c-text)" }}>{r.employee_name}</div>
                    <div className="text-xs" style={{ color: "var(--c-muted)" }}>{r.employee_code}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                      style={{ background: leaveTypes.find(t => t.id === r.leave_type_id)?.color_code || "#6B7280" }}>
                      {r.leave_type_code}
                    </span>
                    <div className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>{r.leave_type_name}</div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--c-text)" }}>
                    {r.start_date} {r.start_date !== r.end_date ? `→ ${r.end_date}` : ""}
                    {r.is_half_day && <div style={{ color: "var(--c-muted)" }}>{r.half_day_option}</div>}
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--c-text)" }}>{r.leave_days}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--c-muted)" }}>
                    {r.applied_at ? new Date(r.applied_at).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.status === "Pending Approval" && (
                        <button onClick={() => setReviewReq(r)}
                          className="text-xs px-2 py-1 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700">
                          Review
                        </button>
                      )}
                      {(r.status === "Pending Approval" || r.status === "Approved" || r.status === "Draft") && (
                        <button onClick={() => cancelReq(r.id)} disabled={cancelling === r.id}
                          className="text-xs px-2 py-1 rounded-lg border hover:opacity-70 text-red-500"
                          style={{ borderColor: "#FCA5A5" }}>
                          {cancelling === r.id ? "…" : "Cancel"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {data.total > filters.page_size && (
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--c-muted)" }}>
            Page {filters.page} of {Math.ceil(data.total / filters.page_size)}
          </span>
          <div className="flex gap-2">
            <button disabled={filters.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="px-3 py-1 rounded-lg border disabled:opacity-40"
              style={{ borderColor: "var(--c-border)", color: "var(--c-text)" }}>Prev</button>
            <button disabled={filters.page >= Math.ceil(data.total / filters.page_size)}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="px-3 py-1 rounded-lg border disabled:opacity-40"
              style={{ borderColor: "var(--c-border)", color: "var(--c-text)" }}>Next</button>
          </div>
        </div>
      )}

      {reviewReq && (
        <ReviewModal req={reviewReq} onClose={() => setReviewReq(null)} onDone={() => { setReviewReq(null); load(); }} />
      )}
    </div>
  );
}
