import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

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
      <PageHeader
        title="Offers"
        subtitle={`${total} offers`}
        actions={<button onClick={() => navigate(`/portal/${subdomain}/recruitment/offers/new`)} className="btn-primary">+ Create Offer</button>}
      />

      <div style={{ marginBottom: 14 }}>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field" style={{ maxWidth: 180 }}>
          <option value="">All Statuses</option>
          {["Draft","Sent","Accepted","Rejected","Expired"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead><tr>
            <th>Offer #</th><th>Candidate</th><th>Designation</th>
            <th>Salary</th><th>Joining</th><th>Expiry</th>
            <th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={8} style={{ textAlign: "center", padding: 40 }} className="t-muted">Loading…</td></tr>
              : rows.length === 0
              ? <tr><td colSpan={8} style={{ textAlign: "center", padding: 48 }} className="t-muted">No offers found.</td></tr>
              : rows.map(r => (
                <tr key={r.id}>
                  <td><span className="t-accent" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{r.offer_number}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{r.candidate_name || "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.offered_designation_name || "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.offered_salary ? `₹${Number(r.offered_salary).toLocaleString()}` : "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.joining_date || "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.offer_expiry_date || "—"}</span></td>
                  <td><Badge status={r.status} /></td>
                  <td style={{ textAlign: "right" }}>
                    {r.status === "Draft" && <>
                      <button onClick={() => navigate(`/portal/${subdomain}/recruitment/offers/${r.id}/edit`)} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
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
        <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
}
