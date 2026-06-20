// @refresh reset
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";
import { portalLoanApi } from "../../../services/apiClient";

const StatCard = ({ label, value, sub, color = "#00aeec" }) => (
  <div className="rounded-xl p-5 flex flex-col gap-1" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
    <span className="text-xs font-medium" style={{ color: "var(--c-muted)" }}>{label}</span>
    <span className="text-2xl font-bold" style={{ color }}>{value ?? "—"}</span>
    {sub && <span className="text-xs" style={{ color: "var(--c-muted)" }}>{sub}</span>}
  </div>
);

const STATUS_COLORS = {
  Draft: "#94a3b8", Submitted: "#f59e0b", "Under Review": "#8b5cf6",
  Approved: "#3b82f6", Rejected: "#ef4444", Cancelled: "#6b7280",
  Disbursed: "#10b981", Closed: "#64748b",
};

export default function LoanDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalLoanApi.dashboard(subdomain, token)
      .then(r => setData(r.data?.data || r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  const fmt = (n) => n != null ? n.toLocaleString("en-IN") : "—";

  return (
    <PortalLayout title="Loan Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>Employee Loan Management</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--c-muted)" }}>Manage loans, repayments and disbursements</p>
          </div>
          <button
            onClick={() => navigate(`/portal/${subdomain}/hrms/loans/applications/new`)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg,#00aeec,#0090cc)" }}
          >
            + New Application
          </button>
        </div>

        {/* Stat cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: "var(--c-surface)" }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Active Loans"        value={data?.active_loans ?? 0}         color="#10b981" />
            <StatCard label="Pending Approvals"   value={data?.pending_approvals ?? 0}     color="#f59e0b" />
            <StatCard label="Total Outstanding"   value={`₹${fmt(data?.total_outstanding ?? 0)}`} color="#ef4444" />
            <StatCard label="EMI Due This Month"  value={data?.emi_due_this_month ?? 0}    color="#8b5cf6" />
          </div>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Applications", path: "applications", icon: "📋" },
            { label: "Loan Types",   path: "types",        icon: "🏷️" },
            { label: "Policies",     path: "policies",     icon: "📜" },
            { label: "Repayments",   path: "repayments",   icon: "💳" },
          ].map(({ label, path, icon }) => (
            <button
              key={path}
              onClick={() => navigate(`/portal/${subdomain}/hrms/loans/${path}`)}
              className="rounded-xl p-4 text-left hover:opacity-80 transition-opacity"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}
            >
              <div className="text-2xl mb-2">{icon}</div>
              <div className="text-sm font-semibold" style={{ color: "var(--c-heading)" }}>{label}</div>
            </button>
          ))}
        </div>

        {/* Recent applications */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--c-heading)" }}>Recent Applications</span>
            <button onClick={() => navigate(`/portal/${subdomain}/hrms/loans/applications`)} className="text-xs" style={{ color: "#00aeec" }}>View all</button>
          </div>
          {loading ? (
            <div className="p-6 text-center text-sm" style={{ color: "var(--c-muted)" }}>Loading…</div>
          ) : !data?.recent_applications?.length ? (
            <div className="p-8 text-center text-sm" style={{ color: "var(--c-muted)" }}>No loan applications yet.</div>
          ) : (
            <div className="divide-y" style={{ "--tw-divide-opacity": 1, borderColor: "var(--c-border)" }}>
              {data.recent_applications.map((a) => (
                <div
                  key={a.id}
                  className="px-5 py-3 flex items-center justify-between cursor-pointer hover:opacity-80"
                  style={{ background: "var(--c-surface)" }}
                  onClick={() => navigate(`/portal/${subdomain}/hrms/loans/applications/${a.id}`)}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--c-heading)" }}>{a.employee_name}</div>
                    <div className="text-xs" style={{ color: "var(--c-muted)" }}>{a.loan_type_name} · {a.application_number}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold" style={{ color: "var(--c-heading)" }}>₹{fmt(a.requested_amount)}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ background: `${STATUS_COLORS[a.status] || "#94a3b8"}22`, color: STATUS_COLORS[a.status] || "#94a3b8" }}>
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PortalLayout>
  );
}
