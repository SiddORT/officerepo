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
