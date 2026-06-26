import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { assetMgmtApi } from "../../../services/apiClient";

const PAGE_SIZE = 20;

function StatusBadge({ active }) {
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
      background: active ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
      color: active ? "#4ade80" : "#9ca3af",
      border: `1px solid ${active ? "rgba(34,197,94,0.2)" : "rgba(156,163,175,0.2)"}` }}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function BoolBadge({ value, label }) {
  return value ? (
    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)", fontWeight: 500 }}>{label}</span>
  ) : null;
}

const sel = { padding: "8px 12px", borderRadius: 8, fontSize: 13, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)", cursor: "pointer" };

export default function AssetMasterList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [catFilter, setCatFilter] = useState("");
  const [scFilter, setScFilter] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  useEffect(() => {
    assetMgmtApi.metaOptions().then(r => {
      setCategories(r.data.data.categories || []);
      setSubCategories(r.data.data.sub_categories || []);
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await assetMgmtApi.listMasters({
        category_id: catFilter || undefined,
        sub_category_id: scFilter || undefined,
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setRows(res.data.data.data || []);
      setTotal(res.data.data.total || 0);
    } catch { setError("Failed to load asset masters."); }
    finally { setLoading(false); }
  }, [catFilter, scFilter, search, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const filteredSubCats = catFilter
    ? subCategories.filter(s => s.category_id === catFilter)
    : subCategories;

  const toggleStatus = async (m, e) => {
    e.stopPropagation();
    try {
      if (m.is_active) await assetMgmtApi.deactivateMaster(m.id);
      else await assetMgmtApi.activateMaster(m.id);
      showToast(`Asset master ${m.is_active ? "deactivated" : "activated"}.`);
      load();
    } catch (err) { setError(err.response?.data?.detail || "Action failed."); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#22c55e", color: "#fff", padding: "10px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast}</div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Asset Masters</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>Global templates shared across all clients</p>
        </div>
        <button onClick={() => navigate("/superadmin/assets/masters/new")}
          style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>
          + Add Asset Master
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by code, name, brand…"
          style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 8, fontSize: 13, background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
        />
        <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setScFilter(""); setPage(1); }} style={sel}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ""}{c.category_name}</option>)}
        </select>
        <select value={scFilter} onChange={e => { setScFilter(e.target.value); setPage(1); }} style={sel}>
          <option value="">All Sub-categories</option>
          {filteredSubCats.map(s => <option key={s.id} value={s.id}>{s.sub_category_name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={sel}>
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}

      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🖥️</div>
            <div style={{ fontWeight: 600, color: "var(--c-text)", marginBottom: 6 }}>No asset masters found</div>
            <div style={{ fontSize: 12, marginBottom: 14 }}>
              {search || statusFilter || catFilter ? "Try adjusting your filters." : "Add your first asset master."}
            </div>
            {!search && !statusFilter && !catFilter && (
              <button onClick={() => navigate("/superadmin/assets/masters/new")}
                style={{ padding: "8px 16px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                + Add Asset Master
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 750 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
                  {["#", "Asset", "Code", "Category", "Brand / Model", "Tracking", "Status", ""].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: h === "#" ? "center" : "left", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((m, i) => (
                  <tr key={m.id}
                    style={{ borderBottom: "1px solid var(--c-border)", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                    onClick={() => navigate(`/superadmin/assets/masters/${m.id}`)}>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)" }}>{m.asset_name}</div>
                      {m.sub_category_name && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>{m.sub_category_name}</div>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontFamily: "monospace", padding: "2px 6px", borderRadius: 4, background: "var(--c-surface2)", color: "var(--c-text2)", border: "1px solid var(--c-border)" }}>{m.asset_code}</span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--c-text2)" }}>{m.category_name || <span style={{ opacity: 0.4 }}>—</span>}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontSize: 13, color: "var(--c-text)" }}>{m.brand || <span style={{ opacity: 0.4 }}>—</span>}</div>
                      {m.model_number && <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{m.model_number}</div>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <BoolBadge value={m.serial_number_required} label="S/N" />
                        <BoolBadge value={m.warranty_tracking_enabled} label="Warranty" />
                        <BoolBadge value={m.maintenance_tracking_enabled} label="Maint." />
                        {!m.serial_number_required && !m.warranty_tracking_enabled && !m.maintenance_tracking_enabled && (
                          <span style={{ opacity: 0.4, fontSize: 11 }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}><StatusBadge active={m.is_active} /></td>
                    <td style={{ padding: "12px 16px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/superadmin/assets/masters/${m.id}`); }}
                          style={{ fontSize: 12, padding: "4px 10px", borderRadius: 5, border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text2)", cursor: "pointer" }}>
                          View
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/superadmin/assets/masters/${m.id}/edit`); }}
                          style={{ fontSize: 12, padding: "4px 10px", borderRadius: 5, border: "1px solid var(--c-border)", background: "transparent", color: "var(--c-text2)", cursor: "pointer" }}>
                          Edit
                        </button>
                        <button
                          onClick={e => toggleStatus(m, e)}
                          style={{ fontSize: 12, padding: "4px 10px", borderRadius: 5, border: `1px solid ${m.is_active ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`, background: "transparent", color: m.is_active ? "#f87171" : "#4ade80", cursor: "pointer" }}>
                          {m.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, fontSize: 13, color: "var(--c-text2)" }}>
        <span>{total} total · page {page} of {totalPages}</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text2)", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>
            ← Prev
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-surface)", color: "var(--c-text2)", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
