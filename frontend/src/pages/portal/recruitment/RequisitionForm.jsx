import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalRecruitmentApi, portalOrgApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

const BLANK = {
  company_id: "", department_id: "", designation_id: "", branch_id: "",
  hiring_manager: "", number_of_positions: 1,
  employment_type: "", employee_category: "", reason_for_hiring: "",
  budget_min: "", budget_max: "", target_joining_date: "",
  job_description: "", skills_required: "",
};

// ── field label ───────────────────────────────────────────────────────────────
function Label({ children, required }) {
  return (
    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>
      {children}
      {required && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
    </label>
  );
}

// ── section card ──────────────────────────────────────────────────────────────
function Section({ icon, title, accent = "var(--c-accent)", children }) {
  return (
    <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--c-shadow)" }}>
      {/* header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 3, height: 18, borderRadius: 2, background: accent, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{icon} {title}</span>
      </div>
      {/* body */}
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
        {children}
      </div>
    </div>
  );
}

// ── grid helpers ──────────────────────────────────────────────────────────────
const Row4 = ({ children }) => (
  <div className="form-grid-4">{children}</div>
);
const Row3 = ({ children }) => (
  <div className="form-grid-3">{children}</div>
);
const Row2 = ({ children }) => (
  <div className="form-grid-2">{children}</div>
);

