import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    path: "/dashboard",
    roles: ["superadmin", "admin", "manager", "employee"],
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Tenants",
    path: "/superadmin/tenants",
    roles: ["superadmin"],
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    label: "Platform Admin",
    path: "/superadmin",
    roles: ["superadmin"],
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    label: "Security",
    path: "/superadmin/security",
    roles: ["superadmin"],
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
];

function SunIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function getPageTitle(pathname) {
  if (pathname.startsWith("/superadmin/tenants/") && pathname.endsWith("/edit")) return "Edit Tenant";
  if (pathname.startsWith("/superadmin/tenants/new")) return "New Tenant";
  if (pathname.startsWith("/superadmin/tenants/")) return "Tenant Details";
  if (pathname.startsWith("/superadmin/tenants")) return "Tenant Management";
  if (pathname === "/superadmin/security") return "Security";
  if (pathname === "/superadmin") return "Platform Admin";
  if (pathname === "/dashboard") return "Dashboard";
  return "Office Repo";
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { toggle, isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate("/");
  };

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const isActive = (path) =>
    path === "/superadmin/tenants"
      ? location.pathname.startsWith("/superadmin/tenants")
      : location.pathname === path;

  const initials = user?.email?.slice(0, 2).toUpperCase() || "AD";
  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen flex layout-root">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`layout-sidebar ${collapsed ? "w-[64px]" : "w-[220px]"} flex flex-col flex-shrink-0 transition-all duration-200`}>

        {/* Product wordmark + collapse icon */}
        <div className={`border-b layout-border flex items-center ${collapsed ? "justify-center px-3 py-4" : "px-4 py-4 gap-2"}`}>
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all layout-nav-idle"
              style={{ background: "linear-gradient(135deg,#00aeec,#8b5cf6)" }}
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="white" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold tracking-tight layout-title leading-tight">Office Repo</p>
                <p className="text-[10px] tracking-widest uppercase layout-label-muted mt-0.5">Unified Workplace Management</p>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 layout-nav-idle transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={[
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                collapsed ? "justify-center" : "",
                isActive(item.path)
                  ? "nav-active text-white"
                  : "layout-nav-idle",
              ].join(" ")}
            >
              {item.icon}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="pb-3 border-t layout-border pt-3 flex flex-col gap-2">

          {/* App store buttons */}
          {!collapsed && (
            <div className="px-3 flex flex-col gap-1.5">
              {/* Play Store */}
              <a
                href="#"
                title="Get it on Google Play"
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all layout-nav-idle"
                style={{ border: "1px solid var(--c-border)" }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor" style={{ color: "#10b981" }}>
                  <path d="M3.18 23.76c.33.18.7.24 1.07.17l11.67-11.67L12.5 9l-9.32 14.76zM20.83 10.5l-3.01-1.69-3.56 3.56 3.56 3.56 3.03-1.7c.86-.48.86-1.74-.02-2.73zM2.01 1.05C1.7 1.39 1.5 1.88 1.5 2.5v19c0 .62.2 1.11.51 1.45L14.17 10.5 2.01 1.05zM15.25 3.19l-11.67 7.31 3.56 3.56L15.25 3.19z" />
                </svg>
                <div className="min-w-0">
                  <p style={{ fontSize: 8, color: "var(--c-muted)", letterSpacing: "0.04em", lineHeight: 1 }}>GET IT ON</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text)", lineHeight: 1.2 }}>Google Play</p>
                </div>
              </a>
              {/* App Store */}
              <a
                href="#"
                title="Download on the App Store"
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all layout-nav-idle"
                style={{ border: "1px solid var(--c-border)" }}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor" style={{ color: "#00aeec" }}>
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <div className="min-w-0">
                  <p style={{ fontSize: 8, color: "var(--c-muted)", letterSpacing: "0.04em", lineHeight: 1 }}>DOWNLOAD ON THE</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--c-text)", lineHeight: 1.2 }}>App Store</p>
                </div>
              </a>
            </div>
          )}

          {/* Collapsed: stacked store icons */}
          {collapsed && (
            <div className="flex flex-col items-center gap-1.5 px-2">
              <a href="#" title="Get it on Google Play" className="w-8 h-8 rounded-lg flex items-center justify-center layout-nav-idle transition-all" style={{ border: "1px solid var(--c-border)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" style={{ color: "#10b981" }}>
                  <path d="M3.18 23.76c.33.18.7.24 1.07.17l11.67-11.67L12.5 9l-9.32 14.76zM20.83 10.5l-3.01-1.69-3.56 3.56 3.56 3.56 3.03-1.7c.86-.48.86-1.74-.02-2.73zM2.01 1.05C1.7 1.39 1.5 1.88 1.5 2.5v19c0 .62.2 1.11.51 1.45L14.17 10.5 2.01 1.05zM15.25 3.19l-11.67 7.31 3.56 3.56L15.25 3.19z" />
                </svg>
              </a>
              <a href="#" title="Download on the App Store" className="w-8 h-8 rounded-lg flex items-center justify-center layout-nav-idle transition-all" style={{ border: "1px solid var(--c-border)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" style={{ color: "#00aeec" }}>
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              </a>
            </div>
          )}

          {/* by ort_ brand mark */}
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 6, paddingRight: 10, paddingTop: 2 }}
            >
              <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.05em" }}>by</span>
              <motion.div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                <motion.div
                  animate={{ opacity: [0.25, 0.55, 0.25] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    position: "absolute", inset: "-3px -6px",
                    background: "radial-gradient(ellipse at center, rgba(0,174,236,0.35) 0%, transparent 70%)",
                    borderRadius: 6, pointerEvents: "none",
                  }}
                />
                <motion.span
                  whileHover={{ scale: 1.08 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  style={{
                    fontSize: 13, fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.04em",
                    background: "linear-gradient(135deg, #00aeec, #8b5cf6)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text", position: "relative", cursor: "default",
                  }}
                >
                  ort_
                </motion.span>
              </motion.div>
            </motion.div>
          )}
        </div>
      </aside>

      {/* ── Right column ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="layout-topbar h-14 flex items-center justify-between px-6 flex-shrink-0 border-b layout-border">

          {/* Left — page title */}
          <div>
            <h1 className="text-sm font-semibold layout-title">{pageTitle}</h1>
            <p className="text-[11px] layout-label-muted capitalize">{user?.role}</p>
          </div>

          {/* Right — actions */}
          <div className="flex items-center gap-1">

            {/* Theme toggle */}
            <button
              onClick={toggle}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="topbar-btn"
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>

            {/* Notification bell */}
            <button className="topbar-btn relative" title="Notifications">
              <BellIcon />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#00aeec]" />
            </button>

            {/* Divider */}
            <div className="w-px h-5 layout-divider mx-1" />

            {/* Profile dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen((o) => !o)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg layout-nav-idle transition-all"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #00aeec, #8b5cf6)" }}>
                  {initials}
                </div>
                {!collapsed && (
                  <span className="text-xs font-medium layout-title max-w-[100px] truncate hidden sm:block">
                    {user?.email?.split("@")[0]}
                  </span>
                )}
                <span className="layout-label-muted">
                  <ChevronIcon />
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-60 layout-dropdown rounded-xl shadow-2xl z-50 border layout-border overflow-hidden">
                  {/* User info */}
                  <div className="px-4 py-3 border-b layout-border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #00aeec, #8b5cf6)" }}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold layout-title truncate">{user?.email}</p>
                        <p className="text-xs layout-label-muted capitalize">{user?.role}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5">
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg layout-nav-idle transition-all text-left">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg layout-nav-idle transition-all text-left">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </button>

                    <div className="my-1 border-t layout-border" />

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-left"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto layout-content">
          {children}
        </main>
      </div>
    </div>
  );
}
