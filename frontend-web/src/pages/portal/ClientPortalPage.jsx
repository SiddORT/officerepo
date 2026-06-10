import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { PortalAuthProvider, usePortalAuth } from "../../contexts/PortalAuthContext";
import PortalLoginPage from "./PortalLoginPage";
import PortalLayout from "./PortalLayout";
import PortalDashboard from "./PortalDashboard";
import PortalAcceptInvitePage from "./PortalAcceptInvitePage";

// User Management pages
import UserList from "./user-management/UserList";
import UserForm from "./user-management/UserForm";
import UserDetails from "./user-management/UserDetails";
import RoleList from "./user-management/RoleList";
import RoleForm from "./user-management/RoleForm";
import LoginLogs from "./user-management/LoginLogs";
import Sessions from "./user-management/Sessions";
import ActivityLogs from "./user-management/ActivityLogs";

// Employee Management pages
import EmployeeList from "./employees/EmployeeList";
import EmployeeForm from "./employees/EmployeeForm";
import EmployeeDetails from "./employees/EmployeeDetails";

// Asset Management pages
import AssetCatalog from "./assets/AssetCatalog";
import AssetCategories from "./assets/AssetCategories";

// Organization Management pages
import CompanyList from "./org-management/CompanyList";
import CompanyForm from "./org-management/CompanyForm";
import DepartmentList from "./org-management/DepartmentList";
import DepartmentForm from "./org-management/DepartmentForm";
import DepartmentDetails from "./org-management/DepartmentDetails";
import DesignationList from "./org-management/DesignationList";
import DesignationForm from "./org-management/DesignationForm";
import DesignationDetails from "./org-management/DesignationDetails";
import BranchList from "./org-management/BranchList";
import OrgHierarchy from "./org-management/OrgHierarchy";

function PortalProtectedRoute({ children }) {
  const { user, subdomain } = usePortalAuth();
  if (!user) return <Navigate to={`/portal/${subdomain}`} replace />;
  return children;
}

