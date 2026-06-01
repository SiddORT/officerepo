import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

const apiDocsUrl = `${window.location.origin.replace(":5000", ":8000")}/docs`;

const GROUPS = [
  {
    label: "Account",
    items: [
      {
        key: "profile",
        label: "Profile",
        path: "/superadmin/settings/profile",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        key: "roles",
        label: "Roles & Permissions",
        path: "/superadmin/settings/roles",
        permission: "rbac.role.view",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 3l8 4v5c0 4.4-3.4 8.5-8 9.5C7.4 20.5 4 16.4 4 12V7l8-4z" />
          </svg>
        ),
      },
      {
        key: "currency",
        label: "Currency",
        path: "/superadmin/settings/currencies",
        permission: "currency.view",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" strokeWidth={1.8} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 7v10M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5S13.4 12 12 12s-2.5 1.1-2.5 2.5S10.6 17 12 17s2.5-1.1 2.5-2.5" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        key: "security",
        label: "Security",
        path: "/superadmin/security",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth={1.8} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 11V7a4 4 0 018 0v4" />
          </svg>
        ),
      },
      {
        key: "api",
        label: "API Docs",
        href: apiDocsUrl,
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        ),
      },
    ],
  },
];

function CollapseToggle({ collapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="flex items-center justify-center w-7 h-7 rounded-md transition-all"
      style={{
        color: "var(--c-muted)",
        background: "transparent",
        border: "1px solid var(--c-border)",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--c-surface2)"; e.currentTarget.style.color = "var(--c-text)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--c-muted)"; }}
    >
      <svg
        width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        style={{ transition: "transform 0.2s", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
      >
        <path strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

export default function SettingsLayout({ children }) {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path) => path && location.pathname.startsWith(path);

  const visibleGroups = GROUPS.map(g => ({
    ...g,
    items: g.items.filter(it => !it.permission || hasPermission(it.permission)),
  })).filter(g => g.items.length > 0);

  return (
    <div className="flex" style={{ minHeight: "calc(100vh - 56px)" }}>

      {/* ── Inner nav sidebar ── */}
      <aside
        className="flex-shrink-0 flex flex-col"
        style={{
          width: collapsed ? 56 : 220,
          minWidth: collapsed ? 56 : 220,
          background: "var(--c-surface)",
          borderRight: "1px solid var(--c-border)",
          transition: "width 0.2s ease, min-width 0.2s ease",
          position: "sticky",
          top: 0,
          height: "calc(100vh - 56px)",
          overflow: "hidden",
        }}
      >
        {/* Sidebar header — title + collapse button */}
        <div
          className="flex items-center flex-shrink-0"
          style={{
            height: 52,
            padding: collapsed ? "0 12px" : "0 16px",
            borderBottom: "1px solid var(--c-border)",
            justifyContent: collapsed ? "center" : "space-between",
          }}
        >
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--c-muted)", letterSpacing: "0.08em" }}>
              Settings
            </span>
          )}
          <CollapseToggle collapsed={collapsed} onClick={() => setCollapsed(c => !c)} />
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-2">
          {visibleGroups.map((group, gi) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              {/* Group label — only when expanded */}
              {!collapsed && (
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest px-4 pt-3 pb-1"
                  style={{ color: "var(--c-muted)" }}
                >
                  {group.label}
                </p>
              )}
              {collapsed && gi > 0 && (
                <div style={{ height: 1, background: "var(--c-border)", margin: "6px 10px" }} />
              )}
              {group.items.map(it => {
                const active = isActive(it.path);
                const baseStyle = {
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: collapsed ? "9px 0" : "8px 14px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  width: "100%",
                  background: active ? "var(--c-accent-dim)" : "transparent",
                  borderLeft: active ? "3px solid var(--c-accent)" : "3px solid transparent",
                  color: active ? "var(--c-accent)" : "var(--c-text2)",
                  fontWeight: active ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  transition: "background 0.15s, color 0.15s",
                };

                const content = (
                  <>
                    <span style={{ color: active ? "var(--c-accent)" : "var(--c-muted)", flexShrink: 0, display: "flex" }}>
                      {it.icon}
                    </span>
                    {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{it.label}</span>}
                  </>
                );

                if (it.href) {
                  return (
                    <a key={it.key} href={it.href} target="_blank" rel="noreferrer" style={baseStyle} title={collapsed ? it.label : undefined}>
                      {content}
                    </a>
                  );
                }
                return (
                  <Link key={it.key} to={it.path} style={baseStyle} title={collapsed ? it.label : undefined}>
                    {content}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Content area ── */}
      <div className="flex-1 min-w-0 overflow-y-auto" style={{ background: "var(--c-bg)" }}>
        <div className="p-6 max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  );
}
