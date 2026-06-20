import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi } from "../../../services/apiClient";

const StatCard = ({ label, value, color = "t-heading", sub, icon }) => (
  <div className="card p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="t-muted text-sm mb-1">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value ?? "—"}</p>
        {sub && <p className="t-muted text-xs mt-1">{sub}</p>}
      </div>
      {icon && <span className="text-2xl opacity-60">{icon}</span>}
    </div>
  </div>
);

export default function AttendanceDashboard() {
  const { subdomain, token } = usePortalAuth();
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [wfhData, setWfhData]   = useState(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      portalAttendanceApi.dashboard(subdomain, token),
      portalAttendanceApi.wfhToday(subdomain, token).catch(() => null),
    ])
      .then(([dashRes, wfhRes]) => {
        setData(dashRes.data?.data);
        setWfhData(wfhRes?.data?.data || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  const base = `/portal/${subdomain}/hrms/attendance`;

  if (loading) return <div className="p-6 t-muted">Loading dashboard…</div>;

  const totalLocated = (data?.wfh_today || 0) + (data?.office_today || 0) +
                       (data?.remote_today || 0) + (data?.client_site_today || 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold t-heading">Attendance Management</h1>
          <p className="t-muted text-sm mt-0.5">Today: {data?.today}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => navigate(`${base}/check-in`)} className="btn-primary text-sm px-4 py-2">
            Check-In / Check-Out
          </button>
          <button onClick={() => navigate(`${base}/records`)} className="btn-secondary text-sm px-4 py-2">
            View Records
          </button>
        </div>
      </div>

      {/* Attendance stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Present Today"  value={data?.present}  color="text-green-500"  icon="✅" />
        <StatCard label="Absent Today"   value={data?.absent}   color="text-red-500"    icon="❌" />
        <StatCard label="Late Today"     value={data?.late}     color="text-yellow-500" icon="⏰" />
        <StatCard label="Half Day"       value={data?.half_day} color="text-orange-400" icon="🌓" />
      </div>

      {/* WFH / Location breakdown */}
      {totalLocated > 0 && (
        <div>
          <h2 className="font-semibold t-heading mb-3">Today's Work Locations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data?.office_today > 0 && (
              <StatCard label="In Office"   value={data.office_today}      color="text-blue-400"   icon="🏢" />
            )}
            {data?.wfh_today > 0 && (
              <StatCard label="Work From Home" value={data.wfh_today}      color="text-green-400"  icon="🏠" />
            )}
            {data?.client_site_today > 0 && (
              <StatCard label="Client Site" value={data.client_site_today} color="text-purple-400" icon="📍" />
            )}
            {data?.remote_today > 0 && (
              <StatCard label="Remote"      value={data.remote_today}      color="text-orange-400" icon="🌐" />
            )}
          </div>
        </div>
      )}

      {/* WFH Today panel */}
      {wfhData && wfhData.count > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold t-heading">🏠 Working From Home Today</p>
              <p className="t-muted text-xs mt-0.5">{wfhData.count} employee{wfhData.count !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="space-y-2">
            {wfhData.employees.slice(0, 8).map(emp => (
              <div key={emp.employee_id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs">
                    {(emp.employee_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="t-heading text-sm font-medium">{emp.employee_name}</p>
                    {emp.employee_code && <p className="t-muted text-xs">{emp.employee_code}</p>}
                  </div>
                </div>
                <div className="text-xs t-muted">
                  {emp.check_in_time
                    ? `In: ${new Date(emp.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                  {emp.check_out_time
                    ? ` · Out: ${new Date(emp.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </div>
              </div>
            ))}
            {wfhData.count > 8 && (
              <p className="t-muted text-xs pt-1">+{wfhData.count - 8} more</p>
            )}
          </div>
        </div>
      )}

      {/* Pending actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="t-muted text-sm mb-1">Pending Regularizations</p>
          <p className="text-3xl font-bold t-heading">{data?.pending_regularizations ?? 0}</p>
          {data?.pending_regularizations > 0 && (
            <button onClick={() => navigate(`${base}/regularizations`)}
              className="mt-3 text-sm t-accent hover:underline">
              Review requests →
            </button>
          )}
        </div>
        <div className="card p-5">
          <p className="t-muted text-sm mb-1">Pending Overtime Approvals</p>
          <p className="text-3xl font-bold t-heading">{data?.pending_overtime ?? 0}</p>
          {data?.pending_overtime > 0 && (
            <button onClick={() => navigate(`${base}/overtime`)}
              className="mt-3 text-sm t-accent hover:underline">
              Review overtime →
            </button>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="font-semibold t-heading mb-3">Quick Links</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[
            { label: "Shifts",          icon: "🕐", path: `${base}/shifts` },
            { label: "Records",         icon: "📋", path: `${base}/records` },
            { label: "Regularizations", icon: "✏️",  path: `${base}/regularizations` },
            { label: "Overtime",        icon: "⏱",  path: `${base}/overtime` },
            { label: "Calendar",        icon: "📅", path: `${base}/calendar` },
            { label: "Policies",        icon: "📜", path: `${base}/policies` },
            { label: "Device Registry", icon: "🖥",  path: `${base}/devices` },
          ].map(({ label, icon, path }) => (
            <button key={label} onClick={() => navigate(path)}
              className="card p-4 text-sm font-medium t-heading hover:bg-white/5 text-left transition-colors flex items-center gap-2.5">
              <span className="text-lg">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
