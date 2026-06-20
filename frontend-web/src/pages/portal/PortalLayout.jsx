import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../contexts/PortalAuthContext";
import { portalNavigationApi } from "../../services/apiClient";

// ── Static nav (always shown, regardless of module toggles) ───────────────
// Only Dashboard is hardcoded. Every other module comes from the API-driven
// navModules list so enabling/disabling a module is instantly reflected here.
const STATIC_NAV = [
  {
    label: "Dashboard", path: "dashboard",
    icon: <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
  },
];

// ── Sub-nav definitions (keyed by mod.route from the catalog) ─────────────
// Each entry may carry a `childModule` field matching the child module name in
// client_modules — used to filter to only enabled children (via enabled_children
// returned by the nav API). Items without childModule are always shown.
const MODULE_SUB_NAV = {
  "org": [
    {
      label: "Companies", path: "org/companies", childModule: "Companies",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    },
    {
      label: "Branches", path: "org/branches", childModule: "Branches",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>,
    },
    {
      label: "Departments", path: "org/departments", childModule: "Departments",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: "Designations", path: "org/designations", childModule: "Designations",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>,
    },
    {
      label: "Employees", path: "employees", childModule: "Employees",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: "Employee Documents", path: "employee-documents", childModule: "Employee Documents",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
  ],
  "hrms": [
    {
      label: "Recruitment", path: "recruitment", childModule: "Recruitment",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
    },
    {
      label: "Interview Management", path: "hrms/interviews", childModule: "Interview Management",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
    },
    {
      label: "Employee Onboarding", path: "hrms/onboarding", childModule: "Employee Onboarding",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    },
    {
      label: "Attendance", path: "hrms/attendance", childModule: "Attendance Management",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    },
    {
      label: "Leave", path: "hrms/leave", childModule: "Leave Management",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    },
    {
      label: "Payroll", path: "hrms/payroll", childModule: "Payroll Management",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: "Loans", path: "hrms/loans", childModule: "Employee Loan Management",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
    },
    {
      label: "Expenses", path: "hrms/expenses", childModule: "Expense & Reimbursements",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>,
    },
  ],
  "assets": [
    {
      label: "Categories", path: "assets/categories",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
    },
    {
      label: "Sub-Categories", path: "assets/sub-categories",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h6" /></svg>,
    },
    {
      label: "Asset Inventory", path: "assets/inventory", childModule: "Asset Inventory",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    },
    {
      label: "Maintenance", path: "assets/maintenance", childModule: "Asset Maintenance",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    },
    {
      label: "Audits", path: "assets/audits", childModule: "Asset Audits",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
    },
    {
      label: "Requests", path: "assets/requests", childModule: "Asset Requests",
      icon: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>,
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
    if (!token || !subdomain) {
      console.log("[PortalNav] skip — no token or subdomain", { token: !!token, subdomain });
      return;
    }
    try {
      const res = await portalNavigationApi.getNavigation(subdomain, token);
      const payload = res.data?.data || res.data || {};
      const mods = payload.modules || [];
      console.log("[PortalNav] loaded", mods.map(m => m.code));
      setNavModules(mods);
      if (payload.workspace_name) setWorkspaceName(payload.workspace_name);
    } catch (err) {
      console.error("[PortalNav] failed", err?.response?.status, err?.message);
      setNavModules([]);
    }
  }, [token, subdomain]);

  useEffect(() => { loadNavigation(); }, [loadNavigation]);

  // Re-fetch nav when the user switches back to this tab (e.g. after toggling
  // a module in the superadmin panel) so the sidebar stays in sync.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") loadNavigation();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadNavigation]);

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
    color: isActive ? "#ffffff" : "var(--c-muted)",
    background: isActive ? "linear-gradient(135deg, #00aeec, #ff7a1a)" : "transparent",
    boxShadow: isActive ? "0 2px 14px rgba(0,174,236,0.30), 0 1px 4px rgba(255,122,26,0.18)" : "none",
    fontWeight: isActive ? 600 : 400,
    justifyContent: collapsed ? "center" : "flex-start",
  });

  const subNavLinkStyle = (isActive) => ({
    display: "flex", alignItems: "center", gap: 8,
    padding: "5px 8px 5px 28px",
    borderRadius: 6, fontSize: 12, textDecoration: "none", transition: "all 0.12s",
    color: isActive ? "var(--c-accent)" : "var(--c-muted)",
    background: isActive ? "var(--c-accent-dim)" : "transparent",
    fontWeight: isActive ? 700 : 400,
    borderLeft: isActive ? "2px solid var(--c-accent)" : "2px solid transparent",
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
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #00aeec, #ff7a1a)", zIndex: 1 }} />
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
            // Also activate parent section when any sub-item's path matches
            const subPaths = subItems.map((s) => `/portal/${subdomain}/${s.path}`);
            const isActive = subItems.length > 0
              ? location.pathname.startsWith(basePath) ||
                subPaths.some((sp) => location.pathname.startsWith(sp))
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
                const enabledChildren = mod.enabled_children || [];
                // Filter sub-nav items: show if no childModule (always visible) or childModule is in enabled_children
                const allSubItems = MODULE_SUB_NAV[modRoute] || [];
                const subItems = allSubItems.filter((s) =>
                  !s.childModule || enabledChildren.includes(s.childModule)
                );
                // When sub-items exist, navigate to the first one; otherwise go to the module route.
                const firstSub = subItems[0];
                const href = firstSub
                  ? `/portal/${subdomain}/${firstSub.path}`
                  : `/portal/${subdomain}/${modRoute}`;
                // Module is "active" if we're anywhere under its route OR on any of its sub-paths.
                const modBase = `/portal/${subdomain}/${modRoute}`;
                const isModActive = location.pathname.startsWith(modBase)
                  || allSubItems.some(s => location.pathname.startsWith(`/portal/${subdomain}/${s.path}`));

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
          boxShadow: "inset 0 -1px 0 var(--c-border), 0 2px 8px rgba(0,0,0,0.06)",
          background: "var(--c-surface)",
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
