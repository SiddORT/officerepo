import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import PortalLayout from "../PortalLayout";

const SUB_TABS = [
  { id: "users",      label: "Users",       icon: "👥", path: "user-management/users"      },
  { id: "roles",      label: "Roles",       icon: "🛡️", path: "user-management/roles"      },
  { id: "login-logs", label: "Login Logs",  icon: "📋", path: "user-management/login-logs" },
  { id: "sessions",   label: "Sessions",    icon: "🖥️", path: "user-management/sessions"   },
  { id: "activity",   label: "Activity",    icon: "⚡", path: "user-management/activity"   },
];

export default function UserManagementLayout({ children, title }) {
  const { subdomain } = useParams();
  const location = useLocation();

  return (
    <PortalLayout title={title || "User Management"}>
      {/* Inner tab bar */}
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--c-border)", marginBottom: 20, overflowX: "auto" }}>
        {SUB_TABS.map(t => {
          const href = `/portal/${subdomain}/${t.path}`;
          const active = location.pathname.startsWith(href.replace(/\/$/, ""));
          return (
            <Link key={t.id} to={href}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px", textDecoration: "none",
                color: active ? "var(--c-accent)" : "var(--c-text2)",
                fontSize: 13, fontWeight: active ? 700 : 400,
                borderBottom: `2px solid ${active ? "var(--c-accent)" : "transparent"}`,
                whiteSpace: "nowrap", transition: "color 0.15s", flexShrink: 0,
              }}>
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
      {children}
    </PortalLayout>
  );
}
