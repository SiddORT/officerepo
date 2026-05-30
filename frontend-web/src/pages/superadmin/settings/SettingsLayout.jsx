import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

const apiDocsUrl = `${window.location.origin.replace(":5000", ":8000")}/docs`;

const ICONS = {
  profile: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  roles: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  security: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  api: (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
};

export default function SettingsLayout({ children }) {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const items = [
    { key: "profile", label: "Profile", path: "/superadmin/settings/profile", icon: ICONS.profile },
    hasPermission("rbac.role.view") && {
      key: "roles", label: "Roles & Permissions", path: "/superadmin/settings/roles", icon: ICONS.roles,
    },
    { key: "security", label: "Security", path: "/superadmin/security", icon: ICONS.security },
    { key: "api", label: "API Documentation", href: apiDocsUrl, icon: ICONS.api },
  ].filter(Boolean);

  const isActive = (path) => path && location.pathname === path;

  const itemClass = (active) =>
    [
      "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 w-full text-left",
      active ? "nav-active text-white" : "layout-nav-idle",
    ].join(" ");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold t-heading">Settings</h2>
        <p className="text-sm t-muted mt-1">
          Manage your profile, security, and system preferences
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-64 flex-shrink-0">
          <nav className="card p-2 space-y-0.5">
            {items.map((it) =>
              it.href ? (
                <a
                  key={it.key}
                  href={it.href}
                  target="_blank"
                  rel="noreferrer"
                  className={itemClass(false)}
                >
                  {it.icon}
                  <span className="truncate">{it.label}</span>
                </a>
              ) : (
                <Link key={it.key} to={it.path} className={itemClass(isActive(it.path))}>
                  {it.icon}
                  <span className="truncate">{it.label}</span>
                </Link>
              )
            )}
          </nav>
        </aside>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
