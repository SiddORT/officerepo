import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import { portalEmployeeApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import Badge from "../shared/Badge";
import OrgTreePanel from "./components/OrgTreePanel";

function getExpiryStatus(dateStr) {
  if (!dateStr) return "valid";
  const [year, month, day] = dateStr.split("-").map(Number);
  const expiry = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysLeft = Math.floor((expiry - today) / 86400000);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "expiring_soon";
  return "valid";
}

function InfoRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: value ? "var(--c-text)" : "var(--c-muted)", opacity: value ? 1 : 0.45 }}>
        {value || "—"}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14, paddingBottom: 8, borderBottom: "1px solid var(--c-border)" }}>
      {children}
    </div>
  );
}

function CompanyInitials({ name }) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("");
  const colors = [
    ["#6366f1", "#818cf8"],
    ["#0891b2", "#22d3ee"],
    ["#059669", "#34d399"],
    ["#d97706", "#fbbf24"],
    ["#dc2626", "#f87171"],
    ["#7c3aed", "#a78bfa"],
  ];
  const idx = (name?.charCodeAt(0) || 0) % colors.length;
  const [bg, fg] = colors[idx];
  return (
    <div style={{
      width: 64, height: 64, borderRadius: "50%",
      background: bg, color: fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em",
      flexShrink: 0, boxShadow: `0 0 0 3px var(--c-surface), 0 0 0 5px ${bg}44`,
    }}>
      {initials}
    </div>
  );
}

