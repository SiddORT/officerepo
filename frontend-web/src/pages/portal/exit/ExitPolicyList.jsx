import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portalExitApi } from "../../../services/apiClient";

const FIELDS = [
  { key: "policy_name",        label: "Policy Name" },
  { key: "separation_type",    label: "Separation Type" },
  { key: "notice_period_days", label: "Notice Days" },
];

export default function ExitPolicyList() {
  const { subdomain } = useParams();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);   // null | { mode:"create"|"edit", data:{} }
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = (incInactive = false) =>
    portalExitApi.listPolicies(subdomain, incInactive)
      .then(r => setPolicies(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, [subdomain]);

  const openCreate = () => {
    setForm({ separation_type: "Resignation", notice_period_days: 30, is_active: true,
      require_exit_interview: true, require_asset_clearance: true,
      require_loan_clearance: true, require_expense_clearance: true,
      require_manager_approval: true, require_hr_approval: true });
    setError("");
    setModal({ mode: "create" });
  };
  const openEdit = p => { setForm({ ...p }); setError(""); setModal({ mode: "edit", id: p.id }); };
  const closeModal = () => setModal(null);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      if (modal.mode === "create") await portalExitApi.createPolicy(subdomain, form);
      else await portalExitApi.updatePolicy(subdomain, modal.id, form);
      closeModal();
      load(true);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!window.confirm("Delete this policy?")) return;
    await portalExitApi.deletePolicy(subdomain, id);
    load(true);
  };

  const sepTypes = ["Resignation","Termination","Retirement","Contract Completion","Layoff","End Of Internship","Absconding","Deceased"];
  const boolFields = [
    { key: "require_exit_interview",   label: "Require Exit Interview" },
    { key: "require_asset_clearance",  label: "Require Asset Clearance" },
    { key: "require_loan_clearance",   label: "Require Loan Clearance" },
    { key: "require_expense_clearance",label: "Require Expense Clearance" },
    { key: "require_manager_approval", label: "Require Manager Approval" },
    { key: "require_hr_approval",      label: "Require HR Approval" },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Exit Policies</h1>
        <button onClick={openCreate} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">+ Add Policy</button>
      </div>

      {loading ? <div className="text-center text-gray-400 py-12">Loading…</div> : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                {FIELDS.map(f => <th key={f.key} className="text-left px-4 py-3">{f.label}</th>)}
                <th className="text-left px-4 py-3">Requirements</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {policies.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.policy_name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.separation_type}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.notice_period_days} days</td>
                  <td className="px-4 py-3 text-xs text-gray-500 space-x-1">
                    {p.require_exit_interview && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Interview</span>}
                    {p.require_asset_clearance && <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">Assets</span>}
                    {p.require_loan_clearance && <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">Loans</span>}
                    {p.require_expense_clearance && <span className="bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded">Expenses</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {!policies.length && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400">No policies yet. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">{modal.mode === "create" ? "New Exit Policy" : "Edit Policy"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Policy Name *</label>
                <input className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                  value={form.policy_name || ""} onChange={e => setForm(f => ({...f, policy_name: e.target.value}))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Separation Type *</label>
                <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                  value={form.separation_type || "Resignation"} onChange={e => setForm(f => ({...f, separation_type: e.target.value}))}>
                  {sepTypes.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Notice Period (days)</label>
                <input type="number" min="0" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-white"
                  value={form.notice_period_days ?? 30} onChange={e => setForm(f => ({...f, notice_period_days: parseInt(e.target.value)}))} />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">Requirements</p>
                {boolFields.map(bf => (
                  <label key={bf.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={!!form[bf.key]} onChange={e => setForm(f => ({...f, [bf.key]: e.target.checked}))} />
                    {bf.label}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({...f, is_active: e.target.checked}))} />
                Active
              </label>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? "Saving…" : "Save Policy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
