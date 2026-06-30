import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/landing/LandingPage";
import EnquiryPage from "./pages/enquiry/EnquiryPage";
import PrivacyPolicyPage from "./pages/legal/PrivacyPolicyPage";
import AdminLoginPage from "./pages/login/AdminLoginPage";
import AcceptInvitePage from "./pages/login/AcceptInvitePage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import EnquiryList from "./pages/superadmin/enquiries/EnquiryList";
import EnquiryDetails from "./pages/superadmin/enquiries/EnquiryDetails";
import LeadList from "./pages/superadmin/leads/LeadList";
import CalendarPage from "./pages/superadmin/leads/CalendarPage";
import CreateLead from "./pages/superadmin/leads/CreateLead";
import EditLead from "./pages/superadmin/leads/EditLead";
import LeadDetails from "./pages/superadmin/leads/LeadDetails";
import ClientList from "./pages/superadmin/clients/ClientList";
import CreateClient from "./pages/superadmin/clients/CreateClient";
import EditClient from "./pages/superadmin/clients/EditClient";
import ClientDetails from "./pages/superadmin/clients/ClientDetails";
import RolesPermissionsPage from "./pages/superadmin/settings/RolesPermissionsPage";
import SettingsLayout from "./pages/superadmin/settings/SettingsLayout";
import ProfileSettings from "./pages/superadmin/settings/ProfileSettings";
import GeneralSettings from "./pages/superadmin/settings/GeneralSettings";
import OrganizationSettings from "./pages/superadmin/settings/OrganizationSettings";
import CurrencyList from "./pages/superadmin/settings/currency/CurrencyList";
import CurrencyForm from "./pages/superadmin/settings/currency/CurrencyForm";
import CurrencyDetails from "./pages/superadmin/settings/currency/CurrencyDetails";
import CurrencyHistory from "./pages/superadmin/settings/currency/CurrencyHistory";
import SyncLogs from "./pages/superadmin/settings/currency/SyncLogs";
import NotificationsPage from "./pages/superadmin/settings/notifications/NotificationsPage";
import IndustryMasterPage from "./pages/superadmin/settings/IndustryMasterPage";
import DocumentTypesPage from "./pages/superadmin/settings/DocumentTypesPage";
import SecuritySettingsPage from "./pages/superadmin/settings/security/SecuritySettingsPage";
import ModuleRegistryPage from "./pages/superadmin/settings/modules/ModuleRegistryPage";
import Layout from "./components/Layout";
import SettingsVariantA from "./pages/mockups/SettingsVariantA";
import SettingsVariantB from "./pages/mockups/SettingsVariantB";
import SettingsVariantC from "./pages/mockups/SettingsVariantC";
import ClientLoginPage from "./pages/login/ClientLoginPage";
import ClientPortalPage from "./pages/portal/ClientPortalPage";
import AssetMasterList from "./pages/superadmin/assets/AssetMasterList";
import AssetMasterForm from "./pages/superadmin/assets/AssetMasterForm";
import AssetMasterDetails from "./pages/superadmin/assets/AssetMasterDetails";

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
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AdminLoginPage />} />
      <Route path="/admin" element={user ? <Navigate to="/dashboard" replace /> : <AdminLoginPage />} />
      <Route path="/client-login" element={<ClientLoginPage />} />
      <Route path="/accept-invite" element={<AcceptInvitePage />} />

      {/* Protected — general */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout><DashboardPage /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Legacy — redirect old security route to unified security settings */}
      <Route path="/superadmin/security" element={<Navigate to="/superadmin/settings/security" replace />} />

      {/* Protected — Enquiry Inbox */}
      <Route
        path="/superadmin/enquiries"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><EnquiryList /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/enquiries/:id"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><EnquiryDetails /></Layout>
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

      {/* Protected — Client Management (Client = tenant) */}
      <Route
        path="/superadmin/clients"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><ClientList /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/clients/new"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><CreateClient /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/clients/:id"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><ClientDetails /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/clients/:id/edit"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><EditClient /></Layout>
          </ProtectedRoute>
        }
      />


      {/* Protected — Settings */}
      <Route
        path="/superadmin/settings"
        element={<Navigate to="/superadmin/settings/profile" replace />}
      />
      <Route
        path="/superadmin/settings/profile"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><ProfileSettings /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/general"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><GeneralSettings /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/roles"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><RolesPermissionsPage /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/organization"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><OrganizationSettings /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />

      {/* Protected — Settings → Currency Management */}
      <Route
        path="/superadmin/settings/currencies"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><CurrencyList /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/currencies/new"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><CurrencyForm /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/currencies/sync-logs"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><SyncLogs /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/currencies/:id"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><CurrencyDetails /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/currencies/:id/edit"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><CurrencyForm /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/currencies/:id/history"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><CurrencyHistory /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />

      {/* Protected — Settings → Notifications */}
      <Route
        path="/superadmin/settings/security"
            element={
              <ProtectedRoute>
                <Layout><SettingsLayout><SecuritySettingsPage /></SettingsLayout></Layout>
              </ProtectedRoute>
            }
          />
      <Route
        path="/superadmin/settings/modules"
        element={
          <ProtectedRoute>
            <Layout><SettingsLayout><ModuleRegistryPage /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
          <Route
        path="/superadmin/settings/notifications"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><NotificationsPage /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/industries"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><IndustryMasterPage /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/settings/document-types"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><SettingsLayout><DocumentTypesPage /></SettingsLayout></Layout>
          </ProtectedRoute>
        }
      />

      {/* Protected — Asset Management → Asset Masters */}
      <Route
        path="/superadmin/assets/masters"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><AssetMasterList /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/assets/masters/new"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><AssetMasterForm /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/assets/masters/:id/edit"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><AssetMasterForm /></Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/superadmin/assets/masters/:id"
        element={
          <ProtectedRoute requireRole="superadmin">
            <Layout><AssetMasterDetails /></Layout>
          </ProtectedRoute>
        }
      />

      {/* Client Portal (public — path-based in dev, subdomain-based in prod) */}
      <Route path="/portal/:subdomain/*" element={<ClientPortalPage />} />

      {/* Fallback */}
      <Route path="/mockup/settings-a" element={<SettingsVariantA />} />
      <Route path="/mockup/settings-b" element={<SettingsVariantB />} />
      <Route path="/mockup/settings-c" element={<SettingsVariantC />} />
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
