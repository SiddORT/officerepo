import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../contexts/PortalAuthContext";

const NAV_ITEMS = [
  {
    label: "Dashboard", path: "dashboard",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
  {
    label: "Team", path: "team", soon: true,
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
  {
    label: "Tasks", path: "tasks", soon: true,
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  },
  {
    label: "Documents", path: "documents", soon: true,
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
  {
    label: "Settings", path: "settings", soon: true,
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  },
];

export default function PortalLayout({ children, title }) {
  const { subdomain } = useParams();
  const { user, logout } = usePortalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const workspaceName = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);

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
          {NAV_ITEMS.map((item) => {
            const href = `/portal/${subdomain}/${item.path}`;
            const active = location.pathname === href;
            return (
              <div key={item.path}>
                {item.soon ? (
                  <div
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm cursor-not-allowed"
                    style={{ color: "var(--c-muted)", opacity: 0.5 }}
                    title="Coming soon"
                  >
                    {item.icon}
                    {!collapsed && (
                      <span className="flex items-center gap-1.5 flex-1">
                        {item.label}
                        <span className="text-[9px] px-1 py-0.5 rounded font-medium" style={{ background: "rgba(100,116,139,0.2)", color: "var(--c-muted)" }}>soon</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <Link
                    to={href}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-all"
                    style={{
                      color: active ? "var(--c-accent)" : "var(--c-muted)",
                      background: active ? "rgba(0,174,236,0.08)" : "transparent",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                    {active && !collapsed && <span className="ml-auto w-1 h-4 rounded-full" style={{ background: "var(--c-accent)" }} />}
                  </Link>
                )}
              </div>
            );
          })}
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
