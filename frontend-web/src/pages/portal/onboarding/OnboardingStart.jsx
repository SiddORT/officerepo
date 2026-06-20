import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { portalOnboardingApi } from "../../../services/apiClient";
import { portalEmployeeApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";

export default function OnboardingStart() {
  const { subdomain }  = useParams();
  const { token }      = usePortalAuth();
  const navigate       = useNavigate();
  const [sp]           = useSearchParams();
  const base           = `/portal/${subdomain}/hrms/onboarding`;

  const [employees, setEmployees] = useState([]);
  const [templates,  setTemplates]  = useState([]);
  const [empSearch,  setEmpSearch]  = useState("");
  const [form, setForm] = useState({
    employee_id:       sp.get("employee_id") || "",
    offer_id:          sp.get("offer_id") || "",
    candidate_id:      sp.get("candidate_id") || "",
    template_id:       "",
    joining_date:      "",
    employee_category: "",
    notes:             "",
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [empName, setEmpName] = useState("");

  useEffect(() => {
    portalOnboardingApi.listTemplates(subdomain, token, true)
      .then(r => setTemplates(r.data?.data || []))
      .catch(() => {});
  }, [subdomain, token]);

  const searchEmps = q => {
    if (!q || q.length < 2) { setEmployees([]); return; }
    portalEmployeeApi.list(subdomain, token, { search: q, page: 1, page_size: 15 })
      .then(r => setEmployees((r.data?.data?.items || r.data?.data || [])))
      .catch(() => {});
  };

  const selectEmp = emp => {
    setEmpName(`${emp.first_name} ${emp.last_name} (${emp.employee_code})`);
    setEmpSearch(`${emp.first_name} ${emp.last_name} (${emp.employee_code})`);
    setForm(f => ({
      ...f, employee_id: emp.id,
      employee_category: emp.employee_category || "",
      joining_date: emp.joining_date || "",
    }));
    setEmployees([]);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.employee_id) { setError("Please select an employee."); return; }
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      if (!payload.joining_date) delete payload.joining_date;
      if (!payload.template_id) delete payload.template_id;
      if (!payload.offer_id) delete payload.offer_id;
      if (!payload.candidate_id) delete payload.candidate_id;
      const r = await portalOnboardingApi.start(subdomain, token, payload);
      navigate(`${base}/${r.data?.data?.id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Failed to start onboarding.");
      setSaving(false);
    }
  };

  const CATS = [
    "Full-Time Employee", "Part-Time Employee", "Intern", "Contractor",
    "Consultant", "Remote Employee", "Probationer",
  ];

  return (
    <div>
      <PageHeader
        title="Start Onboarding"
        breadcrumbs={[
          { label: "Employee Onboarding", path: base },
          { label: "Start New" },
        ]}
      />

      <div style={{ maxWidth: 640 }}>
        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "10px 14px", marginBottom: 18, color: "#991b1b", fontSize: 13 }}>
              {error}
            </div>
          )}

          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 18 }} className="t-heading">Employee</div>

            {/* Employee search */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Select Employee *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  value={empSearch}
                  onChange={e => { setEmpSearch(e.target.value); setForm(f => ({ ...f, employee_id: "" })); searchEmps(e.target.value); }}
                  placeholder="Type name or code to search…"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13, boxSizing: "border-box" }}
                />
                {employees.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 8, zIndex: 100, boxShadow: "var(--c-shadow-lg)", maxHeight: 220, overflowY: "auto" }}>
                    {employees.map(emp => (
                      <div key={emp.id} onClick={() => selectEmp(emp)}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13 }}
                        onMouseEnter={e => { e.currentTarget.style.background = "var(--c-hover)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
                        <span style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</span>
                        <span className="t-muted"> · {emp.employee_code}</span>
                        {emp.designation_name && <span className="t-muted"> · {emp.designation_name}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {form.employee_id && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#22c55e" }}>✓ Selected: {empName}</div>
              )}
            </div>

            {/* Employee category */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Employee Category
              </label>
              <select value={form.employee_category} onChange={e => setForm(f => ({ ...f, employee_category: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13 }}>
                <option value="">— Select category —</option>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Joining date */}
            <div style={{ marginBottom: 0 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Joining Date
              </label>
              <input type="date" value={form.joining_date} onChange={e => setForm(f => ({ ...f, joining_date: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13, boxSizing: "border-box" }} />
            </div>
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 18 }} className="t-heading">Onboarding Template</div>

            {templates.length === 0 ? (
              <div className="t-muted" style={{ fontSize: 13 }}>
                No active templates. <button type="button" onClick={() => navigate(`${base}/templates/new`)}
                  style={{ background: "none", border: "none", color: "var(--c-accent)", cursor: "pointer", fontSize: 13, padding: 0 }}>
                  Create one →
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-muted)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Select Template (optional — auto-selected by category if blank)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                  {templates.map(t => (
                    <div key={t.id}
                      onClick={() => setForm(f => ({ ...f, template_id: form.template_id === t.id ? "" : t.id }))}
                      style={{
                        padding: "12px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                        border: `2px solid ${form.template_id === t.id ? "var(--c-accent)" : "var(--c-border)"}`,
                        background: form.template_id === t.id ? "var(--c-accent)11" : "var(--c-card)",
                      }}>
                      <div style={{ fontWeight: 600 }}>{t.template_name}</div>
                      <div className="t-muted" style={{ fontSize: 11, marginTop: 2 }}>
                        {t.employee_category || "General"} · {(t.tasks || []).length} tasks
                        {t.is_default && <span style={{ color: "var(--c-accent)", marginLeft: 6 }}>★ Default</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }} className="t-heading">Notes</div>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Add any notes or instructions for this onboarding…"
              rows={3}
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-input)", color: "var(--c-text)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="submit" disabled={saving || !form.employee_id} className="btn-primary">
              {saving ? "Starting…" : "▶️ Start Onboarding"}
            </button>
            <button type="button" onClick={() => navigate(base)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
