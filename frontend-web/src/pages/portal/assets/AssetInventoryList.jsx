import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import Pagination from "../shared/Pagination";

const PAGE_SIZE = 20;

function WarrantyBadge({ days }) {
  if (days === null || days === undefined) return <span className="t-muted" style={{ fontSize: 11 }}>—</span>;
  if (days < 0) return <span style={{ fontSize: 11, color: "#ef4444", fontWeight: 600 }}>Expired</span>;
  if (days <= 30) return <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>{days}d left</span>;
  return <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>{days}d left</span>;
}

export default function AssetInventoryList() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const { token } = usePortalAuth();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    portalAssetApi.metaOptions(subdomain, token).then(r => {
      setCategories(r.data?.data?.categories || []);
    }).catch(() => {});
    portalAssetApi.inventoryMeta(subdomain, token).then(r => {
      setStatuses(r.data?.data?.statuses || []);
    }).catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(() => {
    setLoading(true);
    portalAssetApi.listInventory(subdomain, token, {
      page, page_size: PAGE_SIZE, search: search || undefined,
      status: status || undefined, category_id: categoryId || undefined,
    }).then(r => {
      const d = r.data?.data || {};
      setRows(d.items || []);
      setTotal(d.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [subdomain, token, page, search, status, categoryId]);

  useEffect(() => { load(); }, [load]);

  return (
    <AssetLayout title="Asset Inventory">
      <PageHeader
        title="Asset Inventory"
        subtitle={`${total} assets total`}
        actions={
          <button
            onClick={() => navigate(`/portal/${subdomain}/assets/inventory/new`)}
            className="btn-primary"
          >
            + Add Asset
          </button>
        }
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by number, name, serial…" className="input-field" style={{ flex: 1, minWidth: 200 }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="input-field" style={{ minWidth: 140 }}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setPage(1); }} className="input-field" style={{ minWidth: 140 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="portal-table-wrap">
        <div style={{ overflowX: "auto" }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>Sr.</th>
                <th>Asset #</th>
                <th>Name</th>
                <th>Category</th>
                <th>Branch</th>
                <th>Assigned To</th>
                <th>Status</th>
                <th>Warranty</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 32 }} className="t-muted">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 40 }} className="t-muted">
                  No assets found. Add your first asset to get started.
                </td></tr>
              ) : rows.map((r, idx) => (
                <tr key={r.id} onClick={() => navigate(`/portal/${subdomain}/assets/inventory/${r.id}`)}>
                  <td style={{ textAlign: "center" }} className="t-muted">
                    {(page - 1) * PAGE_SIZE + idx + 1}
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700 }} className="t-accent">{r.asset_number}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.asset_name}</div>
                    {r.brand && <div style={{ fontSize: 11 }} className="t-muted">{r.brand}{r.model_number ? ` · ${r.model_number}` : ""}</div>}
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>{r.category_name || "—"}</div>
                    {r.sub_category_name && <div style={{ fontSize: 11 }} className="t-muted">{r.sub_category_name}</div>}
                  </td>
                  <td style={{ fontSize: 12 }}>{r.branch_name || "—"}</td>
                  <td style={{ fontSize: 12 }}>{r.assigned_employee_name || <span className="t-muted">—</span>}</td>
                  <td><Badge status={r.status} /></td>
                  <td>
                    {r.warranty_available ? <WarrantyBadge days={r.warranty_days_remaining} /> : <span className="t-muted" style={{ fontSize: 11 }}>—</span>}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/portal/${subdomain}/assets/inventory/${r.id}`); }}
                        className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }}>
                        View
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/portal/${subdomain}/assets/inventory/${r.id}/edit`); }}
                        className="btn-secondary t-accent" style={{ padding: "4px 10px", fontSize: 11 }}>
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={PAGE_SIZE} />
      </div>
    </AssetLayout>
  );
}
