import React, { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import PortalLayout from "../PortalLayout";

const NAV = [
  {
    key: "companies", label: "Companies", path: "companies",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
  {
    key: "departments", label: "Departments", path: "departments",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    key: "designations", label: "Designations", path: "designations",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
  },
];

export default function OrgLayout({ children, title }) {
  const { subdomain } = useParams();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const base = `/portal/${subdomain}/org`;

  return (
    <PortalLayout title={title || "Organization"}>
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
                Organization
              </span>
            )}
            <button onClick={() => setCollapsed(c => !c)}
              style={{ color: "var(--c-muted)", background: "none", border: "none", cursor: "pointer", padding: 2, marginLeft: "auto" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
              </svg>
            </button>
          </div>

          <nav className="flex flex-col gap-0.5">
            {NAV.map(item => {
              const to = `${base}/${item.path}`;
              const active = location.pathname.startsWith(to);
              return (
                <Link key={item.key} to={to}
                  className="flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    padding: collapsed ? "7px" : "7px 10px",
                    background: active ? "var(--c-primary-soft)" : "transparent",
                    color: active ? "var(--c-primary)" : "var(--c-text)",
                    justifyContent: collapsed ? "center" : "flex-start",
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </PortalLayout>
  );
}
