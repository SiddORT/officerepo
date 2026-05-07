import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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

        {/* ORT Logo */}
        <div className={`flex items-center border-b layout-border ${collapsed ? "justify-center px-3 py-4" : "px-4 py-4"} gap-3`}>
          <img
            src={isDark ? "/ort-logo-dark.png" : "/ort-logo-light.jpg"}
            alt="ORT"
            className={`object-contain flex-shrink-0 ${collapsed ? "h-7 w-auto" : "h-8 w-auto max-w-[110px]"}`}
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-widest uppercase layout-label-muted">Office Repo</p>
            </div>
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

        {/* Sidebar footer — collapse toggle only */}
        <div className="px-2 pb-4 border-t layout-border pt-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm layout-nav-idle transition-all"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              }
            </svg>
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
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
                  style={{ backgroundColor: "#00aeec" }}>
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
                        style={{ backgroundColor: "#00aeec" }}>
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
