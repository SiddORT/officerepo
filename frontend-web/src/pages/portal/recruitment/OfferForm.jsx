import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const BLANK = { candidate_id: "", opening_id: "", offered_designation_id: "", offered_department_id: "", offered_branch_id: "", joining_date: "", offered_salary: "", offer_expiry_date: "" };

export default function OfferForm({ editMode = false }) {
  const { subdomain, offerId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [candidates, setCandidates] = useState([]);
  const [openings, setOpenings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalRecruitmentApi.listCandidates(subdomain, token, { page_size: 200, status: "Selected" }).then(r => setCandidates(r.data?.data?.items || [])).catch(() => {});
    portalRecruitmentApi.listOpenings(subdomain, token, { page_size: 100 }).then(r => setOpenings(r.data?.data?.items || [])).catch(() => {});
    if (editMode && offerId) {
      portalRecruitmentApi.getOffer(subdomain, token, offerId).then(r => {
        const d = r.data?.data || {};
        setForm({ candidate_id: d.candidate_id || "", opening_id: d.opening_id || "", offered_designation_id: d.offered_designation_id || "", offered_department_id: d.offered_department_id || "", offered_branch_id: d.offered_branch_id || "", joining_date: d.joining_date || "", offered_salary: d.offered_salary || "", offer_expiry_date: d.offer_expiry_date || "" });
      }).catch(() => {});
    }
  }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!editMode && !form.candidate_id) { setError("Candidate is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (payload.offered_salary) payload.offered_salary = Number(payload.offered_salary);
      Object.keys(payload).forEach(k => { if (payload[k] === "" || payload[k] === null) delete payload[k]; });
      if (editMode) await portalRecruitmentApi.updateOffer(subdomain, token, offerId, payload);
      else await portalRecruitmentApi.createOffer(subdomain, token, payload);
      navigate(`/portal/${subdomain}/recruitment/offers`);
    } catch (e) { setError(e.response?.data?.message || "Failed to save."); } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <PageHeader
        title={editMode ? "Edit Offer" : "Create Offer"}
        breadcrumbs={[{ label: "Offers", path: `/portal/${subdomain}/recruitment/offers` }, { label: editMode ? "Edit" : "New" }]}
      />
      {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid rgba(239,68,68,0.25)" }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="portal-form-card">
          <div className="portal-form-title">Offer Details</div>
          <div>
            <label className="portal-form-label portal-form-label-req">Candidate</label>
            <select value={form.candidate_id} onChange={f("candidate_id")} className="input-field" disabled={editMode}>
              <option value="">Select candidate…</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.candidate_number}</option>)}
            </select>
            {!editMode && candidates.length === 0 && <p className="t-muted" style={{ margin: "4px 0 0", fontSize: 11 }}>No selected candidates. Change status to "Selected" first.</p>}
          </div>
          <div>
            <label className="portal-form-label">Job Opening</label>
            <select value={form.opening_id} onChange={f("opening_id")} className="input-field">
              <option value="">Select opening (optional)…</option>
              {openings.map(o => <option key={o.id} value={o.id}>{o.job_title} — {o.opening_number}</option>)}
            </select>
          </div>
        </div>
        <div className="portal-form-card">
          <div className="portal-form-title">Position & Compensation</div>
          <div className="portal-form-row">
            <div><label className="portal-form-label">Designation ID</label><input value={form.offered_designation_id} onChange={f("offered_designation_id")} placeholder="Designation ID" className="input-field" /></div>
            <div><label className="portal-form-label">Department ID</label><input value={form.offered_department_id} onChange={f("offered_department_id")} placeholder="Department ID" className="input-field" /></div>
            <div><label className="portal-form-label">Branch ID</label><input value={form.offered_branch_id} onChange={f("offered_branch_id")} placeholder="Branch ID" className="input-field" /></div>
          </div>
          <div className="portal-form-row">
            <div><label className="portal-form-label">Offered Salary (₹/yr)</label><input type="number" value={form.offered_salary} onChange={f("offered_salary")} placeholder="0" className="input-field" /></div>
            <div><label className="portal-form-label">Joining Date</label><input type="date" value={form.joining_date} onChange={f("joining_date")} className="input-field" /></div>
            <div><label className="portal-form-label">Offer Expiry Date</label><input type="date" value={form.offer_expiry_date} onChange={f("offer_expiry_date")} className="input-field" /></div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={submit} disabled={saving} className="btn-primary">{saving ? "Saving…" : editMode ? "Save" : "Create Offer"}</button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
