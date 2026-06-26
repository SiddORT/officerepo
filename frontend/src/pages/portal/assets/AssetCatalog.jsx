import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const PAGE_SIZE = 20;

export default function AssetCatalog() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
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

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <AssetLayout title="Asset Catalog">
      <PageHeader
        title="Asset Catalog"
        subtitle={`Browse all available asset types — ${total} items`}
        actions={
          <button
            onClick={() => navigate(`/portal/${subdomain}/assets/catalog/new`)}
            className="btn-primary"
          >
            + Add Asset
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search assets…"
          className="input-field"
          style={{ flex: 1, minWidth: 180 }}
        />
        <select
          value={categoryId}
          onChange={e => { setCategoryId(e.target.value); setPage(1); }}
          className="input-field"
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
      <div className="portal-table-wrap">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }} className="t-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No assets found</div>
            <div style={{ fontSize: 12 }} className="t-muted">
              {search || categoryId ? "Try clearing your filters." : "No asset types are defined in the catalog yet."}
            </div>
          </div>
        ) : (
          <table className="portal-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Asset Code</th>
                <th>Asset Name</th>
                <th>Category</th>
                <th>Sub-category</th>
                <th>Specs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, i) => (
                <tr key={item.id}>
                  <td style={{ textAlign: "center" }} className="t-muted">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", border: "1px solid var(--c-border)" }} className="t-muted">
                      {item.asset_code}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.asset_name}</div>
                    {item.description && (
                      <div style={{ fontSize: 11, marginTop: 1, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="t-muted">
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {item.category_icon && <span>{item.category_icon}</span>}
                      <span>{item.category_name}</span>
                    </div>
                  </td>
                  <td>
                    {item.sub_category_name ? <Badge status="neutral" label={item.sub_category_name} /> : <span className="t-muted">—</span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {item.serial_number_required && (
                        <span className="badge-info" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>
                          S/N required
                        </span>
                      )}
                      {item.warranty_months > 0 && (
                        <span className="badge-active" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>
                          {item.warranty_months}m warranty
                        </span>
                      )}
                      {item.useful_life_years > 0 && (
                        <span className="badge-warning" style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>
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

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>
    </AssetLayout>
  );
}
