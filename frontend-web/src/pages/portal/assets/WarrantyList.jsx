import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetMaintenanceApi, portalAssetInventoryApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const STATUS_COLOR = {
  Active:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Expired:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Extended: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function WarrantyList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Create / Edit modal
  const [modal, setModal] = useState(null); // null | "create" | "edit"
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Asset search for create
  const [assetSearch, setAssetSearch] = useState("");
  const [assetResults, setAssetResults] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    portalAssetMaintenanceApi.listWarranties(subdomain, token, {
      page, page_size: PAGE_SIZE, status: filterStatus || undefined,
    }).then(r => {
      const d = r.data?.data || r.data;
      setItems(d.items || []);
      setTotal(d.total || 0);
    }).catch(() => setError("Failed to load warranties."))
      .finally(() => setLoading(false));
  }, [subdomain, token, page, filterStatus]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (assetSearch.length < 2) { setAssetResults([]); return; }
    const t = setTimeout(() => {
      portalAssetInventoryApi.list(subdomain, token, { search: assetSearch, page_size: 10 })
        .then(r => setAssetResults((r.data?.data || r.data)?.items || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [assetSearch, subdomain, token]);

  const openCreate = () => {
    setEditing(null);
    setSelectedAsset(null);
    setAssetSearch("");
    setForm({ status: "Active" });
    setFormError("");
    setModal("create");
  };

  const openEdit = (item) => {
    setEditing(item);
    setSelectedAsset({ id: item.asset_id, asset_name: item.asset_name, asset_number: item.asset_number });
    setForm({ ...item });
    setFormError("");
    setModal("edit");
  };

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (modal === "create" && !selectedAsset) { setFormError("Please select an asset."); return; }
    setSaving(true);
    setFormError("");
    try {
      if (modal === "create") {
        await portalAssetMaintenanceApi.createWarranty(subdomain, token, { ...form, asset_id: selectedAsset.id });
      } else {
        await portalAssetMaintenanceApi.updateWarranty(subdomain, token, editing.id, form);
      }
      setModal(null);
      load();
    } catch (err) {
      setFormError(err.response?.data?.detail || err.response?.data?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const INPUT = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const LABEL = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5";

  return (
    <AssetLayout title="Warranty Management">
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Warranty Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track asset warranties and expiry alerts</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <span className="text-lg leading-none">+</span> Add Warranty
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {["Active","Expired","Extended"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {error && <div className="p-4 text-red-500 text-sm">{error}</div>}
        {loading ? (
          <div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-2">🛡️</div>
            <p className="text-gray-500 dark:text-gray-400">No warranty records found.</p>
            <button onClick={openCreate} className="mt-3 text-blue-600 dark:text-blue-400 text-sm hover:underline">Add first warranty →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {["Asset","Warranty Provider","Start Date","End Date","Days Left","Status",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {items.map(item => {
                  const days = daysUntil(item.warranty_end_date);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{item.asset_name || "—"}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{item.asset_number}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{item.warranty_provider || "—"}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{item.warranty_start_date || "—"}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">{item.warranty_end_date || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {days != null ? (
                          <span className={days <= 30 ? "text-red-600 dark:text-red-400 font-medium" : days <= 90 ? "text-yellow-600 dark:text-yellow-400" : "text-gray-600 dark:text-gray-400"}>
                            {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d`}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[item.status] || ""}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(item)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>{total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40">←</button>
              <span className="px-2 py-1">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {modal === "create" ? "Add Warranty" : "Edit Warranty"}
            </h3>
            <div className="space-y-3">
              {/* Asset selector for create */}
              {modal === "create" && (
                <div className="relative">
                  <label className={LABEL}>Asset *</label>
                  {selectedAsset ? (
                    <div className="flex items-center justify-between p-2.5 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <span className="text-sm text-gray-900 dark:text-white">{selectedAsset.asset_name} ({selectedAsset.asset_number})</span>
                      <button type="button" onClick={() => { setSelectedAsset(null); setAssetSearch(""); }} className="text-gray-400 hover:text-red-500">✕</button>
                    </div>
                  ) : (
                    <div>
                      <input type="text" placeholder="Search asset…" value={assetSearch} onChange={e => setAssetSearch(e.target.value)} className={INPUT} />
                      {assetResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {assetResults.map(a => (
                            <button key={a.id} type="button" onClick={() => { setSelectedAsset(a); setAssetSearch(""); setAssetResults([]); }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                              {a.asset_name} ({a.asset_number})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {modal === "edit" && (
                <div>
                  <label className={LABEL}>Asset</label>
                  <div className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg">{form.asset_name}</div>
                </div>
              )}
              <div>
                <label className={LABEL}>Warranty Provider</label>
                <input type="text" value={form.warranty_provider || ""} onChange={e => setF("warranty_provider", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Vendor Contact</label>
                <input type="text" value={form.vendor_contact || ""} onChange={e => setF("vendor_contact", e.target.value)} className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={LABEL}>Start Date</label>
                  <input type="date" value={form.warranty_start_date || ""} onChange={e => setF("warranty_start_date", e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label className={LABEL}>End Date</label>
                  <input type="date" value={form.warranty_end_date || ""} onChange={e => setF("warranty_end_date", e.target.value)} className={INPUT} />
                </div>
              </div>
              <div>
                <label className={LABEL}>Status</label>
                <select value={form.status || "Active"} onChange={e => setF("status", e.target.value)} className={INPUT}>
                  {["Active","Expired","Extended"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className={LABEL}>Coverage Details</label>
                <textarea rows={2} value={form.coverage_details || ""} onChange={e => setF("coverage_details", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Claim Process</label>
                <textarea rows={2} value={form.claim_process || ""} onChange={e => setF("claim_process", e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Notes</label>
                <textarea rows={2} value={form.notes || ""} onChange={e => setF("notes", e.target.value)} className={INPUT} />
              </div>
            </div>
            {formError && <p className="text-red-500 text-sm mt-2">{formError}</p>}
            <div className="flex gap-3 mt-4">
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </AssetLayout>
  );
}
