import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

const hdr = { padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface-alt,var(--c-surface))", whiteSpace: "nowrap" };
const cell = { padding: "10px 12px", borderBottom: "1px solid var(--c-border)", fontSize: 13, verticalAlign: "middle" };

const STATUS_COLORS = {
  "Draft":    { bg: "rgba(156,163,175,0.15)", color: "#9ca3af" },
  "Sent":     { bg: "rgba(99,102,241,0.12)",  color: "#818cf8" },
  "Accepted": { bg: "rgba(34,197,94,0.12)",   color: "#22c55e" },
  "Rejected": { bg: "rgba(239,68,68,0.12)",   color: "#ef4444" },
  "Expired":  { bg: "rgba(156,163,175,0.1)",  color: "#6b7280" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS["Draft"];
  return <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: s.bg, color: s.color }}>{status}</span>;
}

const PAGE_SIZE = 20;

export default function OfferList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState("");

  const load = () => {
    setLoading(true);
    portalRecruitmentApi.listOffers(subdomain, token, { page, page_size: PAGE_SIZE, status: status || undefined })
      .then(r => { const d = r.data?.data || {}; setRows(d.items || []); setTotal(d.total || 0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const doAction = async (fn) => {
    try { await fn(); load(); } catch (e) { alert(e.response?.data?.message || "Action failed."); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Offers</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>{total} offers</p>
        </div>
        <button onClick={() => navigate(`/portal/${subdomain}/recruitment/offers/new`)} style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>+ Create Offer</button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={{ padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", minWidth: 140 }}>
          <option value="">All Statuses</option>
          {["Draft", "Sent", "Accepted", "Rejected", "Expired"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr>
            <th style={hdr}>Offer #</th><th style={hdr}>Candidate</th>
            <th style={hdr}>Designation</th><th style={hdr}>Salary</th>
            <th style={hdr}>Joining</th><th style={hdr}>Expiry</th>
            <th style={hdr}>Status</th><th style={{ ...hdr, textAlign: "right" }}>Actions</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ ...cell, textAlign: "center", color: "var(--c-muted)", padding: 32 }}>Loading…</td></tr>
            : rows.length === 0 ? <tr><td colSpan={8} style={{ ...cell, textAlign: "center", color: "var(--c-muted)", padding: 40 }}>No offers found.</td></tr>
            : rows.map(r => (
              <tr key={r.id}
                onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface-alt,rgba(255,255,255,0.03))"}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                <td style={{ ...cell, fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: "var(--c-accent)" }}>{r.offer_number}</td>
                <td style={{ ...cell, fontWeight: 600 }}>{r.candidate_name || "—"}</td>
                <td style={{ ...cell, fontSize: 12 }}>{r.offered_designation_name || "—"}</td>
                <td style={{ ...cell, fontSize: 12 }}>{r.offered_salary ? `₹${Number(r.offered_salary).toLocaleString()}` : "—"}</td>
                <td style={{ ...cell, fontSize: 12 }}>{r.joining_date || "—"}</td>
                <td style={{ ...cell, fontSize: 12 }}>{r.offer_expiry_date || "—"}</td>
                <td style={cell}><StatusBadge status={r.status} /></td>
                <td style={{ ...cell, textAlign: "right" }}>
                  {r.status === "Draft" && <>
                    <button onClick={() => navigate(`/portal/${subdomain}/recruitment/offers/${r.id}/edit`)} style={{ background: "none", border: "none", color: "var(--c-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                    <button onClick={() => doAction(() => portalRecruitmentApi.sendOffer(subdomain, token, r.id))} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontSize: 12, marginLeft: 10 }}>Send</button>
                  </>}
                  {r.status === "Sent" && <>
                    <button onClick={() => doAction(() => portalRecruitmentApi.acceptOffer(subdomain, token, r.id))} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Accept</button>
                    <button onClick={() => { const reason = window.prompt("Rejection reason:"); if (reason !== null) doAction(() => portalRecruitmentApi.rejectOffer(subdomain, token, r.id, { rejection_reason: reason })); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 12, marginLeft: 10 }}>Reject</button>
                  </>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > PAGE_SIZE && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", borderTop: "1px solid var(--c-border)" }}>
            <span style={{ fontSize: 12, color: "var(--c-muted)" }}>Page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.4 : 1 }}>←</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.4 : 1 }}>→</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
