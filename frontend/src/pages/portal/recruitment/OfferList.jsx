import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import RejectReasonModal from "./RejectReasonModal";

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
  const [rejectModal, setRejectModal] = useState({ open: false, offerId: null });
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

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

  const openRejectModal = (offerId) => {
    setRejectReason("");
    setRejectModal({ open: true, offerId });
  };

  const closeRejectModal = () => {
    if (rejecting) return;
    setRejectModal({ open: false, offerId: null });
  };

  const confirmReject = async () => {
    setRejecting(true);
    try {
      await portalRecruitmentApi.rejectOffer(subdomain, token, rejectModal.offerId, { rejection_reason: rejectReason });
      setRejectModal({ open: false, offerId: null });
      load();
    } catch (e) {
      alert(e.response?.data?.message || "Reject failed.");
    } finally {
      setRejecting(false);
    }
  };

  const iconBtn = (emoji, title, onClick, color = "var(--c-accent)") => (
    <button onClick={onClick} title={title} style={{ background: "none", border: "none", cursor: "pointer", color, fontSize: 15, padding: "2px 5px", lineHeight: 1 }}>{emoji}</button>
  );

  return (
    <div>
      <PageHeader
        title="Offers"
        subtitle={`${total} offers`}
        breadcrumbs={[{ label: "Recruitment", path: `/portal/${subdomain}/recruitment` }, { label: "Offers" }]}
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
            <th style={{ width: 48, textAlign: "center" }}>Sr No</th>
            <th>Offer #</th><th>Candidate</th><th>Designation</th>
            <th>Salary</th><th>Joining</th><th>Expiry</th>
            <th>Status</th><th style={{ textAlign: "center" }}>Actions</th>
          </tr></thead>
          <tbody>
            {loading
              ? <tr><td colSpan={9} style={{ textAlign: "center", padding: 40 }} className="t-muted">Loading…</td></tr>
              : rows.length === 0
              ? <tr><td colSpan={9} style={{ textAlign: "center", padding: 48 }} className="t-muted">No offers found.</td></tr>
              : rows.map((r, idx) => (
                <tr key={r.id}>
                  <td style={{ textAlign: "center" }} className="t-muted">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td><span className="t-accent" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{r.offer_number}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{r.candidate_name || "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.offered_designation_name || "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.offered_salary ? `₹${Number(r.offered_salary).toLocaleString()}` : "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.joining_date || "—"}</span></td>
                  <td><span style={{ fontSize: 12 }}>{r.offer_expiry_date || "—"}</span></td>
                  <td><Badge status={r.status} /></td>
                  <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                    {r.status === "Draft" && <>
                      {iconBtn("✏️", "Edit", () => navigate(`/portal/${subdomain}/recruitment/offers/${r.id}/edit`))}
                      {iconBtn("📤", "Send Offer", () => doAction(() => portalRecruitmentApi.sendOffer(subdomain, token, r.id)), "#22c55e")}
                    </>}
                    {r.status === "Sent" && <>
                      {iconBtn("✅", "Accept", () => doAction(() => portalRecruitmentApi.acceptOffer(subdomain, token, r.id)), "#22c55e")}
                      {iconBtn("❌", "Reject", () => openRejectModal(r.id), "#ef4444")}
                    </>}
                    {iconBtn("👁", "View", () => navigate(`/portal/${subdomain}/recruitment/offers/${r.id}`))}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>

      <RejectReasonModal
        open={rejectModal.open}
        onClose={closeRejectModal}
        onConfirm={confirmReject}
        loading={rejecting}
        reason={rejectReason}
        onReasonChange={setRejectReason}
      />
    </div>
  );
}
