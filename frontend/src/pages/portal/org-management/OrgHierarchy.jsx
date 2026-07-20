import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalOrgApi } from "../../../services/apiClient";
import OrgLayout from "./OrgLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import OrgTreePanel from "./components/OrgTreePanel";

export default function OrgHierarchy() {
  const { subdomain, companyId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    portalOrgApi.hierarchy(subdomain, token, companyId)
      .then(r => setData(r.data.data))
      .catch(e => setError(e?.response?.data?.detail || "Failed to load hierarchy."))
      .finally(() => setLoading(false));
  }, [subdomain, token, companyId]);

  const sectionHeader = (title, count) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--c-text)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</span>
      <span className="t-muted" style={{ fontSize: 11 }}>{count} total</span>
    </div>
  );

  return (
    <OrgLayout title="Org Hierarchy">
      <div style={{ maxWidth: 800 }}>
        <PageHeader
          title={data?.company?.company_name || "Organization Hierarchy"}
          subtitle="Department tree and designations"
          actions={
            <button onClick={() => navigate(-1)} className="btn-secondary">
              ← Back
            </button>
          }
        />

        {loading && <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>}
        {error && <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>{error}</div>}

        {data && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Department Tree */}
            <div className="portal-table-wrap">
              {sectionHeader("Departments", data.department_tree?.length ?? 0)}
              <div style={{ padding: 14 }}>
                <OrgTreePanel subdomain={subdomain} token={token} companyId={companyId} />
              </div>
            </div>

            {/* Designations */}
            <div className="portal-table-wrap">
              {sectionHeader("Designations", data.designations?.length ?? 0)}
              {!data.designations || data.designations.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>No designations yet.</div>
              ) : (
                <table className="portal-table">
                  <thead>
                    <tr>
                      {["Code", "Designation", "Level", "Status"].map(h => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.designations.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>{d.designation_code}</span>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{d.designation_name}</td>
                        <td>
                          {d.level != null
                            ? <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-accent)", border: "1px solid var(--c-border)" }}>L{d.level}</span>
                            : <span className="t-muted" style={{ fontSize: 12, opacity: 0.5 }}>—</span>}
                        </td>
                        <td>
                          <Badge status={d.is_active ? "Active" : "Inactive"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </OrgLayout>
  );
}
