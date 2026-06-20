import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { portalExpenseApi } from "../../../services/apiClient";

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const EMPTY = {
  name: "", description: "", is_active: true, department_id: "", designation_id: "",
  daily_limit: "", monthly_limit: "", yearly_limit: "", approval_levels: 1,
  receipt_required: true, eligible_categories: "", effective_from: "", effective_to: "",
};

export default function ExpensePolicyList() {
  const { subdomain } = useParams();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAll, setShowAll]   = useState(false);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [delConfirm, setDelConfirm] = useState(null);

  const load = () => {
    setLoading(true);
    portalExpenseApi.listPolicies(subdomain, showAll)
      .then(r => setPolicies(r.data?.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [subdomain, showAll]);

  const openCreate = () => { setForm(EMPTY); setError(""); setModal("create"); };
  const openEdit   = (p) => { setForm({ ...p, daily_limit: p.daily_limit ?? "", monthly_limit: p.monthly_limit ?? "", yearly_limit: p.yearly_limit ?? "", effective_from: p.effective_from ? p.effective_from.slice(0,10) : "", effective_to: p.effective_to ? p.effective_to.slice(0,10) : "" }); setError(""); setModal(p); };
  const closeModal = () => { setModal(null); setError(""); };

  const handleSave = async () => {
    setSaving(true); setError("");
    const body = {
      ...form,
      daily_limit:    form.daily_limit    === "" ? null : Number(form.daily_limit),
      monthly_limit:  form.monthly_limit  === "" ? null : Number(form.monthly_limit),
      yearly_limit:   form.yearly_limit   === "" ? null : Number(form.yearly_limit),
      approval_levels: Number(form.approval_levels),
      effective_from: form.effective_from || null,
      effective_to:   form.effective_to   || null,
      eligible_categories: form.eligible_categories || null,
    };
    try {
      if (modal === "create") await portalExpenseApi.createPolicy(subdomain, body);
      else                     await portalExpenseApi.updatePolicy(subdomain, modal.id, body);
      load(); closeModal();
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await portalExpenseApi.deletePolicy(subdomain, id);
      load(); setDelConfirm(null);
    } catch (e) {
      alert(e.response?.data?.message || "Delete failed");
    }
  };

  const F = (label, key, type = "text", opts = {}) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" {...opts} />
    </div>
  );

  const Toggle = (label, key) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className="relative">
        <input type="checkbox" className="sr-only" checked={!!form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))} />
        <div className={`w-9 h-5 rounded-full transition-colors ${form[key] ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`} />
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Expense Policies</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Define limits and approval rules</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" /> Show inactive
          </label>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">+ Add Policy</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="grid gap-4">
          {policies.length === 0 && (
            <div className="text-center py-12 text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">No policies configured</div>
          )}
          {policies.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white">{p.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-gray-100 text-gray-500"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                      {p.approval_levels} approval{p.approval_levels > 1 ? "s" : ""}
                    </span>
                  </div>
                  {p.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{p.description}</p>}
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {p.daily_limit   && <span>Daily: ₹{Number(p.daily_limit).toLocaleString()}</span>}
                    {p.monthly_limit && <span>Monthly: ₹{Number(p.monthly_limit).toLocaleString()}</span>}
                    {p.yearly_limit  && <span>Yearly: ₹{Number(p.yearly_limit).toLocaleString()}</span>}
                    {p.receipt_required && <span className="text-amber-600 dark:text-amber-400">Receipt required</span>}
                    {p.effective_from && <span>From: {p.effective_from.slice(0,10)}</span>}
                    {p.effective_to   && <span>To: {p.effective_to.slice(0,10)}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(p)} className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">Edit</button>
                  <button onClick={() => setDelConfirm(p)} className="text-xs px-3 py-1 border border-red-300 dark:border-red-700 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal === "create" ? "New Expense Policy" : "Edit Policy"} onClose={closeModal}>
          <div className="space-y-4">
            {F("Policy Name *", "name")}
            {F("Description", "description")}
            <div className="grid grid-cols-3 gap-3">
              {F("Daily Limit (₹)", "daily_limit", "number")}
              {F("Monthly Limit (₹)", "monthly_limit", "number")}
              {F("Yearly Limit (₹)", "yearly_limit", "number")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {F("Effective From", "effective_from", "date")}
              {F("Effective To", "effective_to", "date")}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Approval Levels</label>
              <select value={form.approval_levels} onChange={e => setForm(p => ({ ...p, approval_levels: Number(e.target.value) }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value={1}>1 — Manager only</option>
                <option value={2}>2 — Manager + Finance</option>
              </select>
            </div>
            {F("Eligible Categories (comma-separated codes)", "eligible_categories", "text", { placeholder: "Leave blank for all" })}
            <div className="flex flex-wrap gap-4 pt-1">
              {Toggle("Receipt Required", "receipt_required")}
              {Toggle("Active", "is_active")}
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {delConfirm && (
        <Modal title="Delete Policy?" onClose={() => setDelConfirm(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Delete <strong>{delConfirm.name}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setDelConfirm(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            <button onClick={() => handleDelete(delConfirm.id)} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg">Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
