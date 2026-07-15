import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";
import RejectReasonModal from "./RejectReasonModal";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

const PAGE_SIZE = 20;

const EMPTY_CONFIRM = { open: false, title: "", message: "", confirmLabel: "Confirm", variant: "danger", onConfirm: null, loading: false, error: "" };

export default function OfferList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploadTargetId, setUploadTargetId] = useState(null);

  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [status, setStatus]   = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);

  const [confirm, setConfirm] = useState(EMPTY_CONFIRM);

  const [rejectModal, setRejectModal]   = useState({ open: false, offerId: null });
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting]       = useState(false);

  const load = () => {
    setLoading(true);
    portalRecruitmentApi
      .listOffers(subdomain, token, { page, page_size: PAGE_SIZE, status: status || undefined })
      .then(r => { const d = r.data?.data || {}; setRows(d.items || []); setTotal(d.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, status]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const openConfirm = ({ title, message, confirmLabel = "Confirm", variant = "danger", action }) => {
    setConfirm({
      open: true, title, message, confirmLabel, variant,
      onConfirm: action,
      loading: false, error: "",
    });
  };

  const closeConfirm = () => setConfirm(EMPTY_CONFIRM);

  const runConfirm = async () => {
    setConfirm(c => ({ ...c, loading: true, error: "" }));
    try {
      await confirm.onConfirm();
      closeConfirm();
      load();
    } catch (e) {
      setConfirm(c => ({ ...c, loading: false, error: e.response?.data?.message || "Action failed. Please try again." }));
    }
  };

  const openRejectModal = (offerId) => {
    setRejectReason("");
    setRejectModal({ open: true, offerId });
  };
  const closeRejectModal = () => { if (rejecting) return; setRejectModal({ open: false, offerId: null }); };
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

  const triggerUpload = (offerId) => {
    setUploadTargetId(offerId);
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(uploadTargetId);
    try {
      await portalRecruitmentApi.uploadOfferLetter(subdomain, token, uploadTargetId, fd);
      load();
    } catch (err) {
      setConfirm(EMPTY_CONFIRM);
      openConfirm({
        title: "Upload Failed",
        message: err.response?.data?.message || "The file could not be uploaded. Please try again.",
        confirmLabel: "OK",
        variant: "primary",
        action: async () => {},
      });
    } finally {
      setUploading(null);
      setUploadTargetId(null);
    }
  };

  const downloadLetter = async (r) => {
    try {
      const res = await portalRecruitmentApi.downloadOfferLetter(subdomain, token, r.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = r.offer_letter_name || "offer_letter";
      a.click(); URL.revokeObjectURL(url);
    } catch {
      openConfirm({
        title: "Download Failed",
        message: "Could not download the offer letter. Please try again.",
        confirmLabel: "OK",
        variant: "primary",
        action: async () => {},
      });
    }
  };

  const iconBtn = (emoji, title, onClick, color = "var(--c-accent)", disabled = false) => (
    <button
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      style={{
        background: "none", border: "none",
        cursor: disabled ? "default" : "pointer",
        color, fontSize: 15, padding: "2px 5px", lineHeight: 1,
        opacity: disabled ? 0.4 : 1,
      }}
    >{emoji}</button>
  );

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />

      <PageHeader
        title="Offers"
        subtitle={`${total} offers`}
        breadcrumbs={[
          { label: "Recruitment", path: `/portal/${subdomain}/recruitment` },
          { label: "Offers" },
        ]}
        actions={
          <button
            onClick={() => navigate(`/portal/${subdomain}/recruitment/offers/new`)}
            className="btn-primary"
          >
            + Create Offer
          </button>
        }
      />

      <div style={{ marginBottom: 14 }}>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="input-field"
          style={{ maxWidth: 180 }}
        >
          <option value="">All Statuses</option>
          {["Draft", "Sent", "Accepted", "Rejected", "Expired"].map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="portal-table-wrap">
        <table className="portal-table">
          <thead>
            <tr>
              <th style={{ width: 48, textAlign: "center" }}>Sr No</th>
              <th>Offer #</th>
              <th>Candidate</th>
              <th>Designation</th>
              <th>Salary</th>
              <th>Joining</th>
              <th>Expiry</th>
              <th>Status</th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 40 }} className="t-muted">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 48 }} className="t-muted">No offers found.</td></tr>
            ) : rows.map((r, idx) => (
              <tr key={r.id}>
                <td style={{ textAlign: "center" }} className="t-muted">
                  {(page - 1) * PAGE_SIZE + idx + 1}
                </td>
                <td>
                  <button
                    onClick={() => navigate(`/portal/${subdomain}/recruitment/offers/${r.id}`)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <span className="t-accent" style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>
                      {r.offer_number}
                    </span>
                  </button>
                </td>
                <td><span style={{ fontWeight: 600 }}>{r.candidate_name || "—"}</span></td>
                <td><span style={{ fontSize: 12 }}>{r.offered_designation_name || "—"}</span></td>
                <td><span style={{ fontSize: 12 }}>{r.offered_salary ? `₹${Number(r.offered_salary).toLocaleString()}` : "—"}</span></td>
                <td><span style={{ fontSize: 12 }}>{r.joining_date || "—"}</span></td>
                <td><span style={{ fontSize: 12 }}>{r.offer_expiry_date || "—"}</span></td>
                <td><Badge status={r.status} /></td>
                <td style={{ textAlign: "center" }} onClick={e => e.stopPropagation()}>
                  {r.status === "Draft" && <>
                    {iconBtn("✏️", "Edit", () => navigate(`/portal/${subdomain}/recruitment/offers/${r.id}/edit`))}
                    {iconBtn("📤", "Send Offer", () => openConfirm({
                      title: "Send Offer",
                      message: `Send this offer to ${r.candidate_name || "the candidate"}? They will be notified.`,
                      confirmLabel: "Send",
                      variant: "primary",
                      action: () => portalRecruitmentApi.sendOffer(subdomain, token, r.id),
                    }), "#22c55e")}
                  </>}
                  {r.status === "Sent" && <>
                    {iconBtn("✅", "Accept Offer", () => openConfirm({
                      title: "Accept Offer",
                      message: `Mark this offer for ${r.candidate_name || "the candidate"} as Accepted?`,
                      confirmLabel: "Accept",
                      variant: "primary",
                      action: () => portalRecruitmentApi.acceptOffer(subdomain, token, r.id),
                    }), "#22c55e")}
                    {iconBtn("❌", "Reject Offer", () => openRejectModal(r.id), "#ef4444")}
                  </>}
                  {uploading === r.id ? (
                    <span style={{ fontSize: 11, color: "var(--c-muted)", padding: "0 4px" }}>…</span>
                  ) : r.offer_letter_key ? (
                    <>
                      {iconBtn("📄", `Download: ${r.offer_letter_name || "offer letter"}`, () => downloadLetter(r), "var(--c-accent)")}
                      {iconBtn("🗑️", "Remove letter", () => openConfirm({
                        title: "Remove Offer Letter",
                        message: `Remove the uploaded offer letter "${r.offer_letter_name || "file"}"? This cannot be undone.`,
                        confirmLabel: "Remove",
                        variant: "danger",
                        action: () => portalRecruitmentApi.deleteOfferLetter(subdomain, token, r.id),
                      }), "#ef4444")}
                    </>
                  ) : (
                    iconBtn("📎", "Upload Offer Letter", () => triggerUpload(r.id), "var(--c-muted)")
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        confirmVariant={confirm.variant}
        onConfirm={runConfirm}
        onCancel={closeConfirm}
        loading={confirm.loading}
        error={confirm.error}
      />

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
