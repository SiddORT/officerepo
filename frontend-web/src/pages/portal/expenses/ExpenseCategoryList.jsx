import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { portalExpenseApi } from "../../../services/apiClient";

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const EMPTY = { code: "", name: "", description: "", is_active: true, receipt_required: false, approval_required: false, max_amount: "", daily_limit: "", monthly_limit: "" };

export default function ExpenseCategoryList() {
  const { subdomain } = useParams();
  const [cats, setCats]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAll, setShowAll]   = useState(false);
  const [modal, setModal]       = useState(null); // null | "create" | obj
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const load = () => {
    setLoading(true);
    portalExpenseApi.listCategories(subdomain, showAll)
      .then(r => setCats(r.data?.data || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [subdomain, showAll]);

  const openCreate = () => { setForm(EMPTY); setError(""); setModal("create"); };
  const openEdit   = (c) => { setForm({ ...c, max_amount: c.max_amount ?? "", daily_limit: c.daily_limit ?? "", monthly_limit: c.monthly_limit ?? "" }); setError(""); setModal(c); };
  const closeModal = () => { setModal(null); setError(""); };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const body = {
      ...form,
      max_amount:    form.max_amount    === "" ? null : Number(form.max_amount),
      daily_limit:   form.daily_limit   === "" ? null : Number(form.daily_limit),
      monthly_limit: form.monthly_limit === "" ? null : Number(form.monthly_limit),
    };
    try {
      if (modal === "create") {
        await portalExpenseApi.createCategory(subdomain, body);
      } else {
        await portalExpenseApi.updateCategory(subdomain, modal.id, body);
      }
      load();
      closeModal();
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const F = (label, key, type = "text", opts = {}) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: type === "number" ? e.target.value : e.target.value }))}
        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...opts}
      />
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Expense Categories</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage expense types and limits</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="rounded" />
            Show inactive
          </label>
          <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + Add Category
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                {["Code", "Name", "Receipt Req.", "Approval Req.", "Max Amount", "Daily Limit", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {cats.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No categories found</td></tr>
              )}
              {cats.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{c.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.name}</td>
                  <td className="px-4 py-3">{c.receipt_required ? <span className="text-emerald-600 dark:text-emerald-400">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3">{c.approval_required ? <span className="text-emerald-600 dark:text-emerald-400">✓</span> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.max_amount != null ? `₹${Number(c.max_amount).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{c.daily_limit != null ? `₹${Number(c.daily_limit).toLocaleString()}` : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(c)} className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === "create" ? "New Expense Category" : "Edit Category"} onClose={closeModal}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {F("Category Code *", "code", "text", { placeholder: "e.g. TRAVEL", disabled: modal !== "create" })}
              {F("Category Name *", "name")}
            </div>
            {F("Description", "description")}
            <div className="grid grid-cols-3 gap-3">
              {F("Max Amount (₹)", "max_amount", "number", { placeholder: "No limit" })}
              {F("Daily Limit (₹)", "daily_limit", "number", { placeholder: "No limit" })}
              {F("Monthly Limit (₹)", "monthly_limit", "number", { placeholder: "No limit" })}
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              {Toggle("Receipt Required", "receipt_required")}
              {Toggle("Approval Required", "approval_required")}
              {Toggle("Active", "is_active")}
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.code || !form.name} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
