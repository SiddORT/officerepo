import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../contexts/PortalAuthContext";
import { usePortalNav } from "../../contexts/PortalNavContext";
import { useTheme } from "../../contexts/ThemeContext";

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

// ── Shared mini-icon builder ───────────────────────────────────────────────
const SI = ({ d }) => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
);

const MODULE_SUB_NAV = {
  "org": [
    { label: "Companies",         path: "org/companies",      childModule: "Companies",         icon: <SI d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
    { label: "Branches",          path: "org/branches",       childModule: "Branches",          icon: <SI d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /> },
    { label: "Departments",       path: "org/departments",    childModule: "Departments",       icon: <SI d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { label: "Designations",      path: "org/designations",   childModule: "Designations",      icon: <SI d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /> },
    { label: "Employees",         path: "employees",          childModule: "Employees",         icon: <SI d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { label: "Employee Documents", path: "employee-documents", childModule: "Employee Documents", icon: <SI d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  ],
  "hrms": [
    { label: "Recruitment",         path: "recruitment",     childModule: "Recruitment",           icon: <SI d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /> },
    { label: "Interviews",          path: "hrms/interviews", childModule: "Interview Management",   icon: <SI d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /> },
    { label: "Offers",              path: "hrms/interviews/offers", childModule: "Recruitment",      icon: <SI d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { label: "Onboarding",          path: "hrms/onboarding", childModule: "Employee Onboarding",   icon: <SI d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
    { label: "Attendance",          path: "hrms/attendance", childModule: "Attendance Management", icon: <SI d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { label: "Leave",               path: "hrms/leave",      childModule: "Leave Management",      icon: <SI d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /> },
    { label: "Payroll",             path: "hrms/payroll",    childModule: "Payroll Management",    icon: <SI d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { label: "Loans",               path: "hrms/loans",      childModule: "Employee Loan Management", icon: <SI d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
    { label: "Expenses",            path: "hrms/expenses",   childModule: "Expense & Reimbursements", icon: <SI d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /> },
    { label: "Self Service",        path: "hrms/ess",        childModule: "Employee Self Service", icon: <SI d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  ],
  "assets": [
    { label: "Categories",     path: "assets/categories",    icon: <SI d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /> },
    { label: "Sub-Categories", path: "assets/sub-categories",icon: <SI d="M4 6h16M4 10h16M4 14h10M4 18h6" /> },
    { label: "Asset Inventory", path: "assets/inventory",    icon: <SI d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
    { label: "Assignment",    path: "assets/assignments",   childModule: "Asset Assignment",  icon: <SI d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /> },
    { label: "Transfers",     path: "assets/transfers",     childModule: "Asset Transfers",   icon: <SI d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /> },
    { label: "Returns",       path: "assets/returns",       childModule: "Asset Returns",     icon: <SI d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /> },
    { label: "Maintenance",   path: "assets/maintenance",   childModule: "Asset Maintenance", icon: <SI d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> },
    { label: "Audits",        path: "assets/audits",        childModule: "Asset Audits",      icon: <SI d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /> },
    { label: "Disposal",      path: "assets/disposal",      childModule: "Asset Disposal",    icon: <SI d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /> },
    { label: "Requests",      path: "assets/requests",      childModule: "Asset Requests",    icon: <SI d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /> },
  ],
  "crm": [
    { label: "Leads",         path: "crm/leads",         childModule: "CRM Leads",      icon: <SI d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { label: "Accounts",      path: "crm/accounts",      childModule: "Accounts",       icon: <SI d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
    { label: "Contacts",      path: "crm/contacts",      childModule: "Contacts",       icon: <SI d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    { label: "Opportunities", path: "crm/opportunities", childModule: "Opportunities",  icon: <SI d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> },
    { label: "Activities",    path: "crm/activities",    childModule: "CRM Activities", icon: <SI d="M13 10V3L4 14h7v7l9-11h-7z" /> },
    { label: "Quotes",        path: "crm/quotes",        childModule: "Quotes",         icon: <SI d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { label: "Customers",     path: "crm/customers",     childModule: "Customers",      icon: <SI d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /> },
  ],
  "lms": [
    { label: "Courses",       path: "lms/courses",        childModule: "Courses",       icon: <SI d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
    { label: "Learning Paths",path: "lms/paths",          childModule: "Learning Paths",icon: <SI d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /> },
    { label: "Assessments",   path: "lms/assessments",    childModule: "Assessments",   icon: <SI d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
    { label: "Certifications",path: "lms/certifications", childModule: "Certifications",icon: <SI d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /> },
  ],
  "bms": [
    { label: "Products",    path: "bms/products",   childModule: "Products",      icon: <SI d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
    { label: "Services",    path: "bms/services",   childModule: "Services",      icon: <SI d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
    { label: "Categories",  path: "bms/categories", childModule: "BMS Categories",icon: <SI d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /> },
    { label: "Customers",   path: "bms/customers",  childModule: "BMS Customers", icon: <SI d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { label: "Contracts",   path: "bms/contracts",  childModule: "Contracts",     icon: <SI d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  ],
  "finance": [
    { label: "Vendors",           path: "finance/vendors",           childModule: "Vendors",           icon: <SI d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /> },
    { label: "Purchase Requests", path: "finance/purchase-requests", childModule: "Purchase Requests", icon: <SI d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /> },
    { label: "Purchase Orders",   path: "finance/purchase-orders",   childModule: "Purchase Orders",   icon: <SI d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
    { label: "Invoices",          path: "finance/invoices",          childModule: "Invoices",          icon: <SI d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /> },
    { label: "Payments",          path: "finance/payments",          childModule: "Payments",          icon: <SI d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
    { label: "Budgets",           path: "finance/budgets",           childModule: "Budgets",           icon: <SI d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    { label: "Cost Centers",      path: "finance/cost-centers",      childModule: "Cost Centers",      icon: <SI d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  ],
  "tasks": [
    { label: "Projects",   path: "tasks/projects",   childModule: "Projects",   icon: <SI d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /> },
    { label: "Milestones", path: "tasks/milestones", childModule: "Milestones", icon: <SI d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /> },
    { label: "Task List",  path: "tasks/list",       childModule: "Task List",  icon: <SI d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
    { label: "Sprints",    path: "tasks/sprints",    childModule: "Sprints",    icon: <SI d="M13 10V3L4 14h7v7l9-11h-7z" /> },
    { label: "Timesheets", path: "tasks/timesheets", childModule: "Timesheets", icon: <SI d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  ],
  "helpdesk": [
    { label: "Tickets",           path: "helpdesk/tickets",     childModule: "Tickets",           icon: <SI d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /> },
    { label: "Service Catalog",   path: "helpdesk/catalog",     childModule: "Service Catalog",   icon: <SI d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
    { label: "SLA Management",    path: "helpdesk/sla",         childModule: "SLA Management",    icon: <SI d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
    { label: "Escalations",       path: "helpdesk/escalations", childModule: "Escalations",       icon: <SI d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> },
    { label: "Knowledge Articles",path: "helpdesk/knowledge",   childModule: "Knowledge Articles",icon: <SI d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
  ],
  "visitors": [
    { label: "Registration",  path: "visitors/registration",  childModule: "Visitor Registration",  icon: <SI d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /> },
    { label: "Pre-Approvals", path: "visitors/pre-approvals", childModule: "Pre-Approvals",         icon: <SI d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { label: "Check-In/Out",  path: "visitors/check-in",      childModule: "Check-In / Check-Out",  icon: <SI d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /> },
    { label: "Visitor Passes",path: "visitors/passes",        childModule: "Visitor Passes",        icon: <SI d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /> },
  ],
  "reports": [
    { label: "Org Reports",      path: "reports/org",       childModule: "Organization Reports", icon: <SI d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /> },
    { label: "HR Reports",       path: "reports/hr",        childModule: "HR Reports",           icon: <SI d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { label: "Asset Reports",    path: "reports/assets",    childModule: "Asset Reports",        icon: <SI d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
    { label: "Finance Reports",  path: "reports/finance",   childModule: "Finance Reports",      icon: <SI d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
    { label: "Scheduled Reports",path: "reports/scheduled", childModule: "Scheduled Reports",    icon: <SI d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
  ],
  "workflow": [
    { label: "Approval Workflows",    path: "workflow/approvals",    childModule: "Approval Workflows",    icon: <SI d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { label: "Automation Rules",      path: "workflow/automation",   childModule: "Automation Rules",      icon: <SI d="M13 10V3L4 14h7v7l9-11h-7z" /> },
    { label: "Notification Templates",path: "workflow/notifications",childModule: "Notification Templates",icon: <SI d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> },
    { label: "Escalation Rules",      path: "workflow/escalations",  childModule: "Escalation Rules",      icon: <SI d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> },
  ],
  "knowledge": [
    { label: "Knowledge Base", path: "knowledge", icon: <SI d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
  ],
  "billing": [
    { label: "Billing Management", path: "billing", icon: <SI d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
  ],
  "client-settings": [
    { label: "General",                path: "client-settings/general",         icon: <SI d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { label: "Company Branding",       path: "client-settings/branding",        icon: <SI d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { label: "Localization",           path: "client-settings/localization",    icon: <SI d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { label: "Notifications",          path: "client-settings/notifications",   icon: <SI d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> },
    { label: "Credentials",            path: "client-settings/credentials",     icon: <SI d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /> },
    { label: "Common Masters",         path: "client-settings/common-masters",  icon: <SI d="M4 6h16M4 10h16M4 14h10M4 18h6" /> },
    { label: "Document Templates",     path: "client-settings/doc-templates",   icon: <SI d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { label: "Email Templates",        path: "client-settings/email-templates", icon: <SI d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
  ],
  "user-management": [
    { label: "Users",      path: "user-management/users",      icon: <SI d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
    { label: "Roles",      path: "user-management/roles",      icon: <SI d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
    { label: "Login Logs", path: "user-management/login-logs", icon: <SI d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
    { label: "Sessions",   path: "user-management/sessions",   icon: <SI d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
    { label: "Activity",   path: "user-management/activity",   icon: <SI d="M13 10V3L4 14h7v7l9-11h-7z" /> },
  ],
};

// ── Icon map for dynamic module icons from the catalog ─────────────────────
function ModuleIcon({ icon }) {
  const ICONS = {
    "id-card":        "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2",
    "briefcase":      "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    "briefcase-alt":  "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    "package":        "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    "headphones":     "M3 18v-6a9 9 0 0118 0v6M3 18a1 1 0 001 1h1a1 1 0 001-1v-3a1 1 0 00-1-1H4a1 1 0 00-1 1v3zm16 0a1 1 0 01-1 1h-1a1 1 0 01-1-1v-3a1 1 0 011-1h1a1 1 0 011 1v3z",
    "credit-card":    "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    "bar-chart":      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    "book":           "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    "git-branch":     "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
    "user-plus":      "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    "building":       "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    "users":          "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    "academic-cap":   "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222",
    "currency":       "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    "clipboard-list": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  };
  const defaultPath = "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z";
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={ICONS[icon] || defaultPath} />
    </svg>
  );
}

export default function PortalLayout({ children, title }) {
  const { subdomain } = useParams();
  const { user, logout, token } = usePortalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth <= 640);
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 640);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const { navModules, workspaceName } = usePortalNav();
  const { isDark, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    function onClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    function onResize() {
      const mobile = window.innerWidth <= 640;
      setIsMobileView(mobile);
      if (mobile) setCollapsed(true);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--c-bg)", color: "var(--c-text)", position: "relative" }}>
      {/* ── Mobile backdrop (tap outside to close sidebar) ───────────────── */}
      {isMobileView && !collapsed && (
        <div onClick={() => setCollapsed(true)} style={{
          position: "absolute", inset: 0, zIndex: 199,
          background: "rgba(0,0,0,0.4)",
        }} />
      )}
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 56 : 220,
        flexShrink: isMobileView ? 0 : 0,
        display: "flex", flexDirection: "column",
        transition: "width 0.2s",
        borderRight: "1px solid var(--c-border)",
        background: "var(--c-surface)",
        position: isMobileView ? "absolute" : "relative",
        zIndex: isMobileView ? 200 : "auto",
        top: isMobileView ? 0 : undefined,
        left: isMobileView ? 0 : undefined,
        height: isMobileView ? "100%" : undefined,
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

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Theme toggle */}
            <button onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: 34, height: 34, borderRadius: 8, cursor: "pointer",
                border: "1px solid var(--c-border)", background: "transparent",
                color: "var(--c-muted)", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--c-surface2)"; e.currentTarget.style.color = "var(--c-text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--c-muted)"; }}>
              {isDark ? (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 5a7 7 0 100 14A7 7 0 0012 5z" />
                </svg>
              ) : (
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

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
          </div>{/* end topbar right flex */}
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
