import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

function getExpiryStatus(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const expiry = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor((expiry - today) / 86400000);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring_soon";
  return "ok";
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div className="portal-form-label" style={{ marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "var(--c-text)" : "var(--c-muted)", opacity: value ? 1 : 0.5 }}>
        {value || "—"}
      </div>
    </div>
  );
}

function AddressBlock({ title, postal_code, line1, line2, city, district, state, country }) {
  const hasAny = postal_code || line1 || line2 || city || district || state || country;
  return (
    <div className="portal-form-card">
      <div className="portal-form-title">{title}</div>
      {!hasAny ? (
        <div style={{ fontSize: 13, color: "var(--c-muted)", opacity: 0.5 }}>No address on record.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <InfoRow label="Postal Code" value={postal_code} />
          <InfoRow label="Address Line 1" value={line1} />
          <InfoRow label="Address Line 2" value={line2} />
          <InfoRow label="City" value={city} />
          <InfoRow label="District" value={district} />
          <InfoRow label="State" value={state} />
          <InfoRow label="Country" value={country} />
        </div>
      )}
    </div>
  );
}

export default function CompanyDetails() {
  const { subdomain, companyId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setDocsLoading(true);
    Promise.all([
      portalOrgApi.getCompany(subdomain, token, companyId),
      portalOrgApi.listCompanyDocs(subdomain, token, companyId).catch(() => ({ data: { data: [] } })),
    ])
      .then(([companyRes, docsRes]) => {
        setCompany(companyRes.data.data);
        setDocs(docsRes.data.data || []);
      })
      .catch(() => setError("Failed to load company."))
      .finally(() => { setLoading(false); setDocsLoading(false); });
  }, [subdomain, token, companyId]);

  useEffect(() => { load(); }, [load]);

  const handleDownload = async (doc) => {
    setDownloadError("");
    try {
      const res = await portalOrgApi.downloadCompanyDoc(subdomain, token, companyId, doc.id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Download failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <OrgLayout title="Company Details">
        <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
      </OrgLayout>
    );
  }

  if (error || !company) {
    return (
      <OrgLayout title="Company Details">
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
          {error || "Company not found."}
        </div>
      </OrgLayout>
    );
  }

  const officeIsSame = !company.off_address_line_1 && !company.off_postal_code && !company.off_city;

  return (
    <OrgLayout title="Company Details">
      <div>
        <PageHeader
          title={company.company_name}
          subtitle={
            <span>
              <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-muted)", marginRight: 10 }}>
                {company.company_code}
              </span>
              <Badge status={company.is_active ? "Active" : "Inactive"} />
            </span>
          }
          actions={
            <>
              <button onClick={() => navigate(`/portal/${subdomain}/org/companies`)} className="btn-secondary">
                ← Back
              </button>
              <Link to={`/portal/${subdomain}/org/companies/${companyId}/edit`} className="btn-primary">
                Edit
              </Link>
            </>
          }
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>

          {/* General */}
          <div className="portal-form-card">
            <div className="portal-form-title">🏢 General Information</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <InfoRow label="Legal / Registered Name" value={company.legal_name} />
              <InfoRow label="Display Name" value={company.display_name} />
              <InfoRow label="Company Type" value={company.company_type} />
              <InfoRow label="Industry" value={company.industry} />
              <InfoRow label="Date of Incorporation" value={company.date_of_incorporation} />
              <InfoRow label="Status" value={
                <Badge status={company.status || (company.is_active ? "Active" : "Inactive")} />
              } />
            </div>
            {company.company_description && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--c-border)" }}>
                <div className="portal-form-label" style={{ marginBottom: 4 }}>Description</div>
                <div style={{ fontSize: 13, color: "var(--c-text)", lineHeight: 1.6 }}>{company.company_description}</div>
              </div>
            )}
          </div>

          {/* Compliance */}
          <div className="portal-form-card">
            <div className="portal-form-title">📋 Compliance & Tax</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <InfoRow label="Registration Number" value={company.registration_number} />
              <InfoRow label="CIN Number" value={company.cin_number} />
              <InfoRow label="PAN Number" value={company.pan_number} />
              <InfoRow label="TAN Number" value={company.tan_number} />
              <InfoRow label="GST Number" value={company.tax_number} />
              <InfoRow label="GST Registration Date" value={company.gst_registration_date} />
              <InfoRow label="MSME Number" value={company.msme_number} />
              <InfoRow label="TIN" value={company.tax_identification_number} />
            </div>
          </div>

          {/* Contact */}
          <div className="portal-form-card">
            <div className="portal-form-title">📞 Contact Information</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <InfoRow label="Primary Contact" value={company.primary_contact_person} />
              <InfoRow label="Phone" value={[company.phone_country_code, company.phone].filter(Boolean).join(" ")} />
              <InfoRow label="Email" value={company.email} />
              <InfoRow label="Website" value={company.website ? (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="t-accent" style={{ fontSize: 13 }}>
                  {company.website}
                </a>
              ) : null} />
              <InfoRow label="Support Email" value={company.support_email} />
              <InfoRow label="HR Email" value={company.hr_email} />
              <InfoRow label="Accounts Email" value={company.accounts_email} />
            </div>
          </div>

          {/* Registered Address */}
          <AddressBlock
            title="📍 Registered Address"
            postal_code={company.postal_code}
            line1={company.address_line_1}
            line2={company.address_line_2}
            city={company.city}
            district={company.district}
            state={company.state}
            country={company.country}
          />

          {/* Office Address */}
          {officeIsSame ? (
            <div className="portal-form-card">
              <div className="portal-form-title">🏬 Office Address</div>
              <div style={{ fontSize: 13, color: "var(--c-muted)", opacity: 0.7 }}>Same as registered address.</div>
            </div>
          ) : (
            <AddressBlock
              title="🏬 Office Address"
              postal_code={company.off_postal_code}
              line1={company.off_address_line_1}
              line2={company.off_address_line_2}
              city={company.off_city}
              district={company.off_district}
              state={company.off_state}
              country={company.off_country}
            />
          )}

          {/* Documents */}
          <div className="portal-form-card">
            <div className="portal-form-title">📁 Company Documents</div>
            {downloadError && (
              <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontSize: 12, color: "#f87171", marginBottom: 10 }}>
                {downloadError}
              </div>
            )}
            {docsLoading ? (
              <div style={{ fontSize: 13, color: "var(--c-muted)", opacity: 0.6 }}>Loading documents…</div>
            ) : docs.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--c-muted)", opacity: 0.5 }}>No documents on file.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      {["Type", "Doc. Number", "Issue Date", "Expiry Date", "File"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map(d => (
                      <tr key={d.id}>
                        <td style={{ fontSize: 12, fontWeight: 500 }}>{d.doc_type}</td>
                        <td style={{ fontSize: 12, fontFamily: "monospace" }} className="t-muted">{d.doc_number || "—"}</td>
                        <td style={{ fontSize: 12 }} className="t-muted">{d.issue_date ? String(d.issue_date).slice(0, 10) : "—"}</td>
                        <td style={{ fontSize: 12 }} className="t-muted">
                          {d.expiry_date ? (() => {
                            const dateStr = String(d.expiry_date).slice(0, 10);
                            const status = getExpiryStatus(dateStr);
                            if (status === "expired") {
                              return (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  {dateStr}
                                  <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)", letterSpacing: "0.03em" }}>Expired</span>
                                </span>
                              );
                            }
                            if (status === "expiring_soon") {
                              return (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  {dateStr}
                                  <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.35)", letterSpacing: "0.03em" }}>Expiring soon</span>
                                </span>
                              );
                            }
                            return dateStr;
                          })() : "—"}
                        </td>
                        <td style={{ fontSize: 12 }} className="t-muted">
                          {d.has_file ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(d)}
                              style={{ fontSize: 12, color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 500 }}>
                              📎 {d.file_name ? (d.file_name.length > 24 ? d.file_name.slice(0, 24) + "…" : d.file_name) : "Download"}
                            </button>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div style={{ display: "flex", gap: 24, fontSize: 11, color: "var(--c-muted)", paddingTop: 4 }}>
            {company.created_at && <span>Created: {new Date(company.created_at).toLocaleString()}</span>}
            {company.updated_at && <span>Last updated: {new Date(company.updated_at).toLocaleString()}</span>}
          </div>
        </div>
      </div>
    </OrgLayout>
  );
}
