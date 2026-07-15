import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi, portalOrgApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const BLANK = {
  candidate_id: "",
  opening_id: "",
  offered_company_id: "",
  offered_department_id: "",
  offered_branch_id: "",
  offered_designation_id: "",
  joining_date: "",
  offered_salary: "",
  offer_expiry_date: "",
};

export default function OfferForm({ editMode = false }) {
  const { subdomain, offerId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [candidates, setCandidates] = useState([]);
  const [openings, setOpenings]     = useState([]);
  const [companies, setCompanies]   = useState([]);
  const [departments, setDepts]     = useState([]);
  const [branches, setBranches]     = useState([]);
  const [designations, setDesigs]   = useState([]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    portalRecruitmentApi.listCandidates(subdomain, token, { page_size: 100, status: "Selected" })
      .then(r => setCandidates(r.data?.data?.items || [])).catch(() => {});
    portalRecruitmentApi.listOpenings(subdomain, token, { page_size: 100 })
      .then(r => setOpenings(r.data?.data?.items || [])).catch(() => {});
    portalOrgApi.listCompanies(subdomain, token, { page_size: 100, status: "Active" })
      .then(r => setCompanies(r.data?.data?.items || [])).catch(() => {});
    portalOrgApi.listDepts(subdomain, token, { page_size: 200 })
      .then(r => setDepts(r.data?.data?.items || [])).catch(() => {});
    portalOrgApi.listBranches(subdomain, token, { page_size: 200 })
      .then(r => setBranches(r.data?.data?.items || [])).catch(() => {});
    portalOrgApi.listDesigs(subdomain, token, { page_size: 200 })
      .then(r => setDesigs(r.data?.data?.items || [])).catch(() => {});

    if (editMode && offerId) {
      portalRecruitmentApi.getOffer(subdomain, token, offerId).then(r => {
        const d = r.data?.data || {};
        setForm({
          candidate_id:          d.candidate_id          || "",
          opening_id:            d.opening_id            || "",
          offered_company_id:    d.offered_company_id    || "",
          offered_department_id: d.offered_department_id || "",
          offered_branch_id:     d.offered_branch_id     || "",
          offered_designation_id:d.offered_designation_id|| "",
          joining_date:          d.joining_date          || "",
          offered_salary:        d.offered_salary        || "",
          offer_expiry_date:     d.offer_expiry_date     || "",
        });
      }).catch(() => {});
    }
  }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const onCompanyChange = e => {
    const cid = e.target.value;
    setForm(p => ({ ...p, offered_company_id: cid, offered_department_id: "", offered_branch_id: "", offered_designation_id: "" }));
    if (cid) {
      portalOrgApi.listDepts(subdomain, token, { page_size: 200, company_id: cid })
        .then(r => setDepts(r.data?.data?.items || [])).catch(() => {});
      portalOrgApi.listBranches(subdomain, token, { page_size: 200, company_id: cid })
        .then(r => setBranches(r.data?.data?.items || [])).catch(() => {});
      portalOrgApi.listDesigs(subdomain, token, { page_size: 200, company_id: cid })
        .then(r => setDesigs(r.data?.data?.items || [])).catch(() => {});
    }
  };

  const onDeptChange = e => {
    const did = e.target.value;
    setForm(p => ({ ...p, offered_department_id: did, offered_designation_id: "" }));
    if (did) {
      portalOrgApi.listDesigs(subdomain, token, { page_size: 200, department_id: did, ...(form.offered_company_id ? { company_id: form.offered_company_id } : {}) })
        .then(r => setDesigs(r.data?.data?.items || [])).catch(() => {});
    }
  };

  const submit = async () => {
    if (!editMode && !form.candidate_id) { setError("Candidate is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (payload.offered_salary) payload.offered_salary = Number(payload.offered_salary);
      Object.keys(payload).forEach(k => { if (payload[k] === "" || payload[k] === null) delete payload[k]; });
      if (editMode) await portalRecruitmentApi.updateOffer(subdomain, token, offerId, payload);
      else          await portalRecruitmentApi.createOffer(subdomain, token, payload);
      navigate(`/portal/${subdomain}/recruitment/offers`);
    } catch (e) { setError(e.response?.data?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const filteredDepts  = form.offered_company_id ? departments.filter(d => d.company_id === form.offered_company_id) : departments;
  const filteredBranches = form.offered_company_id ? branches.filter(b => b.company_id === form.offered_company_id) : branches;
  const filteredDesigs = form.offered_department_id
    ? designations.filter(d => d.department_id === form.offered_department_id)
    : form.offered_company_id
      ? designations.filter(d => d.company_id === form.offered_company_id)
      : designations;

  return (
    <div>
      <PageHeader
        title={editMode ? "Edit Offer" : "Create Offer"}
        breadcrumbs={[
          { label: "Offers", path: `/portal/${subdomain}/recruitment/offers` },
          { label: editMode ? "Edit" : "New" },
        ]}
      />
      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid rgba(239,68,68,0.25)" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Offer Details ── */}
        <div className="portal-form-card">
          <div className="portal-form-title">Offer Details</div>
          <div>
            <label className="portal-form-label portal-form-label-req">Candidate</label>
            <select value={form.candidate_id} onChange={f("candidate_id")} className="input-field" disabled={editMode}>
              <option value="">Select candidate…</option>
              {candidates.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.candidate_number}</option>)}
            </select>
            {!editMode && candidates.length === 0 && (
              <p className="t-muted" style={{ margin: "4px 0 0", fontSize: 11 }}>
                No selected candidates. Change candidate status to "Selected" first.
              </p>
            )}
          </div>
          <div>
            <label className="portal-form-label">Job Opening</label>
            <select value={form.opening_id} onChange={f("opening_id")} className="input-field">
              <option value="">Select opening (optional)…</option>
              {openings.map(o => <option key={o.id} value={o.id}>{o.job_title} — {o.opening_number}</option>)}
            </select>
          </div>
        </div>

        {/* ── Position & Compensation ── */}
        <div className="portal-form-card">
          <div className="portal-form-title">Position & Compensation</div>

          {/* Row 1: Company + Department + Branch + Designation */}
          <div className="form-grid-4">
            <div>
              <label className="portal-form-label">Company</label>
              <select value={form.offered_company_id} onChange={onCompanyChange} className="input-field">
                <option value="">Select company…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label">Department</label>
              <select value={form.offered_department_id} onChange={onDeptChange} className="input-field">
                <option value="">Select department…</option>
                {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label">Branch</label>
              <select value={form.offered_branch_id} onChange={f("offered_branch_id")} className="input-field">
                <option value="">Select branch…</option>
                {filteredBranches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
              </select>
            </div>
            <div>
              <label className="portal-form-label">Designation</label>
              <select value={form.offered_designation_id} onChange={f("offered_designation_id")} className="input-field">
                <option value="">Select designation…</option>
                {filteredDesigs.map(d => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
              </select>
            </div>
          </div>

          {/* Row 2: Salary + Joining Date + Expiry Date */}
          <div className="portal-form-row" style={{ marginTop: 12 }}>
            <div>
              <label className="portal-form-label">Offered Salary (₹/yr)</label>
              <input type="number" value={form.offered_salary} onChange={f("offered_salary")} placeholder="0" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Joining Date</label>
              <input type="date" value={form.joining_date} onChange={f("joining_date")} className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Offer Expiry Date</label>
              <input type="date" value={form.offer_expiry_date} onChange={f("offer_expiry_date")} className="input-field" />
            </div>
          </div>
        </div>

      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button onClick={submit} disabled={saving} className="btn-primary">
          {saving ? "Saving…" : editMode ? "Save" : "Create Offer"}
        </button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
      </div>
    </div>
  );
}