function StatTile({ icon, value, sub, label, color, href }) {
  const inner = (
    <>
      <div style={{
        width: 38, height: 38, borderRadius: 9,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--c-text)", lineHeight: 1.1 }}>
          {value ?? <span style={{ fontSize: 13, opacity: 0.5 }}>…</span>}
          {sub != null && value != null && (
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--c-muted)", marginLeft: 4 }}>/ {sub}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>{label}</div>
      </div>
    </>
  );

  const base = {
    flex: 1, minWidth: 120,
    background: "var(--c-surface)",
    border: "1px solid var(--c-border)",
    borderRadius: 10,
    padding: "14px 16px",
    display: "flex", alignItems: "center", gap: 12,
    textDecoration: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  };

  if (href) {
    return (
      <Link
        to={href}
        style={base}
        onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 0 2px ${color}22`; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--c-border)"; e.currentTarget.style.boxShadow = "none"; }}
      >
        {inner}
      </Link>
    );
  }

  return <div style={base}>{inner}</div>;
}

const TABS = ["Overview", "Compliance & Tax", "Addresses", "Documents", "Org Tree"];

export default function CompanyDetails() {
  const { subdomain, companyId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [stats, setStats] = useState({ employees: null, activeEmployees: null, departments: null, branches: null, designations: null });

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

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      portalOrgApi.listDepts(subdomain, token, { company_id: companyId, page_size: 1 }),
      portalOrgApi.listBranches(subdomain, token, { company_id: companyId, page_size: 1 }),
      portalOrgApi.listDesigs(subdomain, token, { company_id: companyId, page_size: 1 }),
      portalEmployeeApi.list(subdomain, token, { company_id: companyId, page_size: 1 }),
      portalEmployeeApi.list(subdomain, token, { company_id: companyId, page_size: 1, status: "Active" }),
    ])
      .then(([deptRes, branchRes, desigRes, empRes, activeEmpRes]) => {
        setStats({
          departments:     deptRes.data.data?.total ?? null,
          branches:        branchRes.data.data?.total ?? null,
          designations:    desigRes.data.data?.total ?? null,
          employees:       empRes.data.data?.total ?? null,
          activeEmployees: activeEmpRes.data.data?.total ?? null,
        });
      })
      .catch(() => {});
  }, [subdomain, token, companyId]);

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
  const isActive = company.is_active !== false;

  return (
    <OrgLayout title="Company Details">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Hero strip ──────────────────────────────────────────────── */}
        <div style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 12,
          padding: "20px 24px",
        }}>
          {/* Back link */}
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => navigate(`/portal/${subdomain}/org/companies`)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", fontSize: 12, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
              ← Companies
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            {/* Avatar + names */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 220 }}>
              <CompanyInitials name={company.company_name} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--c-text)", lineHeight: 1.15 }}>
                  {company.company_name}
                </div>
                {company.legal_name && (
                  <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 3 }}>{company.legal_name}</div>
                )}
              </div>
            </div>

            {/* Right cluster */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {company.company_code && (
                <span style={{ fontFamily: "monospace", fontSize: 11, padding: "3px 8px", borderRadius: 5, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)", fontWeight: 600 }}>
                  {company.company_code}
                </span>
              )}
              {company.company_type && (
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 12, background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)", fontWeight: 500 }}>
                  {company.company_type}
                </span>
              )}
              <Badge status={isActive ? "Active" : "Inactive"} />

              <div style={{ width: 1, height: 24, background: "var(--c-border)", margin: "0 4px" }} />

              <Link to={`/portal/${subdomain}/org/companies/${companyId}/edit`} className="btn-primary" style={{ fontSize: 12, padding: "5px 14px" }}>
                Edit
              </Link>

              <div style={{ width: 1, height: 24, background: "var(--c-border)", margin: "0 4px" }} />

              <button
                onClick={() => setActiveTab(4)}
                style={{ fontSize: 12, padding: "5px 12px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                🌳 Org Tree
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat tiles ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StatTile icon="👥" value={stats.activeEmployees} sub={stats.employees} label="Employees" color="#6366f1" href={`/portal/${subdomain}/employees?company_id=${companyId}`} />
          <StatTile icon="🏗️" value={stats.departments} label="Departments" color="#0891b2" href={`/portal/${subdomain}/org/departments?company_id=${companyId}`} />
          <StatTile icon="🏢" value={stats.branches} label="Branches" color="#059669" href={`/portal/${subdomain}/org/branches?company_id=${companyId}`} />
          <StatTile icon="🏷️" value={stats.designations} label="Designations" color="#d97706" href={`/portal/${subdomain}/org/designations?company_id=${companyId}`} />
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--c-border)" }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              style={{
                padding: "10px 18px",
                fontSize: 13, fontWeight: activeTab === i ? 700 : 500,
                color: activeTab === i ? "var(--c-accent)" : "var(--c-muted)",
                background: "none", border: "none", cursor: "pointer",
                borderBottom: activeTab === i ? "2px solid var(--c-accent)" : "2px solid transparent",
                marginBottom: -1, transition: "color 0.15s",
              }}>
              {tab}
            </button>
          ))}
        </div>

        {/* ── Tab 1 — Overview ────────────────────────────────────────── */}
        {activeTab === 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div className="portal-form-card">
              <SectionTitle>General</SectionTitle>
              <div style={{ display: "grid", gap: 14 }}>
                <InfoRow label="Display Name" value={company.display_name} />
                <InfoRow label="Legal / Registered Name" value={company.legal_name} />
                <InfoRow label="Company Type" value={company.company_type} />
                <InfoRow label="Industry" value={company.industry} />
                <InfoRow label="Sub-Industry" value={company.sub_industry} />
                <InfoRow label="Date of Incorporation" value={company.date_of_incorporation} />
                {company.company_description && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Description</div>
                    <div style={{ fontSize: 13, color: "var(--c-text)", lineHeight: 1.6 }}>{company.company_description}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="portal-form-card">
              <SectionTitle>Contact</SectionTitle>
              <div style={{ display: "grid", gap: 14 }}>
                <InfoRow label="Primary Contact Person" value={company.primary_contact_person} />
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
          </div>
        )}

        {/* ── Tab 2 — Compliance & Tax ─────────────────────────────────── */}
        {activeTab === 1 && (
          <div className="portal-form-card">
            <SectionTitle>Compliance & Tax</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
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
        )}

        {/* ── Tab 3 — Addresses ────────────────────────────────────────── */}
        {activeTab === 2 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
            {/* Registered */}
            <div className="portal-form-card">
              <SectionTitle>📍 Registered Address</SectionTitle>
              {!(company.postal_code || company.address_line_1 || company.city) ? (
                <div style={{ fontSize: 13, color: "var(--c-muted)", opacity: 0.5 }}>No address on record.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <InfoRow label="Postal Code" value={company.postal_code} />
                  <InfoRow label="Address Line 1" value={company.address_line_1} />
                  <InfoRow label="Address Line 2" value={company.address_line_2} />
                  <InfoRow label="City" value={company.city} />
                  <InfoRow label="District" value={company.district} />
                  <InfoRow label="State" value={company.state} />
                  <InfoRow label="Country" value={company.country} />
                </div>
              )}
            </div>

            {/* Office */}
            <div className="portal-form-card">
              <SectionTitle>🏬 Office Address</SectionTitle>
              {officeIsSame ? (
                <div>
                  <span style={{ display: "inline-block", fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", fontWeight: 500, marginBottom: 12 }}>
                    Same as Registered
                  </span>
                  {(company.postal_code || company.address_line_1 || company.city) && (
                    <div style={{ display: "grid", gap: 12 }}>
                      <InfoRow label="Postal Code" value={company.postal_code} />
                      <InfoRow label="Address Line 1" value={company.address_line_1} />
                      <InfoRow label="Address Line 2" value={company.address_line_2} />
                      <InfoRow label="City" value={company.city} />
                      <InfoRow label="District" value={company.district} />
                      <InfoRow label="State" value={company.state} />
                      <InfoRow label="Country" value={company.country} />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <InfoRow label="Postal Code" value={company.off_postal_code} />
                  <InfoRow label="Address Line 1" value={company.off_address_line_1} />
                  <InfoRow label="Address Line 2" value={company.off_address_line_2} />
                  <InfoRow label="City" value={company.off_city} />
                  <InfoRow label="District" value={company.off_district} />
                  <InfoRow label="State" value={company.off_state} />
                  <InfoRow label="Country" value={company.off_country} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab 4 — Documents ────────────────────────────────────────── */}
        {activeTab === 3 && (
          <div className="portal-form-card">
            <SectionTitle>📁 Compliance Documents</SectionTitle>
            {downloadError && (
              <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontSize: 12, color: "#f87171", marginBottom: 10 }}>
                {downloadError}
              </div>
            )}
            {!docsLoading && docs.length > 0 && (() => {
              const expiredDocs = docs.filter(d => (d.expiry_status || getExpiryStatus(d.expiry_date ? String(d.expiry_date).slice(0, 10) : null)) === "expired");
              const expiringSoonDocs = docs.filter(d => (d.expiry_status || getExpiryStatus(d.expiry_date ? String(d.expiry_date).slice(0, 10) : null)) === "expiring_soon");
              if (expiredDocs.length === 0 && expiringSoonDocs.length === 0) return null;
              return (
                <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                  {expiredDocs.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 12, color: "#f87171" }}>
                      <span style={{ fontSize: 15 }}>⚠️</span>
                      <span>
                        <strong>{expiredDocs.length} document{expiredDocs.length > 1 ? "s" : ""} expired</strong>
                        {" — "}
                        {expiredDocs.map(d => d.doc_type).join(", ")}. Renew immediately to maintain compliance.
                      </span>
                    </div>
                  )}
                  {expiringSoonDocs.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 7, fontSize: 12, color: "#fbbf24" }}>
                      <span style={{ fontSize: 15 }}>🕐</span>
                      <span>
                        <strong>{expiringSoonDocs.length} document{expiringSoonDocs.length > 1 ? "s" : ""} expiring within 30 days</strong>
                        {" — "}
                        {expiringSoonDocs.map(d => d.doc_type).join(", ")}. Schedule renewal soon.
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
            {docsLoading ? (
              <div style={{ fontSize: 13, color: "var(--c-muted)", opacity: 0.6 }}>Loading documents…</div>
            ) : docs.length === 0 ? (
              <div style={{ fontSize: 13, color: "var(--c-muted)", opacity: 0.5 }}>No documents on file.</div>
            ) : (
              <div className="portal-table-wrap">
                <table className="portal-table">
                  <thead>
                    <tr>
                      {["Type", "Doc. Number", "Issue Date", "Expiry Date", "Status", "File"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map(d => {
                      const dateStr = d.expiry_date ? String(d.expiry_date).slice(0, 10) : null;
                      const status = d.expiry_status || (dateStr ? getExpiryStatus(dateStr) : "valid");
                      return (
                        <tr key={d.id}>
                          <td style={{ fontSize: 12, fontWeight: 500 }}>{d.doc_type}</td>
                          <td style={{ fontSize: 12, fontFamily: "monospace" }} className="t-muted">{d.doc_number || "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">{d.issue_date ? String(d.issue_date).slice(0, 10) : "—"}</td>
                          <td style={{ fontSize: 12 }} className="t-muted">{dateStr || "—"}</td>
                          <td style={{ fontSize: 12 }}>
                            {!dateStr ? (
                              <span style={{ color: "var(--c-muted)", opacity: 0.5 }}>—</span>
                            ) : status === "expired" ? (
                              <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)", letterSpacing: "0.03em" }}>Expired</span>
                            ) : status === "expiring_soon" ? (
                              <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.35)", letterSpacing: "0.03em" }}>Expiring soon</span>
                            ) : (
                              <span style={{ display: "inline-block", padding: "1px 7px", borderRadius: 10, fontSize: 10, fontWeight: 600, background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", letterSpacing: "0.03em" }}>Valid</span>
                            )}
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Tab 5 — Org Tree ─────────────────────────────────────────── */}
        {activeTab === 4 && (
          <div className="portal-form-card">
            <SectionTitle>🌳 Department Hierarchy</SectionTitle>
            <OrgTreePanel subdomain={subdomain} token={token} companyId={companyId} />
          </div>
        )}

        {/* Timestamps */}
        <div style={{ display: "flex", gap: 24, fontSize: 11, color: "var(--c-muted)", paddingTop: 4 }}>
          {company.created_at && <span>Created: {new Date(company.created_at).toLocaleString()}</span>}
          {company.updated_at && <span>Last updated: {new Date(company.updated_at).toLocaleString()}</span>}
        </div>
      </div>
    </OrgLayout>
  );
}
