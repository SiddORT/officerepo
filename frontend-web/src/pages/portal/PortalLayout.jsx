import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../contexts/PortalAuthContext";
import { portalNavigationApi } from "../../services/apiClient";

const STATIC_NAV = [
  {
    label: "Dashboard", path: "dashboard",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
];

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--c-bg)", color: "var(--c-text)" }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-200"
        style={{
          width: collapsed ? 56 : 220,
          borderRight: "1px solid var(--c-border)",
          background: "var(--c-surface)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 py-4" style={{ borderBottom: "1px solid var(--c-border)", minHeight: 56 }}>
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
            <div className="overflow-hidden">
              <div className="text-sm font-bold truncate" style={{ color: "var(--c-heading)" }}>{workspaceName}</div>
              <div className="text-[10px] truncate" style={{ color: "var(--c-muted)" }}>Workspace</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto flex-shrink-0 p-1 rounded"
            style={{ color: "var(--c-muted)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />}
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {/* Static items (Dashboard always first) */}
          {STATIC_NAV.map((item) => {
            const href = `/portal/${subdomain}/${item.path}`;
            const isActive = location.pathname === href;
            return (
              <Link
                key={item.path}
                to={href}
                className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all"
                style={{
                  color: isActive ? "var(--c-accent)" : "var(--c-muted)",
                  background: isActive ? "rgba(0,174,236,0.08)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
                {isActive && !collapsed && <span className="ml-auto w-1 h-4 rounded-full" style={{ background: "var(--c-accent)" }} />}
              </Link>
            );
          })}

          {/* Dynamic module nav items */}
          {navModules.length > 0 && (
            <>
              {!collapsed && (
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", padding: "10px 8px 4px" }}>
                  Modules
                </div>
              )}
              {navModules.map((mod) => {
                const href = `/portal/${subdomain}/${mod.route || mod.code}`;
                const isActive = location.pathname.startsWith(href);
                return (
                  <Link
                    key={mod.code}
                    to={href}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all"
                    style={{
                      color: isActive ? "var(--c-accent)" : "var(--c-muted)",
                      background: isActive ? "rgba(0,174,236,0.08)" : "transparent",
                      fontWeight: isActive ? 600 : 400,
                    }}
                    title={collapsed ? mod.name : undefined}
                  >
                    <ModuleIcon icon={mod.icon} />
                    {!collapsed && <span className="flex-1 truncate">{mod.name}</span>}
                    {isActive && !collapsed && <span className="ml-auto w-1 h-4 rounded-full" style={{ background: "var(--c-accent)" }} />}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Sidebar profile */}
        {!collapsed && (
          <div className="p-3" style={{ borderTop: "1px solid var(--c-border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #00aeec, #ff7a1a)" }}>
                {initials}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-xs font-medium truncate" style={{ color: "var(--c-heading)" }}>{user?.name}</div>
                <div className="text-[10px] truncate" style={{ color: "var(--c-muted)" }}>{user?.email}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-5 flex-shrink-0" style={{ height: 56, borderBottom: "1px solid var(--c-border)", background: "var(--c-surface)" }}>
          <div className="text-sm font-semibold" style={{ color: "var(--c-heading)" }}>{title || "Dashboard"}</div>

          <div className="flex items-center gap-3">
            {/* Profile dropdown */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-sm"
                style={{ border: "1px solid var(--c-border)", background: profileOpen ? "var(--c-surface2)" : "transparent" }}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #00aeec, #ff7a1a)" }}>
                  {initials}
                </div>
                <span className="hidden sm:block text-xs font-medium" style={{ color: "var(--c-text)" }}>{user?.name}</span>
                <svg className="w-3.5 h-3.5" style={{ color: "var(--c-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl py-1.5 z-50"
                  style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", boxShadow: "0 16px 40px rgba(0,0,0,0.25)" }}>
                  <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--c-border)" }}>
                    <div className="text-xs font-semibold truncate" style={{ color: "var(--c-heading)" }}>{user?.name}</div>
                    <div className="text-[11px] truncate" style={{ color: "var(--c-muted)" }}>{user?.email}</div>
                  </div>
                  <button
                    onClick={() => { setProfileOpen(false); navigate(`/portal/${subdomain}/profile`); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-all"
                    style={{ color: "var(--c-text)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--c-surface2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-all"
                    style={{ color: "#ef4444" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
