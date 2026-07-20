import React from "react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import PortalLayout from "../PortalLayout";

const SI = ({ d }) => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const NAV_ITEMS = [
  {
    label: "General",
    path: "general",
    icon: <SI d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  },
  {
    label: "Company Branding",
    path: "branding",
    icon: <SI d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  },
  {
    label: "Localization",
    path: "localization",
    icon: <SI d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  },
  {
    label: "Notifications",
    path: "notifications",
    icon: <SI d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  },
  {
    label: "Credentials",
    path: "credentials",
    icon: <SI d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />,
  },
  {
    label: "Common Masters",
    path: "common-masters",
    icon: <SI d="M4 6h16M4 10h16M4 14h10M4 18h6" />,
  },
  {
    label: "Doc Templates",
    path: "doc-templates",
    icon: <SI d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  },
  {
    label: "Email Templates",
    path: "email-templates",
    icon: <SI d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  },
];

export default function ClientSettingsLayout() {
  const { subdomain } = useParams();
  const location = useLocation();
  const base = `/portal/${subdomain}/client-settings`;
  const activeSegment = location.pathname.replace(base + "/", "").split("/")[0];

  return (
    <PortalLayout title="Settings">
      {/* Pull the tab bar flush with PortalLayout's 24px padding so it looks built-in */}
      <div style={{ margin: "-24px -24px 0" }}>
        <div style={{
          display: "flex", alignItems: "center",
          borderBottom: "1px solid var(--c-border)",
          background: "var(--c-surface)",
          padding: "0 24px",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeSegment === item.path;
            return (
              <Link
                key={item.path}
                to={`${base}/${item.path}`}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "11px 14px",
                  fontSize: 12, fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--c-accent)" : "var(--c-muted)",
                  borderBottom: isActive ? "2px solid var(--c-accent)" : "2px solid transparent",
                  marginBottom: -1,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  transition: "color 0.12s",
                  flexShrink: 0,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "var(--c-text)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "var(--c-muted)"; }}
              >
                <span style={{ opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Section content — restore padding for the page body */}
      <div style={{ paddingTop: 24 }}>
        <Outlet />
      </div>
    </PortalLayout>
  );
}
