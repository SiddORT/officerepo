import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalLeaveApi } from "../../../services/apiClient";

export default function LeaveDashboard() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalLeaveApi.dashboard(subdomain, token)
      .then(r => setData(r.data?.data || r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  const card = (title, value, color, icon) => (
    <div className="rounded-xl p-5 flex items-center gap-4"
      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
        style={{ background: color + "22", color }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: "var(--c-heading)" }}>{value ?? "—"}</div>
        <div className="text-sm" style={{ color: "var(--c-muted)" }}>{title}</div>
      </div>
    </div>
  );

  const quick = (to, label, icon) => (
    <Link to={`/portal/${subdomain}/${to}`}
      className="flex items-center gap-3 rounded-xl p-4 hover:opacity-80 transition-opacity"
      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium" style={{ color: "var(--c-text)" }}>{label}</span>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--c-heading)" }}>Leave Management</h1>
          <p className="text-sm mt-1" style={{ color: "var(--c-muted)" }}>
            Manage employee leaves, balances, holidays and approvals
          </p>
        </div>
        <Link to={`/portal/${subdomain}/hrms/leave/requests/new`}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "var(--c-accent)" }}>
          + Apply Leave
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: "var(--c-muted)" }}>Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {card("On Leave Today",           data?.on_leave_today      ?? 0, "#3B82F6", "🏠")}
            {card("Pending Approvals",        data?.pending_approvals   ?? 0, "#F59E0B", "⏳")}
            {card("Comp Offs Expiring Soon",  data?.comp_offs_expiring_soon ?? 0, "#EF4444", "⚠️")}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* On Leave Today */}
            <div className="rounded-xl p-5 space-y-3"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <h2 className="font-semibold" style={{ color: "var(--c-heading)" }}>On Leave Today</h2>
              {!data?.on_leave_employees?.length ? (
                <p className="text-sm" style={{ color: "var(--c-muted)" }}>No employees on leave today</p>
              ) : (
                <div className="space-y-2">
                  {data.on_leave_employees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between py-2"
                      style={{ borderBottom: "1px solid var(--c-border)" }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--c-text)" }}>
                          {emp.employee_name}
                        </div>
                        <div className="text-xs" style={{ color: "var(--c-muted)" }}>
                          {emp.leave_type_name}
                        </div>
                      </div>
                      <div className="text-xs" style={{ color: "var(--c-muted)" }}>
                        {emp.start_date} → {emp.end_date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Holidays */}
            <div className="rounded-xl p-5 space-y-3"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <h2 className="font-semibold" style={{ color: "var(--c-heading)" }}>Upcoming Holidays</h2>
              {!data?.upcoming_holidays?.length ? (
                <p className="text-sm" style={{ color: "var(--c-muted)" }}>No upcoming holidays in the next 30 days</p>
              ) : (
                <div className="space-y-2">
                  {data.upcoming_holidays.map(h => (
                    <div key={h.id} className="flex items-center justify-between py-2"
                      style={{ borderBottom: "1px solid var(--c-border)" }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--c-text)" }}>{h.holiday_name}</div>
                        <div className="text-xs" style={{ color: "var(--c-muted)" }}>{h.holiday_type}</div>
                      </div>
                      <div className="text-xs font-medium" style={{ color: "var(--c-accent)" }}>
                        {new Date(h.holiday_date + "T00:00:00").toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div>
            <h2 className="font-semibold mb-3" style={{ color: "var(--c-heading)" }}>Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {quick("hrms/leave/requests/new",     "Apply Leave",          "📋")}
              {quick("hrms/leave/requests",         "Leave Requests",       "📄")}
              {quick("hrms/leave/types",            "Leave Types",          "🏷️")}
              {quick("hrms/leave/policies",         "Policies",             "📋")}
              {quick("hrms/leave/calendars",        "Holiday Calendars",    "📅")}
              {quick("hrms/leave/calendar",         "Leave Calendar",       "🗓️")}
              {quick("hrms/leave/comp-offs",        "Comp Off",             "🔄")}
              {quick("hrms/leave/encashments",      "Encashments",          "💰")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
