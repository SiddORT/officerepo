import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { portalExpenseApi } from "../../../services/apiClient";

const STATUS_BADGE = {
  Draft:              "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Submitted:          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Under Review":     "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  Approved:           "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  "Partially Approved": "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  Rejected:           "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  Reimbursed:         "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  Cancelled:          "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  "Returned For Correction": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
};

const ALL_STATUSES = ["Draft","Submitted","Under Review","Approved","Partially Approved","Rejected","Reimbursed","Cancelled","Returned For Correction"];

export default function ExpenseClaimList() {
  const { subdomain } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [claims, setClaims]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState(searchParams.get("search") || "");
  const [status, setStatus]   = useState(searchParams.get("status") || "");
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 20;

  const load = () => {
    setLoading(true);
    portalExpenseApi.listClaims(subdomain, { status: status || undefined, search: search || undefined, page, page_size: PAGE_SIZE })
      .then(r => {
        const d = r.data?.data || r.data;
        setClaims(d?.items || []);
        setTotal(d?.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); }, [status, search]);
  useEffect(() => { load(); }, [subdomain, status, search, page]);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Expense Claims</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{total} total claims</p>
        </div>
        <Link
          to={`/portal/${subdomain}/hrms/expenses/claims/new`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Claim
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or number…"
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              {["Claim #", "Title", "Category", "Amount", "Approved", "Date", "Status", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading…</td></tr>
            )}
            {!loading && claims.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No claims found</td></tr>
            )}
            {!loading && claims.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{c.claim_number}</td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[180px] truncate">{c.title}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{c.category_name || "—"}</td>
                <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">₹{fmt(c.amount)}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.approved_amount != null ? `₹${fmt(c.approved_amount)}` : "—"}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{c.expense_date ? c.expense_date.slice(0,10) : (c.created_at ? c.created_at.slice(0,10) : "—")}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status] || "bg-gray-100 text-gray-600"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/portal/${subdomain}/hrms/expenses/claims/${c.id}`}
                    className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Page {page} of {totalPages} ({total} results)</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p-1)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              ← Prev
            </button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p+1)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
