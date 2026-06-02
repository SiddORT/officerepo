import React, { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import PortalLayout from "../PortalLayout";

const NAV = [
  {
    key: "users", label: "Users", path: "users",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },
  {
    key: "roles", label: "Roles", path: "roles",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
  },
  {
    key: "login-logs", label: "Login Logs", path: "login-logs",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
  },
  {
    key: "sessions", label: "Sessions", path: "sessions",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  },
  {
    key: "activity", label: "Activity Logs", path: "activity",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  },
];

export default function UserManagementLayout({ children, title }) {
  const { subdomain } = useParams();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const base = `/portal/${subdomain}/user-management`;

  return (
    <PortalLayout title={title || "User Management"}>
      <div className="flex gap-5 h-full" style={{ minHeight: 0 }}>
        {/* Inner sidebar */}
        <aside
          className="flex-shrink-0 flex flex-col"
          style={{
            width: collapsed ? 44 : 200,
            transition: "width 0.15s",
            background: "var(--c-surface)",
            border: "1px solid var(--c-border)",
            borderRadius: 10,
            padding: "10px 6px",
            alignSelf: "flex-start",
            position: "sticky",
            top: 0,
          }}
        >
          <div className="flex items-center justify-between mb-2 px-1">
            {!collapsed && (
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                User Mgmt
              </span>
            )}
            <button onClick={() => setCollapsed(c => !c)}
              style={{ color: "var(--c-muted)", background: "none", border: "none", cursor: "pointer", padding: 2, marginLeft: "auto" }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                <path strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>

          <nav className="space-y-0.5">
            {NAV.map(item => {
              const href = `${base}/${item.path}`;
              const active = location.pathname.startsWith(href);
              return (
                <Link key={item.key} to={href}
                  title={collapsed ? item.label : undefined}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all"
                  style={{
                    color: active ? "var(--c-accent)" : "var(--c-muted)",
                    background: active ? "rgba(0,174,236,0.08)" : "transparent",
                    fontWeight: active ? 600 : 400,
                    whiteSpace: "nowrap",
                  }}>
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </PortalLayout>
  );
}