export default function RequisitionForm({ editMode = false }) {
  const { subdomain, reqId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [form, setForm]             = useState(BLANK);
  const [meta, setMeta]             = useState({});
  const [companies, setCompanies]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [branches, setBranches]     = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  // initial data
  useEffect(() => {
    portalRecruitmentApi.metaOptions(subdomain, token)
      .then(r => setMeta(r.data?.data || {})).catch(() => {});
    portalOrgApi.listCompanies(subdomain, token, { page_size: 200, is_active: true })
      .then(r => setCompanies(r.data.data?.data || [])).catch(() => {});
    if (editMode && reqId) {
      portalRecruitmentApi.getRequisition(subdomain, token, reqId).then(r => {
        const d = r.data?.data || {};
        setForm({
          company_id: d.company_id || "", department_id: d.department_id || "",
          designation_id: d.designation_id || "", branch_id: d.branch_id || "",
          hiring_manager: d.hiring_manager || "", number_of_positions: d.number_of_positions || 1,
          employment_type: d.employment_type || "", employee_category: d.employee_category || "",
          reason_for_hiring: d.reason_for_hiring || "", budget_min: d.budget_min || "",
          budget_max: d.budget_max || "", target_joining_date: d.target_joining_date || "",
          job_description: d.job_description || "", skills_required: d.skills_required || "",
        });
      }).catch(() => {});
    }
  }, []);

  // cascading org dropdowns
  useEffect(() => {
    if (!form.company_id) {
      setDepartments([]); setDesignations([]); setBranches([]); setEmployees([]);
      return;
    }
    portalOrgApi.listDepts(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDepartments(r.data.data?.data || [])).catch(() => {});
    portalOrgApi.listDesigs(subdomain, token, { company_id: form.company_id, page_size: 200 })
      .then(r => setDesignations(r.data.data?.data || [])).catch(() => {});
    portalOrgApi.listBranches(subdomain, token, { company_id: form.company_id, page_size: 200, status: "active" })
      .then(r => setBranches(r.data.data?.data || [])).catch(() => {});
    portalOrgApi.listActiveEmployees(subdomain, token, { company_id: form.company_id })
      .then(r => setEmployees(r.data.data?.data || [])).catch(() => {});
  }, [subdomain, token, form.company_id]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const onCompany = e => setForm(p => ({ ...p, company_id: e.target.value, department_id: "", designation_id: "", branch_id: "" }));

  const submit = async () => {
    if (!form.department_id) { setError("Department is required."); return; }
    if (!form.designation_id) { setError("Designation is required."); return; }
    setSaving(true); setError("");
    try {
      const payload = {
        ...form,
        number_of_positions: Number(form.number_of_positions) || 1,
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
      };
      Object.keys(payload).forEach(k => { if (payload[k] === "" || payload[k] === null) delete payload[k]; });
      if (editMode) {
        await portalRecruitmentApi.updateRequisition(subdomain, token, reqId, payload);
        navigate(`/portal/${subdomain}/recruitment/requisitions/${reqId}`);
      } else {
        const r = await portalRecruitmentApi.createRequisition(subdomain, token, payload);
        navigate(`/portal/${subdomain}/recruitment/requisitions/${r.data?.data?.id || ""}`);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader
        title={editMode ? "Edit Requisition" : "New Job Requisition"}
        breadcrumbs={[
          { label: "Recruitment",    path: `/portal/${subdomain}/recruitment` },
          { label: "Requisitions",   path: `/portal/${subdomain}/recruitment/requisitions` },
          { label: editMode ? "Edit" : "New" },
        ]}
      />

      {error && (
        <div style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", padding: "11px 16px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
          <span>⚠️</span> {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Top row: Org + Budget side by side ── */}
        {/* Non-uniform sidebar layout — 1fr main content + fixed 340px budget sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16, alignItems: "start" }}>

        {/* ── Section 1: Organisation & Position ── */}
        <Section icon="🏢" title="Organisation & Position" accent="#00aeec">
          {/* Row 1 — Company + Department + Designation + Branch */}
          <Row4>
            <div>
              <Label>Company</Label>
              <select value={form.company_id} onChange={onCompany} className="input-field">
                <option value="">Select company…</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <Label required>Department</Label>
              <select value={form.department_id} onChange={f("department_id")} className="input-field" disabled={!form.company_id}>
                <option value="">Select department…</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.department_name}</option>)}
              </select>
            </div>
            <div>
              <Label required>Designation</Label>
              <select value={form.designation_id} onChange={f("designation_id")} className="input-field" disabled={!form.company_id}>
                <option value="">Select designation…</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.designation_name}</option>)}
              </select>
            </div>
            <div>
              <Label>Branch</Label>
              <select value={form.branch_id} onChange={f("branch_id")} className="input-field" disabled={!form.company_id}>
                <option value="">Select branch…</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
              </select>
            </div>
          </Row4>

          {/* Row 2 — Hiring Manager + No. of Positions + Employment Type + Employee Category */}
          <Row4>
            <div>
              <Label>Hiring Manager</Label>
              <select value={form.hiring_manager} onChange={f("hiring_manager")} className="input-field" disabled={!form.company_id}>
                <option value="">Select hiring manager…</option>
                {employees.map(e => (
                  <option key={e.id} value={e.full_name}>
                    {e.full_name}{e.employee_code ? ` (${e.employee_code})` : ""}
                  </option>
                ))}
                {form.hiring_manager && !employees.some(e => e.full_name === form.hiring_manager) && (
                  <option value={form.hiring_manager}>{form.hiring_manager}</option>
                )}
              </select>
            </div>
            <div>
              <Label>No. of Positions</Label>
              <input type="number" min={1} value={form.number_of_positions} onChange={f("number_of_positions")} className="input-field" />
            </div>
            <div>
              <Label>Employment Type</Label>
              <select value={form.employment_type} onChange={f("employment_type")} className="input-field">
                <option value="">Select…</option>
                {(meta.employment_types || []).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <Label>Employee Category</Label>
              <select value={form.employee_category} onChange={f("employee_category")} className="input-field">
                <option value="">Select…</option>
                {(meta.employee_categories || []).map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </Row4>

          {/* Row 3 — Reason for Hiring (single field, half-width) */}
          <Row2>
            <div>
              <Label>Reason for Hiring</Label>
              <select value={form.reason_for_hiring} onChange={f("reason_for_hiring")} className="input-field">
                <option value="">Select…</option>
                {(meta.hiring_reasons || []).map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </Row2>
        </Section>

        {/* ── Section 2: Budget & Timeline ── */}
        <Section icon="💰" title="Budget & Timeline" accent="#10b981">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <Label>Budget Min (₹)</Label>
              <input type="number" value={form.budget_min} onChange={f("budget_min")} placeholder="e.g. 500000" className="input-field" />
            </div>
            <div>
              <Label>Budget Max (₹)</Label>
              <input type="number" value={form.budget_max} onChange={f("budget_max")} placeholder="e.g. 1200000" className="input-field" />
            </div>
            <div>
              <Label>Target Joining Date</Label>
              <input type="date" value={form.target_joining_date} onChange={f("target_joining_date")} className="input-field" />
            </div>
          </div>
        </Section>

        </div>{/* end top grid */}

        {/* ── Section 3: Job Details ── */}
        <Section icon="📄" title="Job Details" accent="#8b5cf6">
          <div>
            <Label>Job Description</Label>
            <textarea
              value={form.job_description}
              onChange={f("job_description")}
              rows={5}
              placeholder="Describe the role, responsibilities, and requirements…"
              className="input-field"
              style={{ resize: "vertical", lineHeight: 1.6 }}
            />
          </div>
          <div>
            <Label>Skills Required</Label>
            <textarea
              value={form.skills_required}
              onChange={f("skills_required")}
              rows={3}
              placeholder="e.g. React, Python, Communication, Team Leadership…"
              className="input-field"
              style={{ resize: "vertical", lineHeight: 1.6 }}
            />
          </div>
        </Section>

      </div>

      {/* ── Action bar ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--c-border)" }}>
        <button onClick={submit} disabled={saving} className="btn-primary" style={{ minWidth: 160 }}>
          {saving ? "Saving…" : editMode ? "Save Changes" : "Create Requisition"}
        </button>
        <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        {!editMode && (
          <span style={{ fontSize: 12, color: "var(--c-muted)", marginLeft: 4 }}>
            Fields marked <span style={{ color: "#f87171" }}>*</span> are required.
          </span>
        )}
      </div>
    </div>
  );
}
