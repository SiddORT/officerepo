import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const PAGE_SIZE = 20;

function CategoryBadge({ name, icon }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 999,
      background: "rgba(0,174,236,0.08)", color: "var(--c-accent)",
      border: "1px solid rgba(0,174,236,0.2)",
    }}>
      {icon && <span>{icon}</span>}
      {name}
    </span>
  );
}

function SubCatBadge({ name }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 400, padding: "2px 8px", borderRadius: 999,
      background: "var(--c-surface2)", color: "var(--c-muted)",
      border: "1px solid var(--c-border)",
    }}>
      {name}
    </span>
  );
}

export default function AssetCatalog() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    portalAssetApi.metaOptions(subdomain, token)
      .then(r => setCategories(r.data?.data?.categories || []))
      .catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await portalAssetApi.listCatalog(subdomain, token, {
        page, page_size: PAGE_SIZE,
        ...(search ? { search } : {}),
        ...(categoryId ? { category_id: categoryId } : {}),
      });
      setRows(r.data?.data?.data || []);
      setTotal(r.data?.data?.total || 0);
    } catch {
      setError("Failed to load asset catalog.");
    } finally {
      setLoading(false);
    }
  }, [subdomain, token, page, search, categoryId]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);


  return (
    <AssetLayout title="Asset Catalog">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Asset Catalog</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>
            Browse all available asset types — {total} items
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search assets…"
          style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13 }}
        />
        <select
          value={categoryId}
          onChange={e => { setCategoryId(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", fontSize: 13 }}
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.category_name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 14, fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)", marginBottom: 4 }}>No assets found</div>
            <div style={{ fontSize: 12, color: "var(--c-muted)" }}>
              {search || categoryId ? "Try clearing your filters." : "No asset types are defined in the catalog yet."}
            </div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--c-surface2)", borderBottom: "1px solid var(--c-border)" }}>
                {["#", "Asset Code", "Asset Name", "Category", "Sub-category", "Specs"].map(h => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left", fontSize: 11,
                    fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase",
                    letterSpacing: "0.05em", width: h === "#" ? 40 : undefined,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--c-border)" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 14px", width: 40, textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-muted)", border: "1px solid var(--c-border)" }}>
                      {item.asset_code}
                    </span>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{item.asset_name}</div>
                    {item.description && (
                      <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <CategoryBadge name={item.category_name} icon={item.category_icon} />
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {item.sub_category_name ? <SubCatBadge name={item.sub_category_name} /> : <span style={{ color: "var(--c-muted)", fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {item.serial_number_required && (
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(0,174,236,0.08)", color: "var(--c-accent)", border: "1px solid rgba(0,174,236,0.2)", fontWeight: 500 }}>
                          S/N required
                        </span>
                      )}
                      {item.warranty_months > 0 && (
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(34,197,94,0.07)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)", fontWeight: 500 }}>
                          {item.warranty_months}m warranty
                        </span>
                      )}
                      {item.useful_life_years > 0 && (
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)", fontWeight: 500 }}>
                          {item.useful_life_years}y life
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, fontSize: 12, color: "var(--c-muted)" }}>
          <span>{total} total · page {page} of {totalPages}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>
          </div>
        </div>
      )}
    </AssetLayout>
  );
}
