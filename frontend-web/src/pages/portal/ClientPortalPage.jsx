import React from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { PortalAuthProvider, usePortalAuth } from "../../contexts/PortalAuthContext";
import { PortalNavProvider } from "../../contexts/PortalNavContext";
import PortalLoginPage from "./PortalLoginPage";
import PortalLayout from "./PortalLayout";
import PortalDashboard from "./PortalDashboard";
import PortalAcceptInvitePage from "./PortalAcceptInvitePage";
import PortalComingSoon from "./shared/PortalComingSoon";

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

// Employee Document Management pages
import EmployeeDocList from "./employee-documents/EmployeeDocList";
import EmployeeDocForm from "./employee-documents/EmployeeDocForm";
import EmployeeDocDetails from "./employee-documents/EmployeeDocDetails";
import DocTypeList from "./employee-documents/DocTypeList";

// Recruitment pages
import RecruitmentDashboard from "./recruitment/RecruitmentDashboard";
import RequisitionList from "./recruitment/RequisitionList";
import RequisitionForm from "./recruitment/RequisitionForm";
import RequisitionDetails from "./recruitment/RequisitionDetails";
import JobOpeningList from "./recruitment/JobOpeningList";
import JobOpeningForm from "./recruitment/JobOpeningForm";
import CandidateList from "./recruitment/CandidateList";
import CandidateForm from "./recruitment/CandidateForm";
import CandidateDetails from "./recruitment/CandidateDetails";
import OfferList from "./recruitment/OfferList";
import OfferForm from "./recruitment/OfferForm";

// Interview Management pages
import InterviewDashboard from "./interview/InterviewDashboard";
import InterviewList from "./interview/InterviewList";
import InterviewForm from "./interview/InterviewForm";
import InterviewDetails from "./interview/InterviewDetails";
import InterviewComplete from "./interview/InterviewComplete";

// Asset Management pages
import AssetCategories from "./assets/AssetCategories";
import AssetSubCategoryList from "./assets/AssetSubCategoryList";
import AssetInventoryList from "./assets/AssetInventoryList";
import AssetInventoryForm from "./assets/AssetInventoryForm";
import AssetInventoryDetails from "./assets/AssetInventoryDetails";

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

