import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetReturnApi, portalAssetApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const RETURN_TYPES   = ["Full Return", "Partial Return", "Temporary Assignment Return", "Replacement Return"];
const RETURN_SOURCES = ["Employee Exit", "Replacement Request", "Temporary Assignment Expiry", "Manual Return", "Transfer Request"];
const RETURN_REASONS = ["Employee Exit", "Project Completed", "Asset Upgrade", "Temporary Assignment Ended", "Replacement Requested", "Asset No Longer Required"];

export default function ReturnForm() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    assignment_id: searchParams.get("assignment_id") || "",
    return_type: "Full Return",
    return_source: "Manual Return",
    return_reason: "",
    requested_return_date: "",
    remarks: "",
  });

  // Load active assignments
  useEffect(() => {
    setLoadingAssignments(true);
    portalAssetApi.listAssignments(subdomain, token, { status: "Active", page: 1, page_size: 100 })
      .then(r => setAssignments(r.data.data?.items || []))
      .catch(() => setAssignments([]))
      .finally(() => setLoadingAssignments(false));
  }, [subdomain, token]);

  const selectedAssignment = assignments.find(a => a.id === form.assignment_id);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assignment_id) { setError("Please select an assignment."); return; }
    if (!form.return_type)   { setError("Return type is required."); return; }
    setError("");
    setSaving(true);
    try {
      const res = await portalAssetReturnApi.create(subdomain, token, form);
      const returnId = res.data.data?.id;
      navigate(`/portal/${subdomain}/assets/returns/${returnId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create return request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AssetLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/portal/${subdomain}/assets/returns`)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">New Return Request</h1>
            <p className="text-sm text-gray-500">Initiate an asset return</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Assignment selection */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Select Assignment</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Active Assignment <span className="text-red-500">*</span>
              </label>
              {loadingAssignments ? (
                <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.assignment_id}
                  onChange={e => set("assignment_id", e.target.value)}
                  required
                >
                  <option value="">— Select an assignment —</option>
                  {assignments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.asset?.asset_name || a.asset_id} — {a.employee_name || a.assignee_name} ({a.assignment_number})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Assignment preview */}
            {selectedAssignment && (
              <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1 border border-blue-100">
                <div className="flex justify-between">
                  <span className="text-gray-500">Asset</span>
                  <span className="font-medium text-gray-800">
                    {selectedAssignment.asset?.asset_name || "—"}{" "}
                    <span className="text-gray-400 font-normal">({selectedAssignment.asset?.asset_number || ""})</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned To</span>
                  <span className="font-medium text-gray-800">{selectedAssignment.employee_name || selectedAssignment.assignee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Assigned Date</span>
                  <span className="text-gray-700">{selectedAssignment.assigned_date || "—"}</span>
                </div>
                {selectedAssignment.expected_return_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expected Return</span>
                    <span className="text-gray-700">{selectedAssignment.expected_return_date}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Return details */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Return Details</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Return Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.return_type}
                  onChange={e => set("return_type", e.target.value)}
                  required
                >
                  {RETURN_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Source</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.return_source}
                  onChange={e => set("return_source", e.target.value)}
                >
                  {RETURN_SOURCES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Return Reason</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  value={form.return_reason}
                  onChange={e => set("return_reason", e.target.value)}
                >
                  <option value="">— Select reason —</option>
                  {RETURN_REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Requested Return Date</label>
                <input
                  type="date"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.requested_return_date}
                  onChange={e => set("requested_return_date", e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Remarks</label>
              <textarea
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Any additional notes…"
                value={form.remarks}
                onChange={e => set("remarks", e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate(`/portal/${subdomain}/assets/returns`)}
              className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create Return Request"}
            </button>
          </div>
        </form>
      </div>
    </AssetLayout>
  );
}
