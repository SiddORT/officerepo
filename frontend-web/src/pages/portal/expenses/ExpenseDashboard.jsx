import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { portalExpenseApi } from "../../../services/apiClient";

const STAT_COLORS = {
  "Draft":              "slate",
  "Submitted":          "amber",
  "Under Review":       "purple",
  "Approved":           "blue",
  "Partially Approved": "orange",
  "Rejected":           "red",
  "Reimbursed":         "emerald",
  "Cancelled":          "gray",
  "Returned For Correction": "yellow",
};

function StatCard({ label, value, sub, color = "blue", icon }) {
  const bg = {
    blue:    "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
    emerald: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
    amber:   "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
    purple:  "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
    orange:  "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300",
    red:     "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
  }[color] || "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300";

  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium opacity-80">{label}</span>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs mt-1 opacity-70">{sub}</div>}
    </div>
  );
}

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

export default function ExpenseDashboard() {
  const { subdomain } = useParams();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalExpenseApi.getDashboard(subdomain)
      .then(r => setData(r.data?.data || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain]);

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  if (loading) return (
    <div className="p-6 text-center text-gray-400 dark:text-gray-500">Loading…</div>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expense & Reimbursements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Employee expense claims and reimbursement workflows</p>
        </div>
        <Link
          to={`/portal/${subdomain}/hrms/expenses/claims/new`}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Claim
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Claims"       value={data?.total_claims ?? 0}    icon="📋" color="blue" />
        <StatCard label="Pending Approval"   value={data?.pending_approvals ?? 0} icon="⏳" color="amber" />
        <StatCard label="Approved (Unpaid)"  value={data?.approved_unpaid ?? 0} icon="✅" color="purple" />
        <StatCard label="Reimbursement Due"  value={`₹${fmt(data?.pending_amount)}`} icon="💰" color="emerald" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "All Claims",        to: "claims",      icon: "📋" },
          { label: "Mileage Claims",    to: "mileage",     icon: "🚗" },
          { label: "Reimbursements",    to: "reimbursements", icon: "💳" },
          { label: "Categories",        to: "categories",  icon: "🏷️" },
          { label: "Policies",          to: "policies",    icon: "📜" },
        ].map(({ label, to, icon }) => (
          <Link
            key={to}
            to={`/portal/${subdomain}/hrms/expenses/${to}`}
            className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all group"
          >
            <span className="text-xl">{icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{label}</span>
          </Link>
        ))}
      </div>

      {/* Status breakdown */}
      {data?.status_breakdown && Object.keys(data.status_breakdown).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Claims by Status</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(data.status_breakdown).map(([status, count]) => (
              <Link
                key={status}
                to={`/portal/${subdomain}/hrms/expenses/claims?status=${encodeURIComponent(status)}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_BADGE[status] || "bg-gray-100 text-gray-600"} hover:opacity-80 transition-opacity`}
              >
                {status} <span className="font-bold">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent claims */}
      {data?.recent_claims?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Claims</h2>
            <Link to={`/portal/${subdomain}/hrms/expenses/claims`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">View all →</Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.recent_claims.map(claim => (
              <Link
                key={claim.id}
                to={`/portal/${subdomain}/hrms/expenses/claims/${claim.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{claim.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{claim.claim_number}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{fmt(claim.amount)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[claim.status] || "bg-gray-100 text-gray-600"}`}>
                    {claim.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
