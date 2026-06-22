import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalNavContext";
import { portalAssetApi } from "../../../services/apiClient";

const StatCard = ({ label, value, color, to, subdomain }) => (
  <Link to={to ? `/portal/${subdomain}/assets/${to}` : "#"}
    className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition block`}>
    <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${color}`}>{value ?? "—"}</p>
  </Link>
);

export default function AssignmentDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalAssetApi.assignmentDashboard(subdomain, token)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const d = data || {};

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Asset Assignments</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Assign and track company assets across your organisation</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Assets"          value={d.total_assets}            color="text-gray-800 dark:text-white"  to="inventory"    subdomain={subdomain} />
        <StatCard label="Currently Assigned"    value={d.assigned}                color="text-blue-600"                  to="assignments"  subdomain={subdomain} />
        <StatCard label="Available"             value={d.available}               color="text-emerald-600"               to="inventory"    subdomain={subdomain} />
        <StatCard label="Under Maintenance"     value={d.under_maintenance}       color="text-amber-500"                 to="inventory"    subdomain={subdomain} />
        <StatCard label="Due Soon"              value={d.due_soon}                color="text-purple-600"                to="assignments"  subdomain={subdomain} />
        <StatCard label="Overdue Returns"       value={d.overdue}                 color="text-red-600"                   to="assignments"  subdomain={subdomain} />
        <StatCard label="Pending Requests"      value={d.pending_requests}        color="text-amber-600"                 to="assignments/requests" subdomain={subdomain} />
        <StatCard label="Pending Ack."          value={d.pending_acknowledgements}color="text-indigo-600"                to="assignments"  subdomain={subdomain} />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Assign Asset",     to: "assignments/new",      icon: "➕" },
          { label: "View Assignments", to: "assignments",           icon: "📋" },
          { label: "Requests",         to: "assignments/requests",  icon: "📩" },
          { label: "Asset Inventory",  to: "inventory",             icon: "📦" },
        ].map(q => (
          <Link key={q.label} to={`/portal/${subdomain}/assets/${q.to}`}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition text-center">
            <span className="text-2xl">{q.icon}</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{q.label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Assignments */}
      {(d.recent_assignments || []).length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3">Recent Assignments</h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Number</th>
                  <th className="text-left px-4 py-3">Asset</th>
                  <th className="text-left px-4 py-3">Assignee</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {d.recent_assignments.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.assignment_number}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                      {a.asset?.asset_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.assignee_name || a.employee_name}</td>
                    <td className="px-4 py-3 text-gray-500">{a.assigned_date || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.status === "Active" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-right">
            <Link to={`/portal/${subdomain}/assets/assignments`} className="text-sm text-blue-600 hover:underline">
              View all assignments →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
