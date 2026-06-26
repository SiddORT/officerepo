import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { portalExpenseApi } from "../../../services/apiClient";

const STATUS_BADGE = {
  Pending:    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Processing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Paid:       "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Failed:     "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const METHOD_ICON = {
  "Payroll":       "💰",
  "Bank Transfer": "🏦",
  "Cash":          "💵",
};

const ALL_STATUSES = ["Pending", "Processing", "Paid", "Failed"];

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export default function ReimbursementList() {
  const { subdomain } = useParams();
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState("");
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 20;
  const [markModal, setMarkModal] = useState(null);
  const [markForm, setMarkForm]   = useState({});
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  const load = () => {
    setLoading(true);
    portalExpenseApi.listReimbursements(subdomain, { status: status || undefined, page, page_size: PAGE_SIZE })
      .then(r => {
        const d = r.data?.data || r.data;
        setItems(d?.items || []);
        setTotal(d?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [status]);
  useEffect(load, [subdomain, status, page]);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const d   = (iso) => iso ? iso.slice(0, 10) : "—";
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const openMark = (item) => {
    setMarkForm({ status: "Paid", transaction_ref: "", reimbursement_date: new Date().toISOString().slice(0,10) });
    setError("");
    setMarkModal(item);
  };

  const handleMark = async () => {
    setSaving(true); setError("");
    try {
      await portalExpenseApi.updateReimbursement(subdomain, markModal.id, {
        ...markForm,
        reimbursement_date: markForm.reimbursement_date ? new Date(markForm.reimbursement_date).toISOString() : undefined,
      });
      setMarkModal(null);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reimbursements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} reimbursement records</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {["Employee", "Claim", "Amount", "Method", "Status", "Ref / Date", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No reimbursements found</td></tr>}
            {!loading && items.map(r => (
              <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">{r.employee_id?.slice(0,8)}…</td>
                <td className="px-4 py-3">
                  <Link to={`/portal/${subdomain}/hrms/expenses/claims/${r.claim_id}`}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-mono">{r.claim_id?.slice(0,8)}…</Link>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">₹{fmt(r.amount)} <span className="text-xs font-normal text-gray-400">{r.currency}</span></td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                  {METHOD_ICON[r.method] || "💳"} {r.method}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.status] || "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                  {r.transaction_ref && <div className="font-mono">{r.transaction_ref}</div>}
                  {r.reimbursement_date && <div>{d(r.reimbursement_date)}</div>}
                  {!r.transaction_ref && !r.reimbursement_date && "—"}
                </td>
                <td className="px-4 py-3">
                  {r.status === "Pending" && (
                    <button onClick={() => openMark(r)} className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors font-medium">
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Page {page} of {totalPages} ({total} results)</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">← Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p+1)} className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">Next →</button>
          </div>
        </div>
      )}

      {markModal && (
        <Modal title="Mark as Paid" onClose={() => setMarkModal(null)}>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              Amount: <strong className="text-gray-900 dark:text-white">₹{fmt(markModal.amount)}</strong> via {markModal.method}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Payment Date</label>
              <input type="date" value={markForm.reimbursement_date || ""} onChange={e => setMarkForm(p => ({ ...p, reimbursement_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Transaction Reference</label>
              <input type="text" value={markForm.transaction_ref || ""} onChange={e => setMarkForm(p => ({ ...p, transaction_ref: e.target.value }))}
                placeholder="UTR / Ref number"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select value={markForm.status || "Paid"} onChange={e => setMarkForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Paid">Paid</option>
                <option value="Processing">Processing</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setMarkModal(null)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={handleMark} disabled={saving} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-lg">
                {saving ? "Saving…" : "Update"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
