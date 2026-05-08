import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";

const MODULES = [
  { name: "HRMS", desc: "Manage employees, departments, attendance", accent: "#6366f1" },
  { name: "Assets", desc: "Track company assets and assignments", accent: "#8b5cf6" },
  { name: "Billing", desc: "Invoices, subscriptions, payments", accent: "#0ea5e9" },
  { name: "Attendance", desc: "Time tracking, schedules, leaves", accent: "#10b981" },
  { name: "Payroll", desc: "Salaries, deductions, payslips", accent: "#f59e0b" },
  { name: "Leave", desc: "Leave requests and approvals", accent: "#f43f5e" },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "superadmin";

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold t-heading">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h2>
        <p className="t-muted mt-1">
          {isSuperAdmin
            ? "Platform overview — manage all tenants from one place."
            : `Logged in as ${user?.role} · Tenant: ${user?.tenant_id}`}
        </p>
      </div>

      {isSuperAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Manage Tenants", desc: "Create, activate, suspend tenants", link: "/superadmin/tenants", accent: "#00aeec" },
            { label: "API Docs", desc: "Interactive Swagger UI", link: `${window.location.origin.replace(":5000", ":8000")}/docs`, external: true, accent: "#8b5cf6" },
            { label: "Feature Flags", desc: "Enable modules per tenant", link: "/superadmin", accent: "#10b981" },
          ].map((card) => (
            <div
              key={card.label}
              className="card hover:scale-[1.01] transition-transform cursor-pointer"
              style={{ borderLeftWidth: 3, borderLeftColor: card.accent }}
            >
              <h3 className="font-semibold t-heading text-base">{card.label}</h3>
              <p className="text-sm t-muted mt-1 mb-4">{card.desc}</p>
              {card.external ? (
                <a href={card.link} target="_blank" rel="noreferrer"
                  className="text-sm font-medium t-accent hover:underline">
                  Open &rarr;
                </a>
              ) : (
                <Link to={card.link} className="text-sm font-medium t-accent hover:underline">
                  Go &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-semibold t-heading">Available Modules</h3>
        <p className="text-sm t-muted">Modules are enabled per tenant by the platform admin.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((mod) => (
          <div
            key={mod.name}
            className="card cursor-pointer hover:scale-[1.01] transition-transform"
            style={{ borderLeftWidth: 3, borderLeftColor: mod.accent }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold t-heading">{mod.name}</h4>
                <p className="text-sm t-muted mt-1">{mod.desc}</p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ backgroundColor: `${mod.accent}18`, color: mod.accent, border: `1px solid ${mod.accent}30` }}
              >
                Module
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
