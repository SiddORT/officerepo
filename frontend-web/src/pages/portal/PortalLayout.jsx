import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../contexts/PortalAuthContext";
import { portalNavigationApi } from "../../services/apiClient";

// ── Static nav (always shown) ──────────────────────────────────────────────
const STATIC_NAV = [
  {
    label: "Dashboard", path: "dashboard",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: "Organization", path: "org",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
];

// ── Sub-nav definitions (keyed by mod.route from the catalog) ─────────────
// Add sub-items here for each module that needs a section nav in the sidebar
const MODULE_SUB_NAV = {
  "org": [
    {
      label: "Companies", path: "org/companies",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    },
    {
      label: "Departments", path: "org/departments",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: "Designations", path: "org/designations",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
    },
    {
      label: "Employees", path: "employees",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: "Add Employee", path: "employees/new",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
    },
  ],
  "user-management": [
    {
      label: "Users", path: "user-management/users",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
    },
    {
      label: "Roles", path: "user-management/roles",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    },
    {
      label: "Login Logs", path: "user-management/login-logs",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    },
    {
      label: "Sessions", path: "user-management/sessions",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
    },
    {
      label: "Activity", path: "user-management/activity",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    },
  ],
};

// ── Icon map for dynamic module icons from the catalog ─────────────────────
function ModuleIcon({ icon }) {
  const ICONS = {
    "id-card":    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />,
    "briefcase":  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
    "package":    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
    "headphones": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18v-6a9 9 0 0118 0v6M3 18a1 1 0 001 1h1a1 1 0 001-1v-3a1 1 0 00-1-1H4a1 1 0 00-1 1v3zm16 0a1 1 0 01-1 1h-1a1 1 0 01-1-1v-3a1 1 0 011-1h1a1 1 0 011 1v3z" />,
    "credit-card":<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
    "bar-chart":  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    "book":       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
    "git-branch": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />,
    "user-plus":  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />,
    "building":   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
  };
  const defaultPath = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />;
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {ICONS[icon] || defaultPath}
    </svg>
  );
}

