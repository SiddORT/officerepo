import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetTransferApi, portalAssetAssignmentApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const TRANSFER_TYPES = [
  "Employee Transfer",
  "Department Transfer",
  "Branch Transfer",
  "Company Transfer",
  "Temporary Transfer",
];

const TRANSFER_REASONS = [
  "Employee Exit",
  "Role Change",
  "Department Change",
  "Branch Relocation",
  "Replacement",
  "Temporary Requirement",
];

export default function TransferForm() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments]   = useState([]);
  const [loadingAsgn, setLoadingAsgn]   = useState(true);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  const [form, setForm] = useState({
    from_assignment_id: "",
    to_assignee_name: "",
    to_employee_name: "",
    to_assignee_type: "Employee",
    to_branch_name: "",
    to_department_name: "",
    transfer_type: "Employee Transfer",
    transfer_reason: "",
    is_temporary: false,
    expected_return_date: "",
    transfer_date: "",
    remarks: "",
  });

  useEffect(() => {
    portalAssetAssignmentApi.list(subdomain, token, { status: "Active", page_size: 200 })
      .then(r => setAssignments(r.data.data?.items || []))
      .catch(() => {})
      .finally(() => setLoadingAsgn(false));
  }, [subdomain, token]);

  const selected = assignments.find(a => a.id === form.from_assignment_id);

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.from_assignment_id) { setError("Please select a source assignment."); return; }
    if (!form.to_assignee_name && !form.to_employee_name) {
      setError("Please enter the target assignee name."); return;
    }
    if (form.is_temporary && !form.expected_return_date) {
      setError("Expected return date is required for temporary transfers."); return;
    }

    const payload = {
      ...form,
      to_assignee_name: form.to_assignee_name || form.to_employee_name,
      to_employee_name: form.to_employee_name || form.to_assignee_name,
      is_temporary: form.is_temporary,
      transfer_type: form.is_temporary ? "Temporary Transfer" : form.transfer_type,
    };

    setSaving(true);
    try {
      const res = await portalAssetTransferApi.create(subdomain, token, payload);
      const id = res.data.data?.id;
      navigate(`/portal/${subdomain}/assets/transfers/${id}`);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create transfer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AssetLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/portal/${subdomain}/assets/transfers`)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">New Transfer Request</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Initiate an asset transfer to another assignee</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Source Assignment */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Source Assignment</h2>
            {loadingAsgn ? (
              <p className="text-sm text-gray-400">Loading active assignments…</p>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-amber-600">No active assignments found. Only active assignments can be transferred.</p>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Assignment <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.from_assignment_id}
                  onChange={e => set("from_assignment_id", e.target.value)}
                  required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Select an active assignment —</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.asset_name} ({a.asset_number}) — {a.assignee_name || a.employee_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selected assignment preview */}
            {selected && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm space-y-1">
                <div className="font-medium text-blue-800">{selected.asset_name}</div>
                <div className="text-blue-600">#{selected.asset_number} · {selected.category_name || "—"}</div>
                <div className="text-blue-600">Currently assigned to: <strong>{selected.assignee_name || selected.employee_name}</strong></div>
                {selected.assigned_date && (
                  <div className="text-blue-500 text-xs">Assigned on {selected.assigned_date}</div>
                )}
              </div>
            )}
          </div>

          {/* Transfer Classification */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Transfer Type</h2>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_temporary}
                  onChange={e => set("is_temporary", e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-purple-600"
                />
                <span className="font-medium">Temporary Transfer</span>
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">(asset returns to original assignee after end date)</span>
            </div>

            {!form.is_temporary && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transfer Type</label>
                <select
                  value={form.transfer_type}
                  onChange={e => set("transfer_type", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {TRANSFER_TYPES.filter(t => t !== "Temporary Transfer").map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
              <select
                value={form.transfer_reason}
                onChange={e => set("transfer_reason", e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— Select reason —</option>
                {TRANSFER_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Destination */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Destination</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Target Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.to_assignee_name}
                  onChange={e => { set("to_assignee_name", e.target.value); set("to_employee_name", e.target.value); }}
                  placeholder="Employee / Dept / Branch name"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assignee Type</label>
                <select
                  value={form.to_assignee_type}
                  onChange={e => set("to_assignee_type", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {["Employee","Department","Branch","Company"].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch (optional)</label>
                <input
                  type="text"
                  value={form.to_branch_name}
                  onChange={e => set("to_branch_name", e.target.value)}
                  placeholder="Target branch name"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department (optional)</label>
                <input
                  type="text"
                  value={form.to_department_name}
                  onChange={e => set("to_department_name", e.target.value)}
                  placeholder="Target department name"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Schedule</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Transfer Date</label>
                <input
                  type="date"
                  value={form.transfer_date}
                  onChange={e => set("transfer_date", e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {form.is_temporary && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expected Return Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.expected_return_date}
                    onChange={e => set("expected_return_date", e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
              <textarea
                rows={3}
                value={form.remarks}
                onChange={e => set("remarks", e.target.value)}
                placeholder="Additional notes or context…"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create Transfer Request"}
            </button>
            <button
              type="button"
              onClick={() => navigate(`/portal/${subdomain}/assets/transfers`)}
              className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </AssetLayout>
  );
}