// Shorthand helper: protected ComingSoon placeholder route
function CS({ module, submodule, description }) {
  return (
    <Protected>
      <PortalComingSoon module={module} submodule={submodule} description={description} />
    </Protected>
  );
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
      <Route path="/user-management/users"               element={<Protected><UserList /></Protected>} />
      <Route path="/user-management/users/new"           element={<Protected><UserForm editMode={false} /></Protected>} />
      <Route path="/user-management/users/:userId"       element={<Protected><UserDetails /></Protected>} />
      <Route path="/user-management/users/:userId/edit"  element={<Protected><UserForm editMode={true} /></Protected>} />
      <Route path="/user-management/roles"               element={<Protected><RoleList /></Protected>} />
      <Route path="/user-management/roles/new"           element={<Protected><RoleForm editMode={false} /></Protected>} />
      <Route path="/user-management/roles/:roleId/edit"  element={<Protected><RoleForm editMode={true} /></Protected>} />
      <Route path="/user-management/login-logs"          element={<Protected><LoginLogs /></Protected>} />
      <Route path="/user-management/sessions"            element={<Protected><Sessions /></Protected>} />
      <Route path="/user-management/activity"            element={<Protected><ActivityLogs /></Protected>} />
      <Route path="/user-management"  element={<Navigate to={`/portal/${subdomain}/user-management/users`} replace />} />
      <Route path="/user-management/*" element={<Navigate to={`/portal/${subdomain}/user-management/users`} replace />} />

      {/* ── Employee Management ──────────────────────────────────────── */}
      <Route path="/employees"             element={<Protected><EmployeeList /></Protected>} />
      <Route path="/employees/new"         element={<Protected><EmployeeForm editMode={false} /></Protected>} />
      <Route path="/employees/:empId"      element={<Protected><EmployeeDetails /></Protected>} />
      <Route path="/employees/:empId/edit" element={<Protected><EmployeeForm editMode={true} /></Protected>} />
      <Route path="/employees/*"           element={<Navigate to={`/portal/${subdomain}/employees`} replace />} />

      {/* ── Organization Management ──────────────────────────────────── */}
      <Route path="/org/companies"                       element={<Protected><CompanyList /></Protected>} />
      <Route path="/org/companies/new"                   element={<Protected><CompanyForm editMode={false} /></Protected>} />
      <Route path="/org/companies/:companyId/edit"       element={<Protected><CompanyForm editMode={true} /></Protected>} />
      <Route path="/org/branches"                        element={<Protected><BranchList /></Protected>} />
      <Route path="/org/departments"                     element={<Protected><DepartmentList /></Protected>} />
      <Route path="/org/departments/new"                 element={<Protected><DepartmentForm editMode={false} /></Protected>} />
      <Route path="/org/departments/hierarchy/:companyId" element={<Protected><OrgHierarchy /></Protected>} />
      <Route path="/org/departments/:deptId"             element={<Protected><DepartmentDetails /></Protected>} />
      <Route path="/org/departments/:deptId/edit"        element={<Protected><DepartmentForm editMode={true} /></Protected>} />
      <Route path="/org/designations"                    element={<Protected><DesignationList /></Protected>} />
      <Route path="/org/designations/new"                element={<Protected><DesignationForm editMode={false} /></Protected>} />
      <Route path="/org/designations/:desigId"           element={<Protected><DesignationDetails /></Protected>} />
      <Route path="/org/designations/:desigId/edit"      element={<Protected><DesignationForm editMode={true} /></Protected>} />
      <Route path="/org/hierarchy/:companyId"            element={<Protected><OrgHierarchy /></Protected>} />
      <Route path="/org"   element={<Navigate to={`/portal/${subdomain}/org/companies`} replace />} />
      <Route path="/org/*" element={<Navigate to={`/portal/${subdomain}/org/companies`} replace />} />

      {/* ── Employee Documents ───────────────────────────────────────── */}
      <Route path="/employee-documents/types"       element={<Protected><PortalLayout title="Document Types"><DocTypeList /></PortalLayout></Protected>} />
      <Route path="/employee-documents/new"         element={<Protected><EmployeeDocForm /></Protected>} />
      <Route path="/employee-documents/:docId/edit" element={<Protected><EmployeeDocForm /></Protected>} />
      <Route path="/employee-documents/:docId"      element={<Protected><EmployeeDocDetails /></Protected>} />
      <Route path="/employee-documents"             element={<Protected><EmployeeDocList /></Protected>} />
      <Route path="/employee-documents/*"           element={<Navigate to={`/portal/${subdomain}/employee-documents`} replace />} />

      {/* ── Asset Management ─────────────────────────────────────────── */}
      <Route path="/assets/categories"              element={<Protected><AssetCategories /></Protected>} />
      <Route path="/assets/sub-categories"          element={<Protected><AssetSubCategoryList /></Protected>} />
      <Route path="/assets/inventory/new"           element={<Protected><AssetInventoryForm editMode={false} /></Protected>} />
      <Route path="/assets/inventory/:assetId/edit" element={<Protected><AssetInventoryForm editMode={true} /></Protected>} />
      <Route path="/assets/inventory/:assetId"      element={<Protected><AssetInventoryDetails /></Protected>} />
      <Route path="/assets/inventory"               element={<Protected><AssetInventoryList /></Protected>} />
      <Route path="/assets/maintenance"  element={<CS module="Asset Management" submodule="Asset Maintenance" />} />
      <Route path="/assets/audits"       element={<CS module="Asset Management" submodule="Asset Audits" />} />
      <Route path="/assets/requests"     element={<CS module="Asset Management" submodule="Asset Requests" />} />
      <Route path="/assets/assignments"  element={<CS module="Asset Management" submodule="Asset Assignment" />} />
      <Route path="/assets/transfers"    element={<CS module="Asset Management" submodule="Asset Transfers" />} />
      <Route path="/assets/returns"      element={<CS module="Asset Management" submodule="Asset Returns" />} />
      <Route path="/assets/disposal"     element={<CS module="Asset Management" submodule="Asset Disposal" />} />
      <Route path="/assets"   element={<Navigate to={`/portal/${subdomain}/assets/inventory`} replace />} />
      <Route path="/assets/*" element={<Navigate to={`/portal/${subdomain}/assets/inventory`} replace />} />

      {/* ── Recruitment ───────────────────────────────────────────── */}
      <Route path="/recruitment" element={<Protected><PortalLayout title="Recruitment"><RecruitmentDashboard /></PortalLayout></Protected>} />
      <Route path="/recruitment/requisitions/new"         element={<Protected><PortalLayout title="New Requisition"><RequisitionForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/recruitment/requisitions/:reqId/edit" element={<Protected><PortalLayout title="Edit Requisition"><RequisitionForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/recruitment/requisitions/:reqId"      element={<Protected><PortalLayout title="Requisition Details"><RequisitionDetails /></PortalLayout></Protected>} />
      <Route path="/recruitment/requisitions"             element={<Protected><PortalLayout title="Job Requisitions"><RequisitionList /></PortalLayout></Protected>} />
      <Route path="/recruitment/openings/new"             element={<Protected><PortalLayout title="New Opening"><JobOpeningForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/recruitment/openings/:openingId/edit" element={<Protected><PortalLayout title="Edit Opening"><JobOpeningForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/recruitment/openings"                 element={<Protected><PortalLayout title="Job Openings"><JobOpeningList /></PortalLayout></Protected>} />
      <Route path="/recruitment/candidates/new"           element={<Protected><PortalLayout title="Add Candidate"><CandidateForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/recruitment/candidates/:candId/edit"  element={<Protected><PortalLayout title="Edit Candidate"><CandidateForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/recruitment/candidates/:candId"       element={<Protected><PortalLayout title="Candidate Details"><CandidateDetails /></PortalLayout></Protected>} />
      <Route path="/recruitment/candidates"               element={<Protected><PortalLayout title="Candidates"><CandidateList /></PortalLayout></Protected>} />
      <Route path="/recruitment/offers/new"               element={<Protected><PortalLayout title="Create Offer"><OfferForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/recruitment/offers/:offerId/edit"     element={<Protected><PortalLayout title="Edit Offer"><OfferForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/recruitment/offers"                   element={<Protected><PortalLayout title="Offers"><OfferList /></PortalLayout></Protected>} />
      <Route path="/recruitment/*" element={<Navigate to={`/portal/${subdomain}/recruitment`} replace />} />

      {/* ── Interview Management ──────────────────────────────────────── */}
      <Route path="/hrms/interviews/new"              element={<Protected><PortalLayout title="Schedule Interview"><InterviewForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/:interviewId/edit"     element={<Protected><PortalLayout title="Edit Interview"><InterviewForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/:interviewId/complete" element={<Protected><PortalLayout title="Complete Interview"><InterviewComplete /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/:interviewId"          element={<Protected><PortalLayout title="Interview Details"><InterviewDetails /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/list"             element={<Protected><PortalLayout title="All Interviews"><InterviewList /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews"                  element={<Protected><PortalLayout title="Interview Management"><InterviewDashboard /></PortalLayout></Protected>} />
      <Route path="/hrms/onboarding"  element={<CS module="HRMS" submodule="Employee Onboarding" />} />
      <Route path="/hrms/attendance"  element={<CS module="HRMS" submodule="Attendance Management" />} />
      <Route path="/hrms/leave"       element={<CS module="HRMS" submodule="Leave Management" />} />
      <Route path="/hrms/payroll"     element={<CS module="HRMS" submodule="Payroll Management" />} />
      <Route path="/hrms/loans"       element={<CS module="HRMS" submodule="Employee Loan Management" />} />
      <Route path="/hrms/expenses"    element={<CS module="HRMS" submodule="Expense & Reimbursements" />} />
      <Route path="/hrms/ess"         element={<CS module="HRMS" submodule="Employee Self Service" />} />
      <Route path="/hrms"             element={<Navigate to={`/portal/${subdomain}/recruitment`} replace />} />
      <Route path="/hrms/*"           element={<Navigate to={`/portal/${subdomain}/recruitment`} replace />} />

      {/* ── CRM ──────────────────────────────────────────────────────── */}
      <Route path="/crm/leads"         element={<CS module="CRM" submodule="CRM Leads" />} />
      <Route path="/crm/accounts"      element={<CS module="CRM" submodule="Accounts" />} />
      <Route path="/crm/contacts"      element={<CS module="CRM" submodule="Contacts" />} />
      <Route path="/crm/opportunities" element={<CS module="CRM" submodule="Opportunities" />} />
      <Route path="/crm/activities"    element={<CS module="CRM" submodule="CRM Activities" />} />
      <Route path="/crm/quotes"        element={<CS module="CRM" submodule="Quotes" />} />
      <Route path="/crm/customers"     element={<CS module="CRM" submodule="Customers" />} />
      <Route path="/crm"               element={<Navigate to={`/portal/${subdomain}/crm/leads`} replace />} />
      <Route path="/crm/*"             element={<Navigate to={`/portal/${subdomain}/crm/leads`} replace />} />

      {/* ── LMS ──────────────────────────────────────────────────────── */}
      <Route path="/lms/courses"        element={<CS module="LMS" submodule="Courses" />} />
      <Route path="/lms/paths"          element={<CS module="LMS" submodule="Learning Paths" />} />
      <Route path="/lms/assessments"    element={<CS module="LMS" submodule="Assessments" />} />
      <Route path="/lms/certifications" element={<CS module="LMS" submodule="Certifications" />} />
      <Route path="/lms"                element={<Navigate to={`/portal/${subdomain}/lms/courses`} replace />} />
      <Route path="/lms/*"              element={<Navigate to={`/portal/${subdomain}/lms/courses`} replace />} />

      {/* ── BMS ──────────────────────────────────────────────────────── */}
      <Route path="/bms/products"   element={<CS module="BMS" submodule="Products" />} />
      <Route path="/bms/services"   element={<CS module="BMS" submodule="Services" />} />
      <Route path="/bms/categories" element={<CS module="BMS" submodule="BMS Categories" />} />
      <Route path="/bms/customers"  element={<CS module="BMS" submodule="BMS Customers" />} />
      <Route path="/bms/contracts"  element={<CS module="BMS" submodule="Contracts" />} />
      <Route path="/bms"            element={<Navigate to={`/portal/${subdomain}/bms/products`} replace />} />
      <Route path="/bms/*"          element={<Navigate to={`/portal/${subdomain}/bms/products`} replace />} />

      {/* ── Finance & Procurement ────────────────────────────────────── */}
      <Route path="/finance/vendors"           element={<CS module="Finance & Procurement" submodule="Vendors" />} />
      <Route path="/finance/purchase-requests" element={<CS module="Finance & Procurement" submodule="Purchase Requests" />} />
      <Route path="/finance/purchase-orders"   element={<CS module="Finance & Procurement" submodule="Purchase Orders" />} />
      <Route path="/finance/invoices"          element={<CS module="Finance & Procurement" submodule="Invoices" />} />
      <Route path="/finance/payments"          element={<CS module="Finance & Procurement" submodule="Payments" />} />
      <Route path="/finance/budgets"           element={<CS module="Finance & Procurement" submodule="Budgets" />} />
      <Route path="/finance/cost-centers"      element={<CS module="Finance & Procurement" submodule="Cost Centers" />} />
      <Route path="/finance"                   element={<Navigate to={`/portal/${subdomain}/finance/vendors`} replace />} />
      <Route path="/finance/*"                 element={<Navigate to={`/portal/${subdomain}/finance/vendors`} replace />} />

      {/* ── Task & Project Management ────────────────────────────────── */}
      <Route path="/tasks/projects"   element={<CS module="Task & Project Management" submodule="Projects" />} />
      <Route path="/tasks/milestones" element={<CS module="Task & Project Management" submodule="Milestones" />} />
      <Route path="/tasks/list"       element={<CS module="Task & Project Management" submodule="Task List" />} />
      <Route path="/tasks/sprints"    element={<CS module="Task & Project Management" submodule="Sprints" />} />
      <Route path="/tasks/timesheets" element={<CS module="Task & Project Management" submodule="Timesheets" />} />
      <Route path="/tasks"            element={<Navigate to={`/portal/${subdomain}/tasks/projects`} replace />} />
      <Route path="/tasks/*"          element={<Navigate to={`/portal/${subdomain}/tasks/projects`} replace />} />

      {/* ── Helpdesk ─────────────────────────────────────────────────── */}
      <Route path="/helpdesk/tickets"     element={<CS module="Helpdesk" submodule="Tickets" />} />
      <Route path="/helpdesk/catalog"     element={<CS module="Helpdesk" submodule="Service Catalog" />} />
      <Route path="/helpdesk/sla"         element={<CS module="Helpdesk" submodule="SLA Management" />} />
      <Route path="/helpdesk/escalations" element={<CS module="Helpdesk" submodule="Escalations" />} />
      <Route path="/helpdesk/knowledge"   element={<CS module="Helpdesk" submodule="Knowledge Articles" />} />
      <Route path="/helpdesk"             element={<Navigate to={`/portal/${subdomain}/helpdesk/tickets`} replace />} />
      <Route path="/helpdesk/*"           element={<Navigate to={`/portal/${subdomain}/helpdesk/tickets`} replace />} />

      {/* ── Visitor Management ───────────────────────────────────────── */}
      <Route path="/visitors/registration"  element={<CS module="Visitor Management" submodule="Visitor Registration" />} />
      <Route path="/visitors/pre-approvals" element={<CS module="Visitor Management" submodule="Pre-Approvals" />} />
      <Route path="/visitors/check-in"      element={<CS module="Visitor Management" submodule="Check-In / Check-Out" />} />
      <Route path="/visitors/passes"        element={<CS module="Visitor Management" submodule="Visitor Passes" />} />
      <Route path="/visitors"               element={<Navigate to={`/portal/${subdomain}/visitors/registration`} replace />} />
      <Route path="/visitors/*"             element={<Navigate to={`/portal/${subdomain}/visitors/registration`} replace />} />

      {/* ── Billing Management ───────────────────────────────────────── */}
      <Route path="/billing"   element={<CS module="Billing Management" />} />
      <Route path="/billing/*" element={<CS module="Billing Management" />} />

      {/* ── Reports ──────────────────────────────────────────────────── */}
      <Route path="/reports/org"       element={<CS module="Reports" submodule="Organization Reports" />} />
      <Route path="/reports/hr"        element={<CS module="Reports" submodule="HR Reports" />} />
      <Route path="/reports/assets"    element={<CS module="Reports" submodule="Asset Reports" />} />
      <Route path="/reports/finance"   element={<CS module="Reports" submodule="Finance Reports" />} />
      <Route path="/reports/scheduled" element={<CS module="Reports" submodule="Scheduled Reports" />} />
      <Route path="/reports"           element={<Navigate to={`/portal/${subdomain}/reports/org`} replace />} />
      <Route path="/reports/*"         element={<Navigate to={`/portal/${subdomain}/reports/org`} replace />} />

      {/* ── Knowledge Base ───────────────────────────────────────────── */}
      <Route path="/knowledge"   element={<CS module="Knowledge Base" />} />
      <Route path="/knowledge/*" element={<CS module="Knowledge Base" />} />

      {/* ── Workflow Engine ──────────────────────────────────────────── */}
      <Route path="/workflow/approvals"     element={<CS module="Workflow Engine" submodule="Approval Workflows" />} />
      <Route path="/workflow/automation"    element={<CS module="Workflow Engine" submodule="Automation Rules" />} />
      <Route path="/workflow/notifications" element={<CS module="Workflow Engine" submodule="Notification Templates" />} />
      <Route path="/workflow/escalations"   element={<CS module="Workflow Engine" submodule="Escalation Rules" />} />
      <Route path="/workflow"               element={<Navigate to={`/portal/${subdomain}/workflow/approvals`} replace />} />
      <Route path="/workflow/*"             element={<Navigate to={`/portal/${subdomain}/workflow/approvals`} replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? `/portal/${subdomain}/dashboard` : `/portal/${subdomain}`} replace />} />
    </Routes>
  );
}

export default function ClientPortalPage() {
  const { subdomain } = useParams();
  return (
    <PortalAuthProvider subdomain={subdomain}>
      <PortalNavProvider>
        <PortalRoutes />
      </PortalNavProvider>
    </PortalAuthProvider>
  );
}
