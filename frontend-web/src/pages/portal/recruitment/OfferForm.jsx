import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

const inp = { padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
const Label = ({ children, req }) => <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2,var(--c-muted))", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}{req && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}</label>;
const Card = ({ title, children }) => <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>{title && <div style={{ fontSize: 13, fontWeight: 700, paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>{title}</div>}{children}</div>;
const Row = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>{children}</div>;

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
      if (editMode) {
        await portalRecruitmentApi.updateOffer(subdomain, token, offerId, payload);
        navigate(`/portal/${subdomain}/recruitment/offers`);
      } else {
        await portalRecruitmentApi.createOffer(subdomain, token, payload);
        navigate(`/portal/${subdomain}/recruitment/offers`);
      }
    } catch (e) { setError(e.response?.data?.message || "Failed to save."); } finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 12, color: "var(--c-muted)" }}>
        <span onClick={() => navigate(`/portal/${subdomain}/recruitment/offers`)} style={{ cursor: "pointer", color: "var(--c-accent)" }}>Offers</span>
        <span>/</span><span>{editMode ? "Edit" : "New"}</span>
      </div>
      <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700 }}>{editMode ? "Edit Offer" : "Create Offer"}</h2>
      {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Card title="Offer Details">
          <div>
            <Label req>Candidate</Label>
            <select value={form.candidate_id} onChange={f("candidate_id")} style={inp} disabled={editMode}>
              <option value="">Select candidate…</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.candidate_number}</option>)}
            </select>
            {!editMode && candidates.length === 0 && <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--c-muted)" }}>No selected candidates. Change candidate status to "Selected" first.</p>}
          </div>
          <div>
            <Label>Job Opening</Label>
            <select value={form.opening_id} onChange={f("opening_id")} style={inp}>
              <option value="">Select opening (optional)…</option>
              {openings.map(o => <option key={o.id} value={o.id}>{o.job_title} — {o.opening_number}</option>)}
            </select>
          </div>
        </Card>
        <Card title="Position & Compensation">
          <Row>
            <div><Label>Designation ID</Label><input value={form.offered_designation_id} onChange={f("offered_designation_id")} placeholder="Designation ID" style={inp} /></div>
            <div><Label>Department ID</Label><input value={form.offered_department_id} onChange={f("offered_department_id")} placeholder="Department ID" style={inp} /></div>
            <div><Label>Branch ID</Label><input value={form.offered_branch_id} onChange={f("offered_branch_id")} placeholder="Branch ID" style={inp} /></div>
          </Row>
          <Row>
            <div><Label>Offered Salary (₹/yr)</Label><input type="number" value={form.offered_salary} onChange={f("offered_salary")} placeholder="0" style={inp} /></div>
            <div><Label>Joining Date</Label><input type="date" value={form.joining_date} onChange={f("joining_date")} style={inp} /></div>
            <div><Label>Offer Expiry Date</Label><input type="date" value={form.offer_expiry_date} onChange={f("offer_expiry_date")} style={inp} /></div>
          </Row>
        </Card>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button onClick={() => navigate(`/portal/${subdomain}/recruitment/offers`)} style={{ padding: "9px 20px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
        <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : editMode ? "Save" : "Create Offer"}</button>
      </div>
    </div>
  );
}
