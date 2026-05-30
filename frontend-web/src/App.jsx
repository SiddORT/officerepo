import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/landing/LandingPage";
import EnquiryPage from "./pages/enquiry/EnquiryPage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import LoginPage from "./pages/login/LoginPage";
import AdminLoginPage from "./pages/login/AdminLoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import SuperAdminPage from "./pages/superadmin/SuperAdminPage";
import SecurityPage from "./pages/superadmin/SecurityPage";
import TenantList from "./pages/superadmin/tenants/TenantList";
import CreateTenant from "./pages/superadmin/tenants/CreateTenant";
import EditTenant from "./pages/superadmin/tenants/EditTenant";
import TenantDetails from "./pages/superadmin/tenants/TenantDetails";
import Layout from "./components/Layout";

function ProtectedRoute({ children, requireRole }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requireRole && user.role !== requireRole) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/contact" element={<EnquiryPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/admin" element={user ? <Navigate to="/dashboard" replace /> : <AdminLoginPage />} />

      {/* Protected — general */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Protected — superadmin legacy */}
      <Route
        path="/superadmin"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SuperAdminPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Protected — Security / Secret Rotation */}
      <Route
        path="/superadmin/security"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SecurityPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Protected — Tenant Management Module */}
      <Route
        path="/superadmin/tenants"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><TenantList /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/tenants/new"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><CreateTenant /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/tenants/:id"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><TenantDetails /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/tenants/:id/edit"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><EditTenant /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