export default function PortalLayout({ children, title }) {
  const { subdomain } = useParams();
  const { user, logout, token } = usePortalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const [navModules, setNavModules] = useState([]);
  const [workspaceName, setWorkspaceName] = useState(subdomain.charAt(0).toUpperCase() + subdomain.slice(1));

  const loadNavigation = useCallback(async () => {
    if (!token || !subdomain) return;
    try {
      const res = await portalNavigationApi.getNavigation(subdomain, token);
      setNavModules(res.data?.modules || []);
      if (res.data?.workspace_name) setWorkspaceName(res.data.workspace_name);
    } catch {
      setNavModules([]);
    }
  }, [token, subdomain]);

  useEffect(() => { loadNavigation(); }, [loadNavigation]);

  useEffect(() => {
    function onClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate(`/portal/${subdomain}`);
  };

  const initials = (user?.name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const navLinkStyle = (isActive) => ({
    display: "flex", alignItems: "center", gap: 10,
    padding: collapsed ? "8px" : "7px 8px",
    borderRadius: 8, fontSize: 13, textDecoration: "none", transition: "all 0.12s",
    color: isActive ? "var(--c-accent)" : "var(--c-muted)",
    background: isActive ? "rgba(0,174,236,0.08)" : "transparent",
    fontWeight: isActive ? 600 : 400,
    justifyContent: collapsed ? "center" : "flex-start",
  });

  const subNavLinkStyle = (isActive) => ({
    display: "flex", alignItems: "center", gap: 8,
    padding: "5px 8px 5px 28px",
    borderRadius: 6, fontSize: 12, textDecoration: "none", transition: "all 0.12s",
    color: isActive ? "var(--c-accent)" : "var(--c-muted)",
    background: isActive ? "rgba(0,174,236,0.06)" : "transparent",
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--c-bg)", color: "var(--c-text)" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 56 : 220, flexShrink: 0,
        display: "flex", flexDirection: "column",
        transition: "width 0.2s",
        borderRight: "1px solid var(--c-border)",
        background: "var(--c-surface)",
      }}>
        {/* Logo / workspace name */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 10px", minHeight: 56,
          borderBottom: "1px solid var(--c-border)",
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: "linear-gradient(135deg, #00aeec, #ff7a1a)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          {!collapsed && (
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{workspaceName}</div>
              <div style={{ fontSize: 10, color: "var(--c-muted)" }}>Workspace</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)}
            style={{ marginLeft: "auto", padding: 4, background: "none", border: "none", cursor: "pointer", color: "var(--c-muted)", flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "8px 6px", display: "flex", flexDirection: "column", gap: 1 }}>
          {/* Static nav items (Dashboard, Organization, …) */}
          {STATIC_NAV.map((item) => {
            const subItems = MODULE_SUB_NAV[item.path] || [];
            const href = subItems.length > 0
              ? `/portal/${subdomain}/${subItems[0].path}`
              : `/portal/${subdomain}/${item.path}`;
            const basePath = `/portal/${subdomain}/${item.path}`;
            const isActive = subItems.length > 0
              ? location.pathname.startsWith(basePath)
              : location.pathname === basePath;
            return (
              <div key={item.path}>
                <Link to={href} style={navLinkStyle(isActive && subItems.length === 0)} title={collapsed ? item.label : undefined}>
                  {item.icon}
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {subItems.length > 0 && (
                        <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          style={{ color: "var(--c-muted)", transform: isActive ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                      {!subItems.length && isActive && <span style={{ width: 3, height: 16, borderRadius: 2, background: "var(--c-accent)", marginLeft: "auto" }} />}
                    </>
                  )}
                </Link>
                {!collapsed && isActive && subItems.length > 0 && (
                  <div style={{ marginTop: 1, marginBottom: 2 }}>
                    {subItems.map((sub) => {
                      const subHref = `/portal/${subdomain}/${sub.path}`;
                      const isSubActive = location.pathname.startsWith(subHref);
                      return (
                        <Link key={sub.path} to={subHref} style={subNavLinkStyle(isSubActive)}>
                          <span style={{ opacity: 0.7 }}>{sub.icon}</span>
                          <span>{sub.label}</span>
                          {isSubActive && <span style={{ width: 3, height: 12, borderRadius: 2, background: "var(--c-accent)", marginLeft: "auto" }} />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Dynamic modules */}
          {navModules.length > 0 && (
            <>
              {!collapsed && (
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", padding: "10px 8px 4px" }}>
                  Modules
                </div>
              )}
              {navModules.map((mod) => {
                const modRoute = mod.route || mod.code;
                const href = `/portal/${subdomain}/${modRoute}`;
                const isModActive = location.pathname.startsWith(href);
                const subItems = MODULE_SUB_NAV[modRoute] || [];

                return (
                  <div key={mod.code}>
                    {/* Module parent link */}
                    <Link to={href} style={navLinkStyle(isModActive && subItems.length === 0)}
                      title={collapsed ? mod.name : undefined}>
                      <ModuleIcon icon={mod.icon} />
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mod.name}</span>
                          {subItems.length > 0 && (
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                              style={{ color: "var(--c-muted)", transform: isModActive ? "rotate(90deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                          {!subItems.length && isModActive && <span style={{ width: 3, height: 16, borderRadius: 2, background: "var(--c-accent)" }} />}
                        </>
                      )}
                    </Link>

                    {/* Sub-nav items (only when not collapsed and module is active) */}
                    {!collapsed && isModActive && subItems.length > 0 && (
                      <div style={{ marginTop: 1, marginBottom: 2 }}>
                        {subItems.map((sub) => {
                          const subHref = `/portal/${subdomain}/${sub.path}`;
                          const isSubActive = location.pathname.startsWith(subHref);
                          return (
                            <Link key={sub.path} to={subHref} style={subNavLinkStyle(isSubActive)}>
                              <span style={{ opacity: 0.7 }}>{sub.icon}</span>
                              <span>{sub.label}</span>
                              {isSubActive && <span style={{ width: 3, height: 12, borderRadius: 2, background: "var(--c-accent)", marginLeft: "auto" }} />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </nav>

        {/* Sidebar profile strip */}
        {!collapsed && (
          <div style={{ padding: "10px 12px", borderTop: "1px solid var(--c-border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #00aeec, #ff7a1a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#fff",
              }}>{initials}</div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-heading)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
                <div style={{ fontSize: 10, color: "var(--c-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.email}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
        {/* Topbar */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px", height: 56, flexShrink: 0,
          borderBottom: "1px solid var(--c-border)", background: "var(--c-surface)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-heading)" }}>{title || "Dashboard"}</div>

          <div ref={profileRef} style={{ position: "relative" }}>
            <button onClick={() => setProfileOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 10px", borderRadius: 8, cursor: "pointer",
                border: "1px solid var(--c-border)", background: profileOpen ? "var(--c-surface2)" : "transparent",
              }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: "linear-gradient(135deg, #00aeec, #ff7a1a)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#fff",
              }}>{initials}</div>
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--c-text)" }}>{user?.name}</span>
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--c-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileOpen && (
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)", width: 200,
                background: "var(--c-surface)", border: "1px solid var(--c-border)",
                borderRadius: 12, boxShadow: "0 16px 40px rgba(0,0,0,0.25)", zIndex: 50, overflow: "hidden",
              }}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--c-border)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-heading)" }}>{user?.name}</div>
                  <div style={{ fontSize: 11, color: "var(--c-muted)" }}>{user?.email}</div>
                </div>
                {[
                  { label: "My Profile", action: () => { setProfileOpen(false); navigate(`/portal/${subdomain}/profile`); }, color: "var(--c-text)" },
                  { label: "User Management", action: () => { setProfileOpen(false); navigate(`/portal/${subdomain}/user-management/users`); }, color: "var(--c-text)" },
                  { label: "Sign Out", action: handleLogout, color: "#ef4444" },
                ].map(item => (
                  <button key={item.label} onClick={item.action}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", fontSize: 12, color: item.color, background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--c-surface2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
