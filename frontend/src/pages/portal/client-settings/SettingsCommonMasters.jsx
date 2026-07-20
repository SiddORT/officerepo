import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { portalSettingsApi } from "../../../services/apiClient";

const MASTER_TYPES = [
  { key: "employment_type",  label: "Employment Types" },
  { key: "blood_group",      label: "Blood Groups" },
  { key: "marital_status",   label: "Marital Status" },
  { key: "gender",           label: "Gender" },
  { key: "relationship_type","label": "Relationship Types" },
  { key: "document_type",    label: "Document Types" },
  { key: "language",         label: "Languages" },
  { key: "country",          label: "Countries" },
  { key: "currency",         label: "Currencies" },
];

function MasterTable({ items, onToggle, onEdit, onDelete, isDark }) {
  const th = isDark ? "bg-gray-900 text-gray-400" : "bg-gray-50 text-gray-500";
  const td = isDark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-700";

  if (!items || items.length === 0)
    return <p className={`text-sm py-6 text-center ${isDark ? "text-gray-500" : "text-gray-400"}`}>No items yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={th}>
            <th className="px-4 py-2 text-left text-xs font-medium">Code</th>
            <th className="px-4 py-2 text-left text-xs font-medium">Label</th>
            <th className="px-4 py-2 text-left text-xs font-medium">Order</th>
            <th className="px-4 py-2 text-center text-xs font-medium">Active</th>
            <th className="px-4 py-2 text-right text-xs font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDark ? "divide-gray-700" : "divide-gray-100"}`}>
          {items.map(item => (
            <tr key={item.id} className={isDark ? "hover:bg-gray-750" : "hover:bg-gray-50"}>
              <td className={`px-4 py-2.5 font-mono text-xs ${td}`}>{item.code}</td>
              <td className={`px-4 py-2.5 ${td}`}>{item.label}</td>
              <td className={`px-4 py-2.5 ${td}`}>{item.sort_order}</td>
              <td className="px-4 py-2.5 text-center">
                <button onClick={() => onToggle(item)}
                  className={`w-4 h-4 rounded border flex items-center justify-center mx-auto
                    ${item.is_active
                      ? "bg-blue-600 border-blue-600 text-white"
                      : isDark ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"}`}>
                  {item.is_active && <svg width="10" height="10" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                </button>
              </td>
              <td className="px-4 py-2.5 text-right">
                <button onClick={() => onEdit(item)} className="text-xs text-blue-400 hover:text-blue-300 mr-3">Edit</button>
                <button onClick={() => onDelete(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddEditModal({ item, onSave, onClose, isDark }) {
  const [form, setForm] = useState(item || { code: "", label: "", sort_order: 0, is_active: true });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inp = isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`w-full max-w-sm rounded-xl p-6 shadow-2xl ${isDark ? "bg-gray-800" : "bg-white"}`}>
        <h3 className={`text-base font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          {item?.id ? "Edit Item" : "Add Item"}
        </h3>
        <div className="space-y-3">
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Code *</label>
            <input type="text" value={form.code} onChange={e => set("code", e.target.value)}
              disabled={!!item?.id}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${inp} ${item?.id ? "opacity-50 cursor-not-allowed" : ""}`}
              placeholder="UNIQUE_CODE" />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Label *</label>
            <input type="text" value={form.label} onChange={e => set("label", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${inp}`}
              placeholder="Display label" />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>Sort Order</label>
            <input type="number" value={form.sort_order} onChange={e => set("sort_order", parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none ${inp}`} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => set("is_active", e.target.checked)}
              className="rounded" />
            <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>Active</span>
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onSave(form)} disabled={!form.code || !form.label}
            className="flex-1 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            Save
          </button>
          <button onClick={onClose}
            className={`flex-1 py-2 text-sm rounded-md border ${isDark ? "border-gray-600 text-gray-300" : "border-gray-300 text-gray-600"}`}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsCommonMasters() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const { isDark } = useTheme();

  const [activeType, setActiveType] = useState(MASTER_TYPES[0].key);
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(false);
  const [seeding, setSeeding]       = useState(false);
  const [error, setError]           = useState("");
  const [modal, setModal]           = useState(null); // null | { item: {} }

  const loadItems = useCallback(async (type) => {
    setLoading(true); setError("");
    try {
      const res = await portalSettingsApi.getCommonMasters(subdomain, token, type);
      setItems(res.data?.items || []);
    } catch { setError("Failed to load master data."); }
    finally { setLoading(false); }
  }, [subdomain, token]);

  useEffect(() => { loadItems(activeType); }, [activeType, loadItems]);

  const seed = async () => {
    setSeeding(true);
    try {
      await portalSettingsApi.seedCommonMasters(subdomain, token, activeType);
      await loadItems(activeType);
    } catch { setError("Failed to seed defaults."); }
    finally { setSeeding(false); }
  };

  const saveItem = async (form) => {
    try {
      if (form.id) {
        await portalSettingsApi.updateCommonMaster(subdomain, token, activeType, form.id, form);
      } else {
        await portalSettingsApi.createCommonMaster(subdomain, token, activeType, form);
      }
      setModal(null);
      await loadItems(activeType);
    } catch { setError("Failed to save item."); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await portalSettingsApi.deleteCommonMaster(subdomain, token, activeType, id);
      await loadItems(activeType);
    } catch { setError("Failed to delete item."); }
  };

  const toggleActive = async (item) => {
    try {
      await portalSettingsApi.updateCommonMaster(subdomain, token, activeType, item.id, { is_active: !item.is_active });
      await loadItems(activeType);
    } catch { setError("Failed to update item."); }
  };

  const card = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const tabActive = isDark ? "bg-gray-700 text-white" : "bg-white text-gray-900 shadow-sm";
  const tabInactive = isDark ? "text-gray-400 hover:text-gray-200 hover:bg-gray-750" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100";

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Common Masters</h2>
      </div>
      <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Manage lookup values used across modules (employment types, blood groups, document types, etc.).
      </p>

      {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <div className="flex gap-5 min-h-0">
        {/* Left: master type list */}
        <div className={`w-44 flex-shrink-0 border rounded-lg overflow-hidden ${isDark ? "border-gray-700" : "border-gray-200"}`}>
          {MASTER_TYPES.map(mt => (
            <button key={mt.key} onClick={() => setActiveType(mt.key)}
              className={`w-full text-left px-3 py-2.5 text-sm border-b transition-colors
                ${isDark ? "border-gray-700" : "border-gray-100"}
                ${activeType === mt.key ? tabActive : tabInactive}`}>
              {mt.label}
            </button>
          ))}
        </div>

        {/* Right: table */}
        <div className={`flex-1 border rounded-lg overflow-hidden ${card}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? "border-gray-700" : "border-gray-200"}`}>
            <span className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>
              {MASTER_TYPES.find(m => m.key === activeType)?.label}
              {!loading && <span className={`ml-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>({items.length})</span>}
            </span>
            <div className="flex gap-2">
              <button onClick={seed} disabled={seeding}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors
                  ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
                {seeding ? "Seeding…" : "Seed Defaults"}
              </button>
              <button onClick={() => setModal({ item: null })}
                className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                + Add
              </button>
            </div>
          </div>

          <div className="overflow-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            {loading
              ? <p className={`p-6 text-sm text-center ${isDark ? "text-gray-500" : "text-gray-400"}`}>Loading…</p>
              : <MasterTable items={items} onToggle={toggleActive} onEdit={item => setModal({ item })} onDelete={deleteItem} isDark={isDark} />
            }
          </div>
        </div>
      </div>

      {modal !== null && (
        <AddEditModal item={modal.item} onSave={saveItem} onClose={() => setModal(null)} isDark={isDark} />
      )}
    </div>
  );
}