function PortalProfilePage() {
  const { user } = usePortalAuth();
  const { subdomain } = useParams();
  return (
    <PortalLayout title="My Profile">
      <div className="max-w-lg space-y-4">
        <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>Profile</h2>
        <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #00aeec, #ff7a1a)" }}>
              {(user?.name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div className="font-semibold" style={{ color: "var(--c-heading)" }}>{user?.name}</div>
              <div className="text-sm" style={{ color: "var(--c-muted)" }}>{user?.email}</div>
            </div>
          </div>
          <div className="pt-3" style={{ borderTop: "1px solid var(--c-border)" }}>
            <div className="text-xs" style={{ color: "var(--c-muted)" }}>
              Workspace: <span className="font-medium" style={{ color: "var(--c-text)" }}>{subdomain}.{import.meta.env.VITE_BASE_DOMAIN || window.location.hostname}</span>
            </div>
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--c-muted)" }}>Profile editing coming soon.</p>
      </div>
    </PortalLayout>
  );
}

function Protected({ children }) {
  return <PortalProtectedRoute>{children}</PortalProtectedRoute>;
}

function PortalRoutes() {
  const { user, subdomain } = usePortalAuth();

  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={user ? <Navigate to={`/portal/${subdomain}/dashboard`} replace /> : <PortalLoginPage />} />
      <Route path="/accept-invite" element={<PortalAcceptInvitePage />} />

      {/* Dashboard + profile */}
      <Route path="/dashboard" element={<Protected><PortalLayout title="Dashboard"><PortalDashboard /></PortalLayout></Protected>} />
      <Route path="/profile"   element={<Protected><PortalProfilePage /></Protected>} />

      {/* ── User Management ─────────────────────────────────────────── */}
      <Route path="/user-management/users"            element={<Protected><UserList /></Protected>} />
      <Route path="/user-management/users/new"        element={<Protected><UserForm editMode={false} /></Protected>} />
      <Route path="/user-management/users/:userId"     element={<Protected><UserDetails /></Protected>} />
      <Route path="/user-management/users/:userId/edit" element={<Protected><UserForm editMode={true} /></Protected>} />

      <Route path="/user-management/roles"            element={<Protected><RoleList /></Protected>} />
      <Route path="/user-management/roles/new"        element={<Protected><RoleForm editMode={false} /></Protected>} />
      <Route path="/user-management/roles/:roleId/edit" element={<Protected><RoleForm editMode={true} /></Protected>} />

      <Route path="/user-management/login-logs"  element={<Protected><LoginLogs /></Protected>} />
      <Route path="/user-management/sessions"    element={<Protected><Sessions /></Protected>} />
      <Route path="/user-management/activity"    element={<Protected><ActivityLogs /></Protected>} />

      {/* Redirect /user-management root → users list */}
      <Route path="/user-management" element={<Navigate to={`/portal/${subdomain}/user-management/users`} replace />} />
      <Route path="/user-management/*" element={<Navigate to={`/portal/${subdomain}/user-management/users`} replace />} />

      {/* ── Employee Management ──────────────────────────────────────── */}
      <Route path="/employees"              element={<Protected><EmployeeList /></Protected>} />
      <Route path="/employees/new"          element={<Protected><EmployeeForm editMode={false} /></Protected>} />
      <Route path="/employees/:empId"       element={<Protected><EmployeeDetails /></Protected>} />
      <Route path="/employees/:empId/edit"  element={<Protected><EmployeeForm editMode={true} /></Protected>} />

      {/* Redirect /employees root */}
      <Route path="/employees/*" element={<Navigate to={`/portal/${subdomain}/employees`} replace />} />

      {/* ── Organization Management ──────────────────────────────────── */}
      <Route path="/org/companies"          element={<Protected><CompanyList /></Protected>} />
      <Route path="/org/companies/new"      element={<Protected><CompanyForm editMode={false} /></Protected>} />
      <Route path="/org/companies/:companyId/edit" element={<Protected><CompanyForm editMode={true} /></Protected>} />

      <Route path="/org/branches"           element={<Protected><BranchList /></Protected>} />

      <Route path="/org/departments"        element={<Protected><DepartmentList /></Protected>} />
      <Route path="/org/departments/new"    element={<Protected><DepartmentForm editMode={false} /></Protected>} />
      <Route path="/org/departments/hierarchy/:companyId" element={<Protected><OrgHierarchy /></Protected>} />
      <Route path="/org/departments/:deptId" element={<Protected><DepartmentDetails /></Protected>} />
      <Route path="/org/departments/:deptId/edit" element={<Protected><DepartmentForm editMode={true} /></Protected>} />

      <Route path="/org/designations"                    element={<Protected><DesignationList /></Protected>} />
      <Route path="/org/designations/new"               element={<Protected><DesignationForm editMode={false} /></Protected>} />
      <Route path="/org/designations/:desigId"          element={<Protected><DesignationDetails /></Protected>} />
      <Route path="/org/designations/:desigId/edit"     element={<Protected><DesignationForm editMode={true} /></Protected>} />

      <Route path="/org/hierarchy/:companyId" element={<Protected><OrgHierarchy /></Protected>} />

      {/* Redirect /org root → companies */}
      <Route path="/org" element={<Navigate to={`/portal/${subdomain}/org/companies`} replace />} />
      <Route path="/org/*" element={<Navigate to={`/portal/${subdomain}/org/companies`} replace />} />

      {/* ── Asset Management ─────────────────────────────────────────── */}
      <Route path="/assets/catalog"    element={<Protected><AssetCatalog /></Protected>} />
      <Route path="/assets/categories" element={<Protected><AssetCategories /></Protected>} />
      <Route path="/assets"   element={<Navigate to={`/portal/${subdomain}/assets/catalog`} replace />} />
      <Route path="/assets/*" element={<Navigate to={`/portal/${subdomain}/assets/catalog`} replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? `/portal/${subdomain}/dashboard` : `/portal/${subdomain}`} replace />} />
    </Routes>
  );
}

export default function ClientPortalPage() {
  const { subdomain } = useParams();
  return (
    <PortalAuthProvider subdomain={subdomain}>
      <PortalRoutes />
    </PortalAuthProvider>
  );
}
