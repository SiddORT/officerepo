import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { PortalAuthProvider, usePortalAuth } from "../../contexts/PortalAuthContext";
import PortalLoginPage from "./PortalLoginPage";
import PortalLayout from "./PortalLayout";
import PortalDashboard from "./PortalDashboard";

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

function PortalRoutes() {
  const { user, subdomain } = usePortalAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to={`/portal/${subdomain}/dashboard`} replace /> : <PortalLoginPage />}
      />
      <Route
        path="/dashboard"
        element={
          <PortalProtectedRoute>
            <PortalLayout title="Dashboard">
              <PortalDashboard />
            </PortalLayout>
          </PortalProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <PortalProtectedRoute>
            <PortalProfilePage />
          </PortalProtectedRoute>
        }
      />
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
