import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";

const MODULES = [
  { name: "HRMS", desc: "Manage employees, departments, attendance", color: "indigo" },
  { name: "Assets", desc: "Track company assets and assignments", color: "violet" },
  { name: "Billing", desc: "Invoices, subscriptions, payments", color: "sky" },
  { name: "Attendance", desc: "Time tracking, schedules, leaves", color: "emerald" },
  { name: "Payroll", desc: "Salaries, deductions, payslips", color: "amber" },
  { name: "Leave", desc: "Leave requests and approvals", color: "rose" },
];

const colorMap = {
  indigo: "bg-indigo-900/30 border-indigo-700/40 text-indigo-400",
  violet: "bg-violet-900/30 border-violet-700/40 text-violet-400",
  sky: "bg-sky-900/30 border-sky-700/40 text-sky-400",
  emerald: "bg-emerald-900/30 border-emerald-700/40 text-emerald-400",
  amber: "bg-amber-900/30 border-amber-700/40 text-amber-400",
  rose: "bg-rose-900/30 border-rose-700/40 text-rose-400",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "superadmin";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h2>
        <p className="text-gray-500 mt-1">
          {isSuperAdmin
            ? "Platform overview — manage all tenants from one place."
            : `Logged in as ${user?.role} · Tenant: ${user?.tenant_id}`}
        </p>
      </div>

      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Manage Tenants", desc: "Create, activate, suspend tenants", link: "/superadmin", color: "indigo" },
            { label: "API Docs", desc: "Interactive Swagger UI", link: `${window.location.origin.replace(':5000', ':8000')}/docs`, external: true, color: "sky" },
            { label: "Feature Flags", desc: "Enable modules per tenant", link: "/superadmin", color: "violet" },
          ].map((card) => (
            <div key={card.label} className={`card border ${colorMap[card.color]} hover:opacity-90 transition-opacity`}>
              <h3 className="font-semibold text-white text-lg">{card.label}</h3>
              <p className="text-sm text-gray-400 mt-1 mb-4">{card.desc}</p>
              {card.external ? (
                <a href={card.link} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                  Open &rarr;
                </a>
              ) : (
                <Link to={card.link} className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
                  Go &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Available Modules</h3>
        <p className="text-sm text-gray-500">Modules are enabled per tenant by the platform admin.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod) => (
          <div key={mod.name} className={`card border ${colorMap[mod.color]} cursor-pointer hover:scale-[1.01] transition-transform`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-white">{mod.name}</h4>
                <p className="text-sm text-gray-400 mt-1">{mod.desc}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border ${colorMap[mod.color]}`}>Module</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
