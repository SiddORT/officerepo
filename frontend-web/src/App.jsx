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
import LeadList from "./pages/superadmin/leads/LeadList";
import CalendarPage from "./pages/superadmin/leads/CalendarPage";
import CreateLead from "./pages/superadmin/leads/CreateLead";
import EditLead from "./pages/superadmin/leads/EditLead";
import LeadDetails from "./pages/superadmin/leads/LeadDetails";
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

      {/* Protected — Lead Management & Sales Pipeline */}
      <Route
        path="/superadmin/leads"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><LeadList /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/leads/calendar"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><CalendarPage /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/leads/new"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><CreateLead /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/leads/:id"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><LeadDetails /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/leads/:id/edit"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><EditLead /></Layout>
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
