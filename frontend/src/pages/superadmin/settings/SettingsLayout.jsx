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
      {
        key: "general",
        label: "General",
        path: "/superadmin/settings/general",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" strokeWidth={1.8} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "Organization",
    items: [
      {
        key: "organization",
        label: "Organization",
        path: "/superadmin/settings/organization",
        permission: "org.view",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
      {
        key: "document-types",
        label: "Document Types",
        path: "/superadmin/settings/document-types",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        key: "industries",
        label: "Industries",
        path: "/superadmin/settings/industries",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16M3 21h18M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4" />
          </svg>
        ),
      },
      {
        key: "notifications",
        label: "Notifications",
        path: "/superadmin/settings/notifications",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
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
        path: "/superadmin/settings/security",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
      },
      {
        key: "modules",
        label: "Modules",
        path: "/superadmin/settings/modules",
        icon: (
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
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
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
