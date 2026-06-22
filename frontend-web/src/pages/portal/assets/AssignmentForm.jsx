import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalNavContext";
import { portalAssetApi } from "../../../services/apiClient";

const ASSIGNEE_TYPES   = ["Employee", "Department", "Branch", "Company"];
const ASSIGNMENT_TYPES = ["Permanent", "Temporary", "Project"];
const SOURCES          = ["Manual Assignment", "Employee Onboarding", "Replacement", "Transfer", "Temporary Assignment", "Project Assignment"];
const CONDITIONS       = ["New", "Good", "Fair"];

export default function AssignmentForm() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({
    asset_id: "",
    assignee_type: "Employee",
    assignee_id: "",
    assignee_name: "",
    employee_code: "",
    assignment_type: "Permanent",
    assignment_source: "Manual Assignment",
    assigned_date: new Date().toISOString().split("T")[0],
    expected_return_date: "",
    condition_on_assign: "Good",
    assignment_notes: "",
    request_id: searchParams.get("request_id") || "",
  });

  const [assets, setAssets] = useState([]);
  const [assetSearch, setAssetSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalAssetApi.listInventory(subdomain, token, { status: "Available", page: 1, page_size: 50, search: assetSearch })
      .then(r => setAssets(r.data.items || []))
      .catch(console.error);
  }, [subdomain, token, assetSearch]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.asset_id) { setError("Please select an asset."); return; }
    if (!form.assignee_name) { setError("Assignee name is required."); return; }
    setSaving(true); setError("");
    try {
      const res = await portalAssetApi.createAssignment(subdomain, token, form);
      navigate(`/portal/${subdomain}/assets/assignments/${res.data.id}`);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to create assignment.");
    } finally { setSaving(false); }
  };

  const selectedAsset = assets.find(a => a.id === form.asset_id);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Assign Asset</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new asset assignment</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">

        {/* Asset Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Asset * (Available only)</label>
          <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm mb-2 bg-white dark:bg-gray-700 dark:text-white"
            placeholder="Search available assets…" value={assetSearch} onChange={e => setAssetSearch(e.target.value)} />
          <select required className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
            value={form.asset_id} onChange={e => set("asset_id", e.target.value)}>
            <option value="">Select an asset</option>
            {assets.map(a => (
              <option key={a.id} value={a.id}>
                {a.asset_number} — {a.asset_name} {a.brand ? `(${a.brand})` : ""} {a.serial_number ? `· SN:${a.serial_number}` : ""}
              </option>
            ))}
          </select>
          {selectedAsset && (
            <p className="text-xs text-gray-400 mt-1">
              {selectedAsset.category_name} · {selectedAsset.brand} {selectedAsset.model_number}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assignee Type *</label>
            <select required className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
              value={form.assignee_type} onChange={e => set("assignee_type", e.target.value)}>
              {ASSIGNEE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assignee Name *</label>
            <input required className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
              value={form.assignee_name} onChange={e => set("assignee_name", e.target.value)}
              placeholder={form.assignee_type === "Employee" ? "Employee name" : `${form.assignee_type} name`} />
          </div>
        </div>

        {form.assignee_type === "Employee" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Employee ID</label>
              <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                value={form.assignee_id} onChange={e => set("assignee_id", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Employee Code</label>
              <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                value={form.employee_code} onChange={e => set("employee_code", e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assignment Type</label>
            <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
              value={form.assignment_type} onChange={e => set("assignment_type", e.target.value)}>
              {ASSIGNMENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assignment Source</label>
            <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
              value={form.assignment_source} onChange={e => set("assignment_source", e.target.value)}>
              {SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Assigned Date *</label>
            <input required type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
              value={form.assigned_date} onChange={e => set("assigned_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Expected Return (blank = permanent)</label>
            <input type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
              value={form.expected_return_date} onChange={e => set("expected_return_date", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Condition of Asset</label>
          <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
            value={form.condition_on_assign} onChange={e => set("condition_on_assign", e.target.value)}>
            {CONDITIONS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea rows={2} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
            value={form.assignment_notes} onChange={e => set("assignment_notes", e.target.value)} />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Cancel</button>
          <button type="submit" disabled={saving}
            className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50">
            {saving ? "Assigning…" : "Assign Asset"}
          </button>
        </div>
      </form>
    </div>
  );
}
