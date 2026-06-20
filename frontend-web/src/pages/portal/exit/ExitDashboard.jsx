import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { portalExitApi } from "../../../services/apiClient";

const Card = ({ label, value, color, to, subdomain }) => (
  <Link to={to ? `/portal/${subdomain}${to}` : "#"}
    className={`block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition`}>
    <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
  </Link>
);

export default function ExitDashboard() {
  const { subdomain } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalExitApi.getDashboard(subdomain)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exit Management</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Employee separation lifecycle overview</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <Card label="Pending Resignations"   value={data?.pending_resignations ?? 0}  color="text-amber-500"  to="/hrms/exit/resignations?status=Submitted"   subdomain={subdomain} />
        <Card label="Under Review"           value={data?.under_review ?? 0}           color="text-purple-500" to="/hrms/exit/resignations?status=Under+Review" subdomain={subdomain} />
        <Card label="Serving Notice"         value={data?.serving_notice ?? 0}         color="text-blue-500"   to="/hrms/exit/resignations?status=Approved"    subdomain={subdomain} />
        <Card label="Pending Clearances"     value={data?.pending_clearances ?? 0}     color="text-orange-500" to="/hrms/exit/resignations"                     subdomain={subdomain} />
        <Card label="Assets Pending Return"  value={data?.assets_pending_return ?? 0}  color="text-red-500"    to="/hrms/exit/resignations"                     subdomain={subdomain} />
        <Card label="Settlements Pending"    value={data?.settlements_pending ?? 0}    color="text-yellow-500" to="/hrms/exit/resignations"                     subdomain={subdomain} />
        <Card label="Exited This Month"      value={data?.exited_this_month ?? 0}      color="text-emerald-500" to="/hrms/exit/resignations"                    subdomain={subdomain} />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Resignations",    to: "/hrms/exit/resignations", icon: "📋" },
          { label: "Exit Policies",   to: "/hrms/exit/policies",     icon: "📜" },
          { label: "Interviews",      to: "/hrms/exit/interviews",   icon: "💬" },
          { label: "Settlements",     to: "/hrms/exit/settlements",  icon: "💰" },
          { label: "Documents",       to: "/hrms/exit/documents",    icon: "📄" },
        ].map(({ label, to, icon }) => (
          <Link key={to} to={`/portal/${subdomain}${to}`}
            className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition">
            <span className="text-2xl">{icon}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent Resignations */}
      {data?.recent_resignations?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recent Resignations</h2>
          <div className="space-y-2">
            {data.recent_resignations.map(r => (
              <Link key={r.id} to={`/portal/${subdomain}/hrms/exit/resignations/${r.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">{r.resignation_number}</p>
                  <p className="text-xs text-gray-500">{r.separation_type} · {r.resignation_date}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  r.status === "Approved"     ? "bg-green-100 text-green-700" :
                  r.status === "Submitted"    ? "bg-amber-100 text-amber-700" :
                  r.status === "Under Review" ? "bg-purple-100 text-purple-700" :
                  "bg-gray-100 text-gray-600"}`}>{r.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
