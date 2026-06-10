import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";

const inputStyle = {
  width: "100%", padding: "8px 10px",
  background: "var(--c-bg)", border: "1px solid var(--c-border)",
  borderRadius: 6, fontSize: 13, color: "var(--c-text)", boxSizing: "border-box",
};

const Label = ({ children }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}
  </label>
);

const Section = ({ title, children }) => (
  <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, marginBottom: 16 }}>
    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>{title}</div>
    {children}
  </div>
);

const Grid = ({ children, cols = 2 }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 14 }}>
    {children}
  </div>
);

const EMPTY = {
  company_code: "", company_name: "", legal_name: "", display_name: "",
  registration_number: "", tax_number: "", website: "",
  email: "", phone: "",
  address_line_1: "", address_line_2: "", city: "", state: "", country: "", postal_code: "",
};

export default function CompanyForm({ editMode }) {
  const { subdomain, companyId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(editMode);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editMode || !companyId) return;
    setLoading(true);
    portalOrgApi.getCompany(subdomain, token, companyId)
      .then(r => {
        const d = r.data.data;
        setForm(Object.fromEntries(Object.keys(EMPTY).map(k => [k, d[k] ?? ""])));
      })
      .catch(() => setError("Failed to load company."))
      .finally(() => setLoading(false));
  }, [editMode, companyId, subdomain, token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.company_code.trim()) { setError("Company Code is required."); return; }
    if (!form.company_name.trim()) { setError("Company Name is required."); return; }
    setSaving(true); setError("");
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === "" ? null : v]));
    payload.company_code = (payload.company_code || "").toUpperCase();
    try {
      if (editMode) await portalOrgApi.updateCompany(subdomain, token, companyId, payload);
      else await portalOrgApi.createCompany(subdomain, token, payload);
      navigate(`/portal/${subdomain}/org/companies`);
    } catch (e) { setError(e?.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <OrgLayout title="Company"><div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div></OrgLayout>;

  return (
    <OrgLayout title={editMode ? "Edit Company" : "Add Company"}>
      <div>
        {/* Page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>{editMode ? "Edit Company" : "Add Company"}</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>{editMode ? "Update company details" : "Register a new legal entity"}</p>
          </div>
          <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: "var(--c-muted)", background: "none", border: "none", cursor: "pointer" }}>← Back</button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>
            {error}
          </div>
        )}

        <Section title="Basic Information">
          <Grid>
            <div>
              <Label>Company Code *</Label>
              <input value={form.company_code} onChange={e => set("company_code", e.target.value.toUpperCase())}
                placeholder="ACME" style={{ ...inputStyle, fontFamily: "monospace" }} />
            </div>
            <div>
              <Label>Company Name *</Label>
              <input value={form.company_name} onChange={e => set("company_name", e.target.value)}
                placeholder="Acme Pvt Ltd" style={inputStyle} />
            </div>
            <div>
              <Label>Legal / Registered Name</Label>
              <input value={form.legal_name} onChange={e => set("legal_name", e.target.value)}
                placeholder="Acme Private Limited" style={inputStyle} />
            </div>
            <div>
              <Label>Display Name</Label>
              <input value={form.display_name} onChange={e => set("display_name", e.target.value)}
                placeholder="Acme" style={inputStyle} />
            </div>
          </Grid>
        </Section>

        <Section title="Legal Identity">
          <Grid>
            <div>
              <Label>Registration Number</Label>
              <input value={form.registration_number} onChange={e => set("registration_number", e.target.value)}
                placeholder="CIN / Reg. No." style={inputStyle} />
            </div>
            <div>
              <Label>Tax Number (GST / VAT)</Label>
              <input value={form.tax_number} onChange={e => set("tax_number", e.target.value)}
                placeholder="GST No." style={inputStyle} />
            </div>
            <div>
              <Label>Website</Label>
              <input value={form.website} onChange={e => set("website", e.target.value)}
                placeholder="https://acme.com" style={inputStyle} />
            </div>
          </Grid>
        </Section>

        <Section title="Contact">
          <Grid>
            <div>
              <Label>Email</Label>
              <input value={form.email} onChange={e => set("email", e.target.value)}
                placeholder="contact@acme.com" type="email" style={inputStyle} />
            </div>
            <div>
              <Label>Phone</Label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)}
                placeholder="+91 98765 43210" style={inputStyle} />
            </div>
          </Grid>
        </Section>

        <Section title="Address">
          <Grid cols={1}>
            <div>
              <Label>Address Line 1</Label>
              <input value={form.address_line_1} onChange={e => set("address_line_1", e.target.value)}
                placeholder="Street / Plot" style={inputStyle} />
            </div>
            <div>
              <Label>Address Line 2</Label>
              <input value={form.address_line_2} onChange={e => set("address_line_2", e.target.value)}
                placeholder="Area / Landmark" style={inputStyle} />
            </div>
          </Grid>
          <div style={{ marginTop: 14 }}>
            <Grid>
              <div>
                <Label>City</Label>
                <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="Mumbai" style={inputStyle} />
              </div>
              <div>
                <Label>State</Label>
                <input value={form.state} onChange={e => set("state", e.target.value)} placeholder="Maharashtra" style={inputStyle} />
              </div>
              <div>
                <Label>Country</Label>
                <input value={form.country} onChange={e => set("country", e.target.value)} placeholder="India" style={inputStyle} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <input value={form.postal_code} onChange={e => set("postal_code", e.target.value)} placeholder="400001" style={inputStyle} />
              </div>
            </Grid>
          </div>
        </Section>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding: "9px 22px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: saving ? "var(--c-muted)" : "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Company"}
          </button>
          <button onClick={() => navigate(-1)}
            style={{ padding: "9px 18px", borderRadius: 7, fontWeight: 500, fontSize: 13, background: "var(--c-surface)", color: "var(--c-text)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </OrgLayout>
  );
}
