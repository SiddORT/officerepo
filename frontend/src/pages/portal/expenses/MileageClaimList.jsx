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

const STATUS_BADGE = {
  Draft:    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Submitted:"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Reimbursed:"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

const EMPTY = { employee_id: "", trip_date: "", from_location: "", to_location: "", distance_km: "", rate_per_km: "5", currency: "INR", purpose: "" };

export default function MileageClaimList() {
  const { subdomain } = useParams();
  const [claims, setClaims]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 20;
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const load = () => {
    setLoading(true);
    portalExpenseApi.listMileage(subdomain, { page, page_size: PAGE_SIZE })
      .then(r => {
        const d = r.data?.data || r.data;
        setClaims(d?.items || []);
        setTotal(d?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [subdomain, page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const estimated = form.distance_km && form.rate_per_km
    ? (parseFloat(form.distance_km) * parseFloat(form.rate_per_km)).toFixed(2)
    : null;

  const openCreate = () => { setForm(EMPTY); setError(""); setModal("create"); };
  const closeModal = () => { setModal(null); setError(""); };

  const handleSave = async () => {
    setSaving(true); setError("");
    const body = {
      ...form,
      distance_km: parseFloat(form.distance_km),
      rate_per_km: parseFloat(form.rate_per_km),
      trip_date:   new Date(form.trip_date).toISOString(),
    };
    try {
      await portalExpenseApi.createMileage(subdomain, body);
      load(); closeModal();
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this draft mileage claim?")) return;
    try {
      await portalExpenseApi.deleteMileage(subdomain, id);
      load();
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mileage Claims</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track vehicle mileage and reimbursements</p>
        </div>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">+ Log Mileage</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {["Date", "From → To", "Distance", "Rate/km", "Amount", "Status", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>}
            {!loading && claims.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No mileage claims found</td></tr>}
            {!loading && claims.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{c.trip_date?.slice(0,10) || "—"}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[200px]">
                  <div className="truncate">{c.from_location}</div>
                  <div className="text-xs text-gray-400 truncate">→ {c.to_location}</div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.distance_km} km</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">₹{c.rate_per_km}/km</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">₹{fmt(c.total_amount)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] || "bg-gray-100 text-gray-600"}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3">
                  {c.status === "Draft" && (
                    <button onClick={() => handleDelete(c.id)} className="text-xs px-2 py-1 border border-red-300 dark:border-red-700 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">← Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p+1)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Next →</button>
          </div>
        </div>
      )}

      {modal === "create" && (
        <Modal title="Log Mileage Claim" onClose={closeModal}>
          <div className="space-y-3">
            {F("Employee ID *", "employee_id", "text", { placeholder: "Employee UUID" })}
            {F("Trip Date *", "trip_date", "date")}
            {F("From Location *", "from_location", "text", { placeholder: "e.g. Mumbai Office" })}
            {F("To Location *", "to_location", "text", { placeholder: "e.g. Pune Client Site" })}
            <div className="grid grid-cols-2 gap-3">
              {F("Distance (km) *", "distance_km", "number", { min: 0.1, step: "0.1" })}
              {F("Rate per km (₹) *", "rate_per_km", "number", { min: 0.1, step: "0.1" })}
            </div>
            {estimated && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                Estimated reimbursement: <strong>₹{Number(estimated).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong>
              </div>
            )}
            {F("Purpose", "purpose", "text", { placeholder: "Reason for travel" })}
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={closeModal} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.employee_id || !form.trip_date || !form.from_location || !form.to_location || !form.distance_km || !form.rate_per_km}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
