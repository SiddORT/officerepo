import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { portalAssetMaintenanceApi, portalAssetInventoryApi } from "../../../services/apiClient";

export default function MaintenanceRequestForm() {
  const { subdomain, token } = useOutletContext();
  const navigate = useNavigate();

  const [meta, setMeta] = useState(null);
  const [assetSearch, setAssetSearch] = useState("");
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetDropdown, setAssetDropdown] = useState(false);

  const [form, setForm] = useState({
    maintenance_type: "Corrective Maintenance",
    issue_category: "",
    issue_description: "",
    priority: "Medium",
    reported_date: new Date().toISOString().slice(0,10),
    estimated_downtime_hours: "",
    vendor_name: "",
    vendor_contact: "",
    vendor_support_contract: "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalAssetMaintenanceApi.metaOptions(subdomain, token)
      .then(r => setMeta(r.data?.data || r.data))
      .catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (assetSearch.length < 2) { setAssets([]); return; }
    const t = setTimeout(() => {
      portalAssetInventoryApi.list(subdomain, token, { search: assetSearch, page_size: 10 })
        .then(r => setAssets((r.data?.data || r.data)?.items || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [assetSearch, subdomain, token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) { setError("Please select an asset."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        asset_id: selectedAsset.id,
        estimated_downtime_hours: form.estimated_downtime_hours ? Number(form.estimated_downtime_hours) : undefined,
      };
      const r = await portalAssetMaintenanceApi.create(subdomain, token, payload);
      const id = (r.data?.data || r.data)?.id;
      navigate(`../${id}`);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Failed to create request.");
      setSaving(false);
    }
  };

  const FIELD = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const LABEL = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("..")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">New Maintenance Request</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">

        {/* Asset Selection */}
        <div className="relative">
          <label className={LABEL}>Asset <span className="text-red-500">*</span></label>
          {selectedAsset ? (
            <div className="flex items-center justify-between p-3 border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <div>
                <div className="font-medium text-gray-900 dark:text-white text-sm">{selectedAsset.asset_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{selectedAsset.asset_number} · {selectedAsset.category_name} · <span className={selectedAsset.status === "Under Maintenance" ? "text-orange-600" : ""}>{selectedAsset.status}</span></div>
              </div>
              <button type="button" onClick={() => { setSelectedAsset(null); setAssetSearch(""); }}
                className="text-gray-400 hover:text-red-500 text-sm">✕</button>
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder="Search asset by name or number…"
                value={assetSearch}
                onChange={e => { setAssetSearch(e.target.value); setAssetDropdown(true); }}
                onFocus={() => setAssetDropdown(true)}
                className={FIELD}
              />
              {assetDropdown && assets.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {assets.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setSelectedAsset(a); setAssetDropdown(false); setAssetSearch(""); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{a.asset_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{a.asset_number} · {a.category_name} · {a.status}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Type + Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Maintenance Type <span className="text-red-500">*</span></label>
            <select value={form.maintenance_type} onChange={e => set("maintenance_type", e.target.value)} className={FIELD}>
              {(meta?.maintenance_types || ["Corrective Maintenance","Preventive Maintenance","Breakdown Maintenance","Scheduled Service","Calibration","Warranty Repair","AMC Service"]).map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Priority <span className="text-red-500">*</span></label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)} className={FIELD}>
              {(meta?.priorities || ["Low","Medium","High","Critical"]).map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Issue Category */}
        <div>
          <label className={LABEL}>Issue Category</label>
          <select value={form.issue_category} onChange={e => set("issue_category", e.target.value)} className={FIELD}>
            <option value="">Select category…</option>
            {(meta?.issue_categories || ["Hardware","Software","Electrical","Mechanical","Network","Performance","Calibration","Physical Damage"]).map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Issue Description */}
        <div>
          <label className={LABEL}>Issue Description <span className="text-red-500">*</span></label>
          <textarea
            value={form.issue_description}
            onChange={e => set("issue_description", e.target.value)}
            rows={3}
            placeholder="Describe the issue in detail…"
            required
            className={FIELD}
          />
        </div>

        {/* Reported Date + Estimated Downtime */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Reported Date</label>
            <input type="date" value={form.reported_date} onChange={e => set("reported_date", e.target.value)} className={FIELD} />
          </div>
          <div>
            <label className={LABEL}>Estimated Downtime (hours)</label>
            <input type="number" min="0" step="0.5" value={form.estimated_downtime_hours} onChange={e => set("estimated_downtime_hours", e.target.value)} placeholder="e.g. 4" className={FIELD} />
          </div>
        </div>

        {/* Vendor (optional) */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Vendor / Technician (optional)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Vendor / Technician Name</label>
              <input type="text" value={form.vendor_name} onChange={e => set("vendor_name", e.target.value)} placeholder="Vendor or tech name" className={FIELD} />
            </div>
            <div>
              <label className={LABEL}>Contact</label>
              <input type="text" value={form.vendor_contact} onChange={e => set("vendor_contact", e.target.value)} placeholder="Phone / email" className={FIELD} />
            </div>
          </div>
          <div className="mt-4">
            <label className={LABEL}>Support Contract Number</label>
            <input type="text" value={form.vendor_support_contract} onChange={e => set("vendor_support_contract", e.target.value)} placeholder="Contract or ticket number" className={FIELD} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate("..")}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Creating…" : "Create Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
