import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalPayrollApi } from "../../../services/apiClient";

const STAT_CARDS = [
  { key: "pending_approval",    label: "Pending Approval",    color: "#F59E0B", icon: "⏳" },
  { key: "pending_payment",     label: "Pending Payment",     color: "#3B82F6", icon: "💳" },
  { key: "active_compensations",label: "Active Compensations",color: "#10B981", icon: "👥" },
  { key: "pending_payslips",    label: "Pending Payslips",    color: "#8B5CF6", icon: "📄" },
];

const STATUS_COLOR = {
  Draft: "#6B7280", Processing: "#3B82F6", Processed: "#F59E0B",
  Approved: "#10B981", Locked: "#8B5CF6", Paid: "#22C55E",
};

export default function PayrollDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalPayrollApi.dashboard(subdomain, token)
      .then(r => setData(r.data?.data || {}))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  const quick = (to, label, icon) => (
    <Link to={`/portal/${subdomain}/${to}`}
      className="flex items-center gap-3 rounded-xl p-4 hover:opacity-80 transition-opacity"
      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium" style={{ color: "var(--c-text)" }}>{label}</span>
    </Link>
  );

  if (loading) return <div className="text-center py-16" style={{ color: "var(--c-muted)" }}>Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--c-heading)" }}>Payroll Management</h1>
          <p className="text-sm mt-1" style={{ color: "var(--c-muted)" }}>
            Salary processing, payslips and statutory compliance
          </p>
        </div>
        <Link to={`/portal/${subdomain}/hrms/payroll/runs/new`}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "var(--c-accent)" }}>
          + New Payroll Run
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, color, icon }) => (
          <div key={key} className="rounded-xl p-5 flex items-center gap-4"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
              style={{ background: color + "22", color }}>
              {icon}
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: "var(--c-heading)" }}>
                {data?.[key] ?? 0}
              </div>
              <div className="text-sm" style={{ color: "var(--c-muted)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest run */}
        <div className="rounded-xl p-5 space-y-3"
          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--c-heading)" }}>Latest Payroll Run</h2>
          {data?.latest_run ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium" style={{ color: "var(--c-text)" }}>
                  {data.latest_run.period_label}
                </span>
                <span className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{
                    background: (STATUS_COLOR[data.latest_run.status] || "#6B7280") + "22",
                    color: STATUS_COLOR[data.latest_run.status] || "#6B7280",
                  }}>
                  {data.latest_run.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <div style={{ color: "var(--c-muted)" }}>Employees</div>
                  <div className="font-semibold" style={{ color: "var(--c-text)" }}>
                    {data.latest_run.total_employees}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--c-muted)" }}>Gross</div>
                  <div className="font-semibold" style={{ color: "var(--c-text)" }}>
                    ₹{(data.latest_run.total_gross || 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--c-muted)" }}>Net</div>
                  <div className="font-semibold" style={{ color: "var(--c-accent)" }}>
                    ₹{(data.latest_run.total_net || 0).toLocaleString()}
                  </div>
                </div>
              </div>
              <Link to={`/portal/${subdomain}/hrms/payroll/runs/${data.latest_run.id}`}
                className="text-xs font-medium" style={{ color: "var(--c-accent)" }}>
                View Details →
              </Link>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--c-muted)" }}>No payroll runs yet</p>
          )}
        </div>

        {/* Quick links */}
        <div className="rounded-xl p-5 space-y-3"
          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--c-heading)" }}>Quick Access</h2>
          <div className="grid grid-cols-2 gap-3">
            {quick("hrms/payroll/runs",         "Payroll Runs",       "🏃")}
            {quick("hrms/payroll/payslips",      "Payslips",           "📄")}
            {quick("hrms/payroll/compensations", "Compensations",      "💼")}
            {quick("hrms/payroll/components",    "Salary Components",  "🧩")}
            {quick("hrms/payroll/structures",    "Salary Structures",  "🏗️")}
            {quick("hrms/payroll/cycles",        "Payroll Cycles",     "🔄")}
          </div>
        </div>
      </div>
    </div>
  );
}
