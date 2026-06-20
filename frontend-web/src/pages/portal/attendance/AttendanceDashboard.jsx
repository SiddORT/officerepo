import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi } from "../../../services/apiClient";

const StatCard = ({ label, value, color = "t-heading", sub }) => (
  <div className="card p-5">
    <p className="t-muted text-sm mb-1">{label}</p>
    <p className={`text-3xl font-bold ${color}`}>{value ?? "—"}</p>
    {sub && <p className="t-muted text-xs mt-1">{sub}</p>}
  </div>
);

export default function AttendanceDashboard() {
  const { subdomain, token } = usePortalAuth();
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalAttendanceApi.dashboard(subdomain, token)
      .then(r => setData(r.data?.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  const base = `/portal/${subdomain}/hrms/attendance`;

  if (loading) return <div className="p-6 t-muted">Loading dashboard…</div>;

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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Present Today"    value={data?.present}   color="text-green-500" />
        <StatCard label="Absent Today"     value={data?.absent}    color="text-red-500" />
        <StatCard label="Late Today"       value={data?.late}      color="text-yellow-500" />
        <StatCard label="Half Day"         value={data?.half_day}  color="text-orange-400" />
      </div>

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
            { label: "Shifts",          path: `${base}/shifts` },
            { label: "Records",         path: `${base}/records` },
            { label: "Regularizations", path: `${base}/regularizations` },
            { label: "Overtime",        path: `${base}/overtime` },
            { label: "Calendar",        path: `${base}/calendar` },
            { label: "Policies",        path: `${base}/policies` },
            { label: "Device Registry", path: `${base}/devices` },
          ].map(({ label, path }) => (
            <button key={label} onClick={() => navigate(path)}
              className="card p-4 text-sm font-medium t-heading hover:bg-opacity-80 text-left transition-colors">
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
