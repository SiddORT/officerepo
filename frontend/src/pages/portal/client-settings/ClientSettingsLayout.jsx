import React, { useState } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import PortalLayout from "../PortalLayout";

// ── Nav groups matching the admin SettingsLayout pattern ────────────────────
function mkIcon(d) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  );
}

const GROUPS = [
  {
    label: "Workspace",
    items: [
      {
        key: "general",
        label: "General",
        path: "general",
        icon: mkIcon("M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"),
      },
      {
        key: "branding",
        label: "Company Branding",
        path: "branding",
        icon: mkIcon("M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"),
      },
      {
        key: "localization",
        label: "Localization",
        path: "localization",
        icon: mkIcon("M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"),
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        key: "notifications",
        label: "Notifications",
        path: "notifications",
        icon: mkIcon("M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"),
      },
      {
        key: "credentials",
        label: "Credentials & Integrations",
        path: "credentials",
        icon: mkIcon("M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"),
      },
      {
        key: "common-masters",
        label: "Common Masters",
        path: "common-masters",
        icon: mkIcon("M4 6h16M4 10h16M4 14h10M4 18h6"),
      },
      {
        key: "doc-templates",
        label: "Document Templates",
        path: "doc-templates",
        icon: mkIcon("M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"),
      },
      {
        key: "email-templates",
        label: "Email Templates",
        path: "email-templates",
        icon: mkIcon("M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"),
      },
    ],
  },
];

function CollapseToggle({ collapsed, onClick }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: 6,
        color: "var(--c-muted)", background: "transparent",
        border: "1px solid var(--c-border)", cursor: "pointer",
        transition: "background 0.12s, color 0.12s", flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "var(--c-surface2)"; e.currentTarget.style.color = "var(--c-text)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--c-muted)"; }}
    >
      <svg
        width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        style={{ transition: "transform 0.2s", transform: collapsed ? "rotate(180deg)" : "rotate(0deg)" }}
      >
        <path strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );
}

export default function ClientSettingsLayout() {
  const { subdomain } = useParams();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const base = `/portal/${subdomain}/client-settings`;
  const isActive = (path) => location.pathname === `${base}/${path}` || location.pathname.startsWith(`${base}/${path}/`);

  return (
    <PortalLayout title="Settings">
      {/*
        Negate PortalLayout's 24px padding so our inner sidebar + content
        fill edge-to-edge, exactly like the admin settings layout.
      */}
      <div style={{
        margin: "-24px",
        display: "flex",
        height: "calc(100vh - 56px)",
        overflow: "hidden",
      }}>

        {/* ── Inner settings sidebar ── */}
        <aside style={{
          width: collapsed ? 56 : 220,
          minWidth: collapsed ? 56 : 220,
          display: "flex", flexDirection: "column",
          background: "var(--c-surface)",
          borderRight: "1px solid var(--c-border)",
          transition: "width 0.2s ease, min-width 0.2s ease",
          overflow: "hidden",
          flexShrink: 0,
        }}>

          {/* Sidebar header */}
          <div style={{
            display: "flex", alignItems: "center", flexShrink: 0,
            height: 52,
            padding: collapsed ? "0 12px" : "0 16px",
            borderBottom: "1px solid var(--c-border)",
            justifyContent: collapsed ? "center" : "space-between",
          }}>
            {!collapsed && (
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.08em", color: "var(--c-muted)",
              }}>
                Settings
              </span>
            )}
            <CollapseToggle collapsed={collapsed} onClick={() => setCollapsed(c => !c)} />
          </div>

          {/* Nav groups */}
          <nav style={{ flex: 1, overflowY: "auto", paddingTop: 8, paddingBottom: 8 }}>
            {GROUPS.map((group, gi) => (
              <div key={group.label} style={{ marginBottom: 4 }}>

                {/* Group label (expanded only) */}
                {!collapsed && (
                  <p style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.07em", color: "var(--c-muted)",
                    padding: "10px 16px 4px",
                  }}>
                    {group.label}
                  </p>
                )}

                {/* Divider between groups when collapsed */}
                {collapsed && gi > 0 && (
                  <div style={{ height: 1, background: "var(--c-border)", margin: "6px 10px" }} />
                )}

                {group.items.map(it => {
                  const active = isActive(it.path);
                  return (
                    <Link
                      key={it.key}
                      to={`${base}/${it.path}`}
                      title={collapsed ? it.label : undefined}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: collapsed ? "9px 0" : "8px 14px",
                        justifyContent: collapsed ? "center" : "flex-start",
                        textDecoration: "none",
                        background: active ? "var(--c-accent-dim)" : "transparent",
                        borderLeft: active ? "3px solid var(--c-accent)" : "3px solid transparent",
                        color: active ? "var(--c-accent)" : "var(--c-text2)",
                        fontWeight: active ? 600 : 400,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      <span style={{ color: active ? "var(--c-accent)" : "var(--c-muted)", flexShrink: 0, display: "flex" }}>
                        {it.icon}
                      </span>
                      {!collapsed && (
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          {it.label}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        {/* ── Content area ── */}
        <div style={{ flex: 1, minWidth: 0, overflowY: "auto", background: "var(--c-bg)" }}>
          <div style={{ padding: 24 }}>
            <Outlet />
          </div>
        </div>

      </div>
    </PortalLayout>
  );
}
