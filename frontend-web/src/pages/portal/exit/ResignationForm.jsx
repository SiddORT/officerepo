import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { portalExitApi } from "../../../services/apiClient";

const SEP_TYPES = ["Resignation","Termination","Retirement","Contract Completion","Layoff","End Of Internship","Absconding","Deceased"];
const REASON_CATS = ["Better Opportunity","Relocation","Compensation","Higher Education","Personal Reasons","Work Environment","Career Change","Other"];

export default function ResignationForm({ editMode = false }) {
  const { subdomain, resignationId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    employee_id: "",
    separation_type: "Resignation",
    resignation_date: "",
    requested_last_working_day: "",
    reason_category: "",
    reason_description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (editMode && resignationId) {
      portalExitApi.getResignation(subdomain, resignationId)
        .then(r => {
          const d = r.data;
          setForm({
            employee_id: d.employee_id || "",
            separation_type: d.separation_type || "Resignation",
            resignation_date: d.resignation_date || "",
            requested_last_working_day: d.requested_last_working_day || "",
            reason_category: d.reason_category || "",
            reason_description: d.reason_description || "",
          });
        })
        .catch(console.error);
    }
  }, [editMode, resignationId, subdomain]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      if (editMode) {
        await portalExitApi.updateResignation(subdomain, resignationId, form);
        navigate(`/portal/${subdomain}/hrms/exit/resignations/${resignationId}`);
      } else {
        const res = await portalExitApi.createResignation(subdomain, form);
        navigate(`/portal/${subdomain}/hrms/exit/resignations/${res.data.id}`);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {editMode ? "Edit Resignation" : "New Resignation Request"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Submit an employee separation request
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Employee ID *</label>
          <input required className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
            value={form.employee_id} onChange={e => set("employee_id", e.target.value)}
            placeholder="Enter employee ID" disabled={editMode} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Separation Type *</label>
          <select required className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
            value={form.separation_type} onChange={e => set("separation_type", e.target.value)}>
            {SEP_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Resignation Date *</label>
            <input required type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
              value={form.resignation_date} onChange={e => set("resignation_date", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Requested Last Working Day *</label>
            <input required type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
              value={form.requested_last_working_day} onChange={e => set("requested_last_working_day", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Reason Category</label>
          <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
            value={form.reason_category} onChange={e => set("reason_category", e.target.value)}>
            <option value="">Select reason</option>
            {REASON_CATS.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Reason Description</label>
          <textarea rows={3} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
            value={form.reason_description} onChange={e => set("reason_description", e.target.value)}
            placeholder="Provide additional context…" />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : (editMode ? "Update" : "Create Request")}
          </button>
        </div>
      </form>
    </div>
  );
}
