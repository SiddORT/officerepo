// @refresh reset
import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Navigate, useParams } from "react-router-dom";

// Client Settings pages
import ClientSettingsLayout from "./client-settings/ClientSettingsLayout";
import SettingsGeneral       from "./client-settings/SettingsGeneral";
import SettingsBranding      from "./client-settings/SettingsBranding";
import SettingsLocalization  from "./client-settings/SettingsLocalization";
import SettingsNotifications from "./client-settings/SettingsNotifications";
import SettingsCredentials   from "./client-settings/SettingsCredentials";
import SettingsCommonMasters from "./client-settings/SettingsCommonMasters";
import SettingsDocTemplates  from "./client-settings/SettingsDocTemplates";
import SettingsEmailTemplates from "./client-settings/SettingsEmailTemplates";
import { PortalAuthProvider, usePortalAuth } from "../../contexts/PortalAuthContext";
import { useTenant } from "../../contexts/TenantContext";
import { portalEmployeeApi } from "../../services/apiClient";
import Modal from "../../components/ui/Modal";
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

// Leave Management pages
import LeaveDashboard      from "./leave/LeaveDashboard";
import LeaveTypeList       from "./leave/LeaveTypeList";
import LeavePolicyList     from "./leave/LeavePolicyList";
import HolidayCalendarList from "./leave/HolidayCalendarList";
import LeaveRequestList    from "./leave/LeaveRequestList";
import LeaveRequestForm    from "./leave/LeaveRequestForm";
import LeaveBalances       from "./leave/LeaveBalances";
import LeaveCalendar       from "./leave/LeaveCalendar";
import CompOffList         from "./leave/CompOffList";

// Loan Management pages
import LoanDashboard          from "./loans/LoanDashboard";
import LoanTypeList           from "./loans/LoanTypeList";
import LoanPolicyList         from "./loans/LoanPolicyList";
import LoanApplicationList    from "./loans/LoanApplicationList";
import LoanApplicationDetails from "./loans/LoanApplicationDetails";
import LoanRepaymentList      from "./loans/LoanRepaymentList";

// Expense & Reimbursements pages
import ExpenseDashboard    from "./expenses/ExpenseDashboard";
import ExpenseCategoryList from "./expenses/ExpenseCategoryList";
import ExpensePolicyList   from "./expenses/ExpensePolicyList";
import ExpenseClaimList    from "./expenses/ExpenseClaimList";
import ExpenseClaimDetails from "./expenses/ExpenseClaimDetails";
import ExpenseClaimForm    from "./expenses/ExpenseClaimForm";
import MileageClaimList    from "./expenses/MileageClaimList";
import ReimbursementList   from "./expenses/ReimbursementList";

// Exit Management pages
import ExitDashboard       from "./exit/ExitDashboard";
import ExitPolicyList      from "./exit/ExitPolicyList";
import ResignationList     from "./exit/ResignationList";
import ResignationDetails  from "./exit/ResignationDetails";
import ResignationForm     from "./exit/ResignationForm";
import ExitInterviewPage   from "./exit/ExitInterviewPage";
import FinalSettlementList from "./exit/FinalSettlementList";

// Payroll Management pages
import PayrollDashboard        from "./payroll/PayrollDashboard";
import SalaryComponentList     from "./payroll/SalaryComponentList";
import SalaryStructureList     from "./payroll/SalaryStructureList";
import EmployeeCompensationList from "./payroll/EmployeeCompensationList";
import PayrollCycleList        from "./payroll/PayrollCycleList";
import PayrollRunList          from "./payroll/PayrollRunList";
import PayrollRunDetails       from "./payroll/PayrollRunDetails";
import PayslipList             from "./payroll/PayslipList";
import StatutoryList           from "./payroll/StatutoryList";

// Attendance Management pages
import AttendanceDashboard  from "./attendance/AttendanceDashboard";
import AttendanceList       from "./attendance/AttendanceList";
import AttendanceCalendar   from "./attendance/AttendanceCalendar";
import ShiftList            from "./attendance/ShiftList";
import ShiftForm            from "./attendance/ShiftForm";
import CheckIn              from "./attendance/CheckIn";
import RegularizationList   from "./attendance/RegularizationList";
import PolicyList           from "./attendance/PolicyList";
import DeviceRegistry       from "./attendance/DeviceRegistry";

// Onboarding pages
import OnboardingDashboard from "./onboarding/OnboardingDashboard";
import OnboardingList      from "./onboarding/OnboardingList";
import OnboardingDetails   from "./onboarding/OnboardingDetails";
import OnboardingStart     from "./onboarding/OnboardingStart";
import TemplateList        from "./onboarding/TemplateList";
import TemplateForm        from "./onboarding/TemplateForm";

// Interview Management pages
import InterviewDashboard from "./interview/InterviewDashboard";
import InterviewList from "./interview/InterviewList";
import InterviewScheduleForm from "./interview/InterviewScheduleForm";
import InterviewDetails from "./interview/InterviewDetails";
import InterviewReschedule from "./interview/InterviewReschedule";
import PipelineList from "./interview/PipelineList";
import PipelineDetails from "./interview/PipelineDetails";
import PipelineForm from "./interview/PipelineForm";
import InterviewCalendar from "./interview/InterviewCalendar";

// Asset Management pages
import AssetCategories from "./assets/AssetCategories";
import AssetSubCategoryList from "./assets/AssetSubCategoryList";
import AssetInventoryList from "./assets/AssetInventoryList";
import AssetInventoryForm from "./assets/AssetInventoryForm";
import AssetInventoryDetails from "./assets/AssetInventoryDetails";
import AssignmentDashboard from "./assets/AssignmentDashboard";
import AssignmentList from "./assets/AssignmentList";
import AssignmentDetails from "./assets/AssignmentDetails";
import AssignmentForm from "./assets/AssignmentForm";
import AssignmentRequestList from "./assets/AssignmentRequestList";
import AssetRequestList from "./assets/AssetRequestList";
import AssetRequestDetails from "./assets/AssetRequestDetails";
import ReturnList from "./assets/ReturnList";
import ReturnDetails from "./assets/ReturnDetails";
import ReturnForm from "./assets/ReturnForm";
import TransferList from "./assets/TransferList";
import TransferDetails from "./assets/TransferDetails";
import TransferForm from "./assets/TransferForm";
import MaintenanceList from "./assets/MaintenanceList";
import MaintenanceRequestForm from "./assets/MaintenanceRequestForm";
import MaintenanceRequestDetails from "./assets/MaintenanceRequestDetails";
import WarrantyList from "./assets/WarrantyList";
import AMCList from "./assets/AMCList";

// Organization Management pages
import CompanyList from "./org-management/CompanyList";
import CompanyDetails from "./org-management/CompanyDetails";
import CompanyForm from "./org-management/CompanyForm";
import DepartmentList from "./org-management/DepartmentList";
import DepartmentForm from "./org-management/DepartmentForm";
import DepartmentDetails from "./org-management/DepartmentDetails";
import DesignationList from "./org-management/DesignationList";
import DesignationForm from "./org-management/DesignationForm";
import DesignationDetails from "./org-management/DesignationDetails";
import BranchList from "./org-management/BranchList";
import BranchForm from "./org-management/BranchForm";
import OrgHierarchy from "./org-management/OrgHierarchy";

function PortalProtectedRoute({ children }) {
  const { user, subdomain } = usePortalAuth();
  const { mode } = useTenant();
  if (!user) return <Navigate to={mode === "hostname" ? "/login" : `/portal/${subdomain}`} replace />;
  return children;
}

// ── Profile page helpers ──────────────────────────────────────────────────────
const PVal = ({ children }) => (
  <div style={{ fontSize: 13, paddingTop: 2, color: children ? "var(--c-text)" : "var(--c-muted)" }}>
    {children || "—"}
  </div>
);
const PLabel = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-muted)", marginBottom: 2 }}>
    {children}
  </div>
);
const PCard = ({ icon, title, action, children }) => (
  <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, overflow: "hidden" }}>
    <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--c-border)", display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14, color: "var(--c-heading)" }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1 }}>{title}</span>
      {action}
    </div>
    <div style={{ padding: 20 }}>{children}</div>
  </div>
);
const PGrid = ({ cols = 3, children }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(${cols === 2 ? 180 : 140}px, 1fr))`, gap: 16 }}>
    {children}
  </div>
);

// ── Profile edit helpers ───────────────────────────────────────────────────────
const PROFILE_COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91" }, { code: "+1", label: "🇺🇸 +1" },
  { code: "+44", label: "🇬🇧 +44" }, { code: "+971", label: "🇦🇪 +971" },
  { code: "+65", label: "🇸🇬 +65" }, { code: "+61", label: "🇦🇺 +61" },
  { code: "+60", label: "🇲🇾 +60" }, { code: "+66", label: "🇹🇭 +66" },
  { code: "+880", label: "🇧🇩 +880" }, { code: "+92", label: "🇵🇰 +92" },
  { code: "+94", label: "🇱🇰 +94" }, { code: "+977", label: "🇳🇵 +977" },
  { code: "+968", label: "🇴🇲 +968" }, { code: "+966", label: "🇸🇦 +966" },
  { code: "+974", label: "🇶🇦 +974" }, { code: "+973", label: "🇧🇭 +973" },
  { code: "+49", label: "🇩🇪 +49" }, { code: "+33", label: "🇫🇷 +33" },
  { code: "+39", label: "🇮🇹 +39" }, { code: "+81", label: "🇯🇵 +81" },
  { code: "+86", label: "🇨🇳 +86" }, { code: "+82", label: "🇰🇷 +82" },
  { code: "+27", label: "🇿🇦 +27" }, { code: "+55", label: "🇧🇷 +55" },
  { code: "+7", label: "🇷🇺 +7" },
];

function ProfilePhoneInput({ countryCode, number, onCountryChange, onNumberChange, placeholder }) {
  return (
    <div style={{ display: "flex" }}>
      <select value={countryCode || "+91"} onChange={e => onCountryChange(e.target.value)}
        className="input-field"
        style={{ width: 100, borderRadius: "6px 0 0 6px", borderRight: "none", flexShrink: 0, fontSize: 12, paddingLeft: 6, paddingRight: 2 }}>
        {PROFILE_COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <input value={number || ""} onChange={e => onNumberChange(e.target.value)}
        placeholder={placeholder || "9876543210"}
        className="input-field"
        style={{ borderRadius: "0 6px 6px 0", flex: 1 }} />
    </div>
  );
}

const PFLabel = ({ children, required }) => (
  <label className={`portal-form-label ${required ? "portal-form-label-req" : ""}`}>{children}</label>
);

const PEditBtn = ({ onClick }) => (
  <button onClick={onClick}
    style={{ fontSize: 12, fontWeight: 600, color: "var(--c-accent)", background: "transparent", border: "1px solid var(--c-accent)", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
    Edit
  </button>
);

function PortalProfilePage() {
  const { user, subdomain, token } = usePortalAuth();
  const [emp, setEmp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noRecord, setNoRecord] = useState(false);

  // Edit modal state: "personal" | "contact" | "current_address" | "permanent_address" | null
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await portalEmployeeApi.me(subdomain, token);
      const data = r.data?.data;
      if (data) setEmp(data);
      else setNoRecord(true);
    } catch {
      setNoRecord(true);
    } finally {
      setLoading(false);
    }
  }, [subdomain, token]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (section) => {
    if (!emp) return;
    setSaveError(""); setSaveSuccess("");
    if (section === "personal") {
      setEditForm({
        gender: emp.gender || "",
        date_of_birth: emp.date_of_birth || "",
        marital_status: emp.marital_status || "",
        blood_group: emp.blood_group || "",
        nationality: emp.nationality || "",
        personal_email: emp.personal_email || "",
      });
    } else if (section === "contact") {
      setEditForm({
        mobile_country_code: emp.mobile_country_code || "+91",
        mobile_number: emp.mobile_number || "",
        alternate_mobile_country_code: emp.alternate_mobile_country_code || "+91",
        alternate_mobile: emp.alternate_mobile || "",
        landline_number: emp.landline_number || "",
      });
    } else if (section === "current_address") {
      setEditForm({
        current_address_line_1: emp.current_address_line_1 || "",
        current_address_line_2: emp.current_address_line_2 || "",
        current_city: emp.current_city || "",
        current_district: emp.current_district || "",
        current_state: emp.current_state || "",
        current_country: emp.current_country || "",
        current_postal_code: emp.current_postal_code || "",
      });
    } else if (section === "permanent_address") {
      setEditForm({
        permanent_same_as_current: emp.permanent_same_as_current || false,
        permanent_address_line_1: emp.permanent_address_line_1 || "",
        permanent_address_line_2: emp.permanent_address_line_2 || "",
        permanent_city: emp.permanent_city || "",
        permanent_district: emp.permanent_district || "",
        permanent_state: emp.permanent_state || "",
        permanent_country: emp.permanent_country || "",
        permanent_postal_code: emp.permanent_postal_code || "",
      });
    }
    setEditModal(section);
  };

  const set = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!emp?.id) return;
    setSaving(true); setSaveError(""); setSaveSuccess("");
    const payload = { ...editForm };
    Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
    try {
      await portalEmployeeApi.update(subdomain, token, emp.id, payload);
      setSaveSuccess("Saved successfully.");
      await load();
      setTimeout(() => { setEditModal(null); setSaveSuccess(""); }, 800);
    } catch (e) {
      setSaveError(e?.response?.data?.detail || "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const initials = (user?.name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <PortalLayout title="My Profile">
      <div style={{ maxWidth: 860, display: "grid", gap: 20 }}>

        {/* Identity card */}
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #00aeec, #ff7a1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "var(--c-heading)" }}>
                {emp?.full_name || user?.name}
              </div>
              {emp?.designation_name && (
                <div style={{ fontSize: 13, color: "var(--c-accent)", fontWeight: 600 }}>{emp.designation_name}</div>
              )}
              <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 2 }}>{user?.email}</div>
            </div>
            {emp?.employee_code && (
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--c-muted)", fontWeight: 600, textTransform: "uppercase" }}>Employee ID</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--c-heading)", fontFamily: "monospace" }}>{emp.employee_code}</div>
              </div>
            )}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--c-border)", display: "flex", gap: 24, flexWrap: "wrap" }}>
            {emp?.department_name && (
              <div><PLabel>Department</PLabel><PVal>{emp.department_name}</PVal></div>
            )}
            {emp?.company_name && (
              <div><PLabel>Company</PLabel><PVal>{emp.company_name}</PVal></div>
            )}
            {emp?.branch_name && (
              <div><PLabel>Branch</PLabel><PVal>{emp.branch_name}</PVal></div>
            )}
            {emp?.work_mode && (
              <div><PLabel>Work Mode</PLabel><PVal>{emp.work_mode}</PVal></div>
            )}
            <div>
              <PLabel>Workspace</PLabel>
              <PVal>{subdomain}.{import.meta.env.VITE_BASE_DOMAIN || window.location.hostname}</PVal>
            </div>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--c-muted)", fontSize: 14 }}>Loading personal details…</div>
        )}

        {!loading && noRecord && (
          <div style={{ textAlign: "center", padding: 32, color: "var(--c-muted)", fontSize: 13, background: "var(--c-surface)", borderRadius: 12, border: "1px solid var(--c-border)" }}>
            No employee record is linked to your account yet. Contact your HR administrator.
          </div>
        )}

        {!loading && emp && (
          <>
            {/* Personal Details */}
            <PCard icon="👤" title="Personal Details" action={<PEditBtn onClick={() => openEdit("personal")} />}>
              <div style={{ display: "grid", gap: 16 }}>
                <PGrid>
                  <div><PLabel>Gender</PLabel><PVal>{emp.gender}</PVal></div>
                  <div><PLabel>Date of Birth</PLabel><PVal>{emp.date_of_birth}</PVal></div>
                  <div><PLabel>Marital Status</PLabel><PVal>{emp.marital_status}</PVal></div>
                </PGrid>
                <PGrid>
                  <div><PLabel>Blood Group</PLabel><PVal>{emp.blood_group}</PVal></div>
                  <div><PLabel>Nationality</PLabel><PVal>{emp.nationality}</PVal></div>
                  <div><PLabel>Personal Email</PLabel><PVal>{emp.personal_email}</PVal></div>
                </PGrid>
              </div>
            </PCard>

            {/* Contact Details */}
            <PCard icon="📞" title="Contact Details" action={<PEditBtn onClick={() => openEdit("contact")} />}>
              <PGrid>
                <div>
                  <PLabel>Mobile</PLabel>
                  <PVal>{emp.mobile_number ? `${emp.mobile_country_code || ""} ${emp.mobile_number}`.trim() : null}</PVal>
                </div>
                <div>
                  <PLabel>Alternate Mobile</PLabel>
                  <PVal>{emp.alternate_mobile ? `${emp.alternate_mobile_country_code || ""} ${emp.alternate_mobile}`.trim() : null}</PVal>
                </div>
                <div><PLabel>Landline</PLabel><PVal>{emp.landline_number}</PVal></div>
              </PGrid>
            </PCard>

            {/* Current Address */}
            <PCard icon="📍" title="Current Address" action={<PEditBtn onClick={() => openEdit("current_address")} />}>
              <div style={{ display: "grid", gap: 12 }}>
                <PGrid cols={2}>
                  <div><PLabel>Address Line 1</PLabel><PVal>{emp.current_address_line_1}</PVal></div>
                  <div><PLabel>Address Line 2</PLabel><PVal>{emp.current_address_line_2}</PVal></div>
                </PGrid>
                <PGrid>
                  <div><PLabel>City</PLabel><PVal>{emp.current_city}</PVal></div>
                  <div><PLabel>District</PLabel><PVal>{emp.current_district}</PVal></div>
                  <div><PLabel>State</PLabel><PVal>{emp.current_state}</PVal></div>
                </PGrid>
                <PGrid cols={2}>
                  <div><PLabel>Country</PLabel><PVal>{emp.current_country}</PVal></div>
                  <div><PLabel>Postal Code</PLabel><PVal>{emp.current_postal_code}</PVal></div>
                </PGrid>
              </div>
            </PCard>

            {/* Permanent Address */}
            <PCard icon="🏠" title="Permanent Address" action={<PEditBtn onClick={() => openEdit("permanent_address")} />}>
              {emp.permanent_same_as_current ? (
                <div style={{ fontSize: 13, color: "var(--c-muted)", textAlign: "center", padding: "8px 0" }}>Same as current address</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <PGrid cols={2}>
                    <div><PLabel>Address Line 1</PLabel><PVal>{emp.permanent_address_line_1}</PVal></div>
                    <div><PLabel>Address Line 2</PLabel><PVal>{emp.permanent_address_line_2}</PVal></div>
                  </PGrid>
                  <PGrid>
                    <div><PLabel>City</PLabel><PVal>{emp.permanent_city}</PVal></div>
                    <div><PLabel>District</PLabel><PVal>{emp.permanent_district}</PVal></div>
                    <div><PLabel>State</PLabel><PVal>{emp.permanent_state}</PVal></div>
                  </PGrid>
                  <PGrid cols={2}>
                    <div><PLabel>Country</PLabel><PVal>{emp.permanent_country}</PVal></div>
                    <div><PLabel>Postal Code</PLabel><PVal>{emp.permanent_postal_code}</PVal></div>
                  </PGrid>
                </div>
              )}
            </PCard>
          </>
        )}
      </div>

      {/* ── Edit Modals ── */}

      {/* Personal Details Modal */}
      {editModal === "personal" && (
        <Modal open title="Edit Personal Details" onClose={() => setEditModal(null)}>
          {saveError && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{saveError}</div>}
          {saveSuccess && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#4ade80", fontSize: 13, marginBottom: 12 }}>{saveSuccess}</div>}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div>
                <PFLabel>Gender</PFLabel>
                <select value={editForm.gender || ""} onChange={e => set("gender", e.target.value)} className="input-field">
                  <option value="">Select…</option>
                  {["Male", "Female", "Other", "Prefer not to say"].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <PFLabel>Date of Birth</PFLabel>
                <input type="date" value={editForm.date_of_birth || ""} onChange={e => set("date_of_birth", e.target.value)} max={todayStr} className="input-field" />
              </div>
              <div>
                <PFLabel>Marital Status</PFLabel>
                <select value={editForm.marital_status || ""} onChange={e => set("marital_status", e.target.value)} className="input-field">
                  <option value="">Select…</option>
                  {["Single", "Married", "Divorced", "Widowed", "Separated"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div>
                <PFLabel>Blood Group</PFLabel>
                <select value={editForm.blood_group || ""} onChange={e => set("blood_group", e.target.value)} className="input-field">
                  <option value="">Select…</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <PFLabel>Nationality</PFLabel>
                <input value={editForm.nationality || ""} onChange={e => set("nationality", e.target.value)} className="input-field" placeholder="Indian" />
              </div>
              <div>
                <PFLabel>Personal Email</PFLabel>
                <input type="email" value={editForm.personal_email || ""} onChange={e => set("personal_email", e.target.value)} className="input-field" placeholder="personal@email.com" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Contact Details Modal */}
      {editModal === "contact" && (
        <Modal open title="Edit Contact Details" onClose={() => setEditModal(null)}>
          {saveError && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{saveError}</div>}
          {saveSuccess && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#4ade80", fontSize: 13, marginBottom: 12 }}>{saveSuccess}</div>}
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <PFLabel>Mobile Number</PFLabel>
              <ProfilePhoneInput
                countryCode={editForm.mobile_country_code}
                number={editForm.mobile_number}
                onCountryChange={v => set("mobile_country_code", v)}
                onNumberChange={v => set("mobile_number", v)}
              />
            </div>
            <div>
              <PFLabel>Alternate Mobile</PFLabel>
              <ProfilePhoneInput
                countryCode={editForm.alternate_mobile_country_code}
                number={editForm.alternate_mobile}
                onCountryChange={v => set("alternate_mobile_country_code", v)}
                onNumberChange={v => set("alternate_mobile", v)}
              />
            </div>
            <div>
              <PFLabel>Landline</PFLabel>
              <input value={editForm.landline_number || ""} onChange={e => set("landline_number", e.target.value)} className="input-field" placeholder="022-12345678" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Current Address Modal */}
      {editModal === "current_address" && (
        <Modal open title="Edit Current Address" onClose={() => setEditModal(null)}>
          {saveError && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{saveError}</div>}
          {saveSuccess && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#4ade80", fontSize: 13, marginBottom: 12 }}>{saveSuccess}</div>}
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <PFLabel>Address Line 1</PFLabel>
              <input value={editForm.current_address_line_1 || ""} onChange={e => set("current_address_line_1", e.target.value)} className="input-field" placeholder="Flat / House No., Street" />
            </div>
            <div>
              <PFLabel>Address Line 2</PFLabel>
              <input value={editForm.current_address_line_2 || ""} onChange={e => set("current_address_line_2", e.target.value)} className="input-field" placeholder="Area / Locality" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
              <div>
                <PFLabel>City</PFLabel>
                <input value={editForm.current_city || ""} onChange={e => set("current_city", e.target.value)} className="input-field" placeholder="Mumbai" />
              </div>
              <div>
                <PFLabel>District</PFLabel>
                <input value={editForm.current_district || ""} onChange={e => set("current_district", e.target.value)} className="input-field" placeholder="Mumbai Suburban" />
              </div>
              <div>
                <PFLabel>State</PFLabel>
                <input value={editForm.current_state || ""} onChange={e => set("current_state", e.target.value)} className="input-field" placeholder="Maharashtra" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <div>
                <PFLabel>Country</PFLabel>
                <input value={editForm.current_country || ""} onChange={e => set("current_country", e.target.value)} className="input-field" placeholder="India" />
              </div>
              <div>
                <PFLabel>Postal Code</PFLabel>
                <input value={editForm.current_postal_code || ""} onChange={e => set("current_postal_code", e.target.value)} className="input-field" placeholder="400001" />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Permanent Address Modal */}
      {editModal === "permanent_address" && (
        <Modal open title="Edit Permanent Address" onClose={() => setEditModal(null)}>
          {saveError && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", color: "#f87171", fontSize: 13, marginBottom: 12 }}>{saveError}</div>}
          {saveSuccess && <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(34,197,94,0.1)", color: "#4ade80", fontSize: 13, marginBottom: 12 }}>{saveSuccess}</div>}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="perm-same" checked={!!editForm.permanent_same_as_current} onChange={e => set("permanent_same_as_current", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="perm-same" style={{ fontSize: 13, cursor: "pointer", color: "var(--c-text)" }}>Same as current address</label>
            </div>
            {!editForm.permanent_same_as_current && (
              <>
                <div>
                  <PFLabel>Address Line 1</PFLabel>
                  <input value={editForm.permanent_address_line_1 || ""} onChange={e => set("permanent_address_line_1", e.target.value)} className="input-field" placeholder="Flat / House No., Street" />
                </div>
                <div>
                  <PFLabel>Address Line 2</PFLabel>
                  <input value={editForm.permanent_address_line_2 || ""} onChange={e => set("permanent_address_line_2", e.target.value)} className="input-field" placeholder="Area / Locality" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                  <div>
                    <PFLabel>City</PFLabel>
                    <input value={editForm.permanent_city || ""} onChange={e => set("permanent_city", e.target.value)} className="input-field" placeholder="Pune" />
                  </div>
                  <div>
                    <PFLabel>District</PFLabel>
                    <input value={editForm.permanent_district || ""} onChange={e => set("permanent_district", e.target.value)} className="input-field" placeholder="Pune" />
                  </div>
                  <div>
                    <PFLabel>State</PFLabel>
                    <input value={editForm.permanent_state || ""} onChange={e => set("permanent_state", e.target.value)} className="input-field" placeholder="Maharashtra" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  <div>
                    <PFLabel>Country</PFLabel>
                    <input value={editForm.permanent_country || ""} onChange={e => set("permanent_country", e.target.value)} className="input-field" placeholder="India" />
                  </div>
                  <div>
                    <PFLabel>Postal Code</PFLabel>
                    <input value={editForm.permanent_postal_code || ""} onChange={e => set("permanent_postal_code", e.target.value)} className="input-field" placeholder="411001" />
                  </div>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
              <button onClick={() => setEditModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </Modal>
      )}
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
  const { mode } = useTenant();
  const pp = (path) => mode === "hostname" ? path : `/portal/${subdomain}${path}`;

  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={user ? <Navigate to={pp("/dashboard")} replace /> : <PortalLoginPage />} />
      <Route path="/login" element={user ? <Navigate to={pp("/dashboard")} replace /> : <PortalLoginPage />} />
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
      <Route path="/user-management"  element={<Navigate to={pp("/user-management/users")} replace />} />
      <Route path="/user-management/*" element={<Navigate to={pp("/user-management/users")} replace />} />

      {/* ── Employee Management ──────────────────────────────────────── */}
      <Route path="/employees"             element={<Protected><EmployeeList /></Protected>} />
      <Route path="/employees/new"         element={<Protected><EmployeeForm editMode={false} /></Protected>} />
      <Route path="/employees/:empId"      element={<Protected><EmployeeDetails /></Protected>} />
      <Route path="/employees/:empId/edit" element={<Protected><EmployeeForm editMode={true} /></Protected>} />
      <Route path="/employees/*"           element={<Navigate to={pp("/employees")} replace />} />

      {/* ── Organization Management ──────────────────────────────────── */}
      <Route path="/org/companies"                       element={<Protected><CompanyList /></Protected>} />
      <Route path="/org/companies/new"                   element={<Protected><CompanyForm editMode={false} /></Protected>} />
      <Route path="/org/companies/:companyId"            element={<Protected><CompanyDetails /></Protected>} />
      <Route path="/org/companies/:companyId/edit"       element={<Protected><CompanyForm editMode={true} /></Protected>} />
      <Route path="/org/branches"                        element={<Protected><BranchList /></Protected>} />
      <Route path="/org/branches/new"                    element={<Protected><BranchForm editMode={false} /></Protected>} />
      <Route path="/org/branches/:branchId/edit"         element={<Protected><BranchForm editMode={true} /></Protected>} />
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
      <Route path="/org"   element={<Navigate to={pp("/org/companies")} replace />} />
      <Route path="/org/*" element={<Navigate to={pp("/org/companies")} replace />} />

      {/* ── Employee Documents ───────────────────────────────────────── */}
      <Route path="/employee-documents/types"       element={<Protected><PortalLayout title="Document Types"><DocTypeList /></PortalLayout></Protected>} />
      <Route path="/employee-documents/new"         element={<Protected><EmployeeDocForm /></Protected>} />
      <Route path="/employee-documents/:docId/edit" element={<Protected><EmployeeDocForm /></Protected>} />
      <Route path="/employee-documents/:docId"      element={<Protected><EmployeeDocDetails /></Protected>} />
      <Route path="/employee-documents"             element={<Protected><EmployeeDocList /></Protected>} />
      <Route path="/employee-documents/*"           element={<Navigate to={pp("/employee-documents")} replace />} />

      {/* ── Asset Management ─────────────────────────────────────────── */}
      <Route path="/assets/categories"              element={<Protected><AssetCategories /></Protected>} />
      <Route path="/assets/sub-categories"          element={<Protected><AssetSubCategoryList /></Protected>} />
      <Route path="/assets/inventory/new"           element={<Protected><AssetInventoryForm editMode={false} /></Protected>} />
      <Route path="/assets/inventory/:assetId/edit" element={<Protected><AssetInventoryForm editMode={true} /></Protected>} />
      <Route path="/assets/inventory/:assetId"      element={<Protected><AssetInventoryDetails /></Protected>} />
      <Route path="/assets/inventory"               element={<Protected><AssetInventoryList /></Protected>} />
      <Route path="/assets/maintenance/new"             element={<Protected><MaintenanceRequestForm /></Protected>} />
      <Route path="/assets/maintenance/:requestId"      element={<Protected><MaintenanceRequestDetails /></Protected>} />
      <Route path="/assets/maintenance"                 element={<Protected><MaintenanceList /></Protected>} />
      <Route path="/assets/warranties"                  element={<Protected><WarrantyList /></Protected>} />
      <Route path="/assets/amc"                         element={<Protected><AMCList /></Protected>} />
      <Route path="/assets/audits"       element={<CS module="Asset Management" submodule="Asset Audits" />} />
      <Route path="/assets/requests/:requestId" element={<Protected><AssetRequestDetails /></Protected>} />
      <Route path="/assets/requests"     element={<Protected><AssetRequestList /></Protected>} />
      <Route path="/assets/assignments/new"            element={<Protected><AssignmentForm /></Protected>} />
      <Route path="/assets/assignments/requests"       element={<Protected><AssignmentRequestList /></Protected>} />
      <Route path="/assets/assignments/:assignmentId"  element={<Protected><AssignmentDetails /></Protected>} />
      <Route path="/assets/assignments"                element={<Protected><AssignmentList /></Protected>} />
      <Route path="/assets/transfers/new"          element={<Protected><TransferForm /></Protected>} />
      <Route path="/assets/transfers/:transferId"  element={<Protected><TransferDetails /></Protected>} />
      <Route path="/assets/transfers"              element={<Protected><TransferList /></Protected>} />
      <Route path="/assets/returns/new"            element={<Protected><ReturnForm /></Protected>} />
      <Route path="/assets/returns/:returnId"      element={<Protected><ReturnDetails /></Protected>} />
      <Route path="/assets/returns"                element={<Protected><ReturnList /></Protected>} />
      <Route path="/assets/disposal"     element={<CS module="Asset Management" submodule="Asset Disposal" />} />
      <Route path="/assets"   element={<Navigate to={pp("/assets/inventory")} replace />} />
      <Route path="/assets/*" element={<Navigate to={pp("/assets/inventory")} replace />} />

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
      {/* Offers moved to Interview Management — redirect old paths */}
      <Route path="/recruitment/offers/new"           element={<Navigate to={pp("/hrms/interviews/offers/new")} replace />} />
      <Route path="/recruitment/offers/:offerId/edit" element={<Navigate to={pp("/hrms/interviews/offers")} replace />} />
      <Route path="/recruitment/offers"               element={<Navigate to={pp("/hrms/interviews/offers")} replace />} />
      <Route path="/recruitment/*" element={<Navigate to={pp("/recruitment")} replace />} />

      {/* ── Interview Management ──────────────────────────────────────── */}
      {/* Offers (moved from Recruitment) — static paths BEFORE /:interviewId */}
      <Route path="/hrms/interviews/offers/new"               element={<Protected><PortalLayout title="Create Offer"><OfferForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/offers/:offerId/edit"     element={<Protected><PortalLayout title="Edit Offer"><OfferForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/offers"                   element={<Protected><PortalLayout title="Offers"><OfferList /></PortalLayout></Protected>} />
      {/* Static paths must come BEFORE /:interviewId */}
      <Route path="/hrms/interviews/list"                    element={<Protected><PortalLayout title="All Interviews"><InterviewList /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/schedule/new"            element={<Protected><PortalLayout title="Schedule Interview"><InterviewScheduleForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/calendar"                element={<Protected><PortalLayout title="Interview Calendar"><InterviewCalendar /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/pipelines/new"           element={<Protected><PortalLayout title="New Pipeline"><PipelineForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/pipelines/:pipelineId/edit" element={<Protected><PortalLayout title="Edit Pipeline"><PipelineForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/pipelines/:pipelineId"   element={<Protected><PortalLayout title="Pipeline Details"><PipelineDetails /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/pipelines"               element={<Protected><PortalLayout title="Interview Pipelines"><PipelineList /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/:interviewId/edit"       element={<Protected><PortalLayout title="Edit Interview"><InterviewScheduleForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/:interviewId/reschedule" element={<Protected><PortalLayout title="Reschedule Interview"><InterviewReschedule /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews/:interviewId"            element={<Protected><PortalLayout title="Interview Details"><InterviewDetails /></PortalLayout></Protected>} />
      <Route path="/hrms/interviews"                         element={<Protected><PortalLayout title="Interview Management"><InterviewDashboard /></PortalLayout></Protected>} />
      {/* ── Employee Onboarding ──────────────────────────────────────────── */}
      <Route path="/hrms/onboarding/templates/new"              element={<Protected><PortalLayout title="New Template"><TemplateForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/hrms/onboarding/templates/:templateId/edit" element={<Protected><PortalLayout title="Edit Template"><TemplateForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/hrms/onboarding/templates"                  element={<Protected><PortalLayout title="Onboarding Templates"><TemplateList /></PortalLayout></Protected>} />
      <Route path="/hrms/onboarding/start"                      element={<Protected><PortalLayout title="Start Onboarding"><OnboardingStart /></PortalLayout></Protected>} />
      <Route path="/hrms/onboarding/list"                       element={<Protected><PortalLayout title="All Onboardings"><OnboardingList /></PortalLayout></Protected>} />
      <Route path="/hrms/onboarding/:onboardingId"              element={<Protected><PortalLayout title="Onboarding Details"><OnboardingDetails /></PortalLayout></Protected>} />
      <Route path="/hrms/onboarding"                            element={<Protected><PortalLayout title="Employee Onboarding"><OnboardingDashboard /></PortalLayout></Protected>} />
      {/* ── Attendance Management ────────────────────────────────────────── */}
      <Route path="/hrms/attendance/shifts/new"           element={<Protected><PortalLayout title="New Shift"><ShiftForm editMode={false} /></PortalLayout></Protected>} />
      <Route path="/hrms/attendance/shifts/:shiftId/edit" element={<Protected><PortalLayout title="Edit Shift"><ShiftForm editMode={true} /></PortalLayout></Protected>} />
      <Route path="/hrms/attendance/shifts"               element={<Protected><PortalLayout title="Shifts"><ShiftList /></PortalLayout></Protected>} />
      <Route path="/hrms/attendance/check-in"             element={<Protected><PortalLayout title="Check-In / Check-Out"><CheckIn /></PortalLayout></Protected>} />
      <Route path="/hrms/attendance/regularizations"      element={<Protected><PortalLayout title="Regularizations"><RegularizationList /></PortalLayout></Protected>} />
      <Route path="/hrms/attendance/records"              element={<Protected><PortalLayout title="Attendance Records"><AttendanceList /></PortalLayout></Protected>} />
      <Route path="/hrms/attendance/calendar"             element={<Protected><PortalLayout title="Attendance Calendar"><AttendanceCalendar /></PortalLayout></Protected>} />
      <Route path="/hrms/attendance/policies"             element={<Protected><PortalLayout title="Attendance Policies"><PolicyList /></PortalLayout></Protected>} />
      <Route path="/hrms/attendance/devices"              element={<Protected><PortalLayout title="Device Registry"><DeviceRegistry /></PortalLayout></Protected>} />
      <Route path="/hrms/attendance"                      element={<Protected><PortalLayout title="Attendance Management"><AttendanceDashboard /></PortalLayout></Protected>} />
      {/* ── Leave Management ─────────────────────────────────────────── */}
      <Route path="/hrms/leave/requests/new"     element={<Protected><PortalLayout title="Apply Leave"><LeaveRequestForm /></PortalLayout></Protected>} />
      <Route path="/hrms/leave/requests"         element={<Protected><PortalLayout title="Leave Requests"><LeaveRequestList /></PortalLayout></Protected>} />
      <Route path="/hrms/leave/types"            element={<Protected><PortalLayout title="Leave Types"><LeaveTypeList /></PortalLayout></Protected>} />
      <Route path="/hrms/leave/policies"         element={<Protected><PortalLayout title="Leave Policies"><LeavePolicyList /></PortalLayout></Protected>} />
      <Route path="/hrms/leave/calendars"        element={<Protected><PortalLayout title="Holiday Calendars"><HolidayCalendarList /></PortalLayout></Protected>} />
      <Route path="/hrms/leave/balances"         element={<Protected><PortalLayout title="Leave Balances"><LeaveBalances /></PortalLayout></Protected>} />
      <Route path="/hrms/leave/calendar"         element={<Protected><PortalLayout title="Leave Calendar"><LeaveCalendar /></PortalLayout></Protected>} />
      <Route path="/hrms/leave/comp-offs"        element={<Protected><PortalLayout title="Comp Off Management"><CompOffList /></PortalLayout></Protected>} />
      <Route path="/hrms/leave"                  element={<Protected><PortalLayout title="Leave Management"><LeaveDashboard /></PortalLayout></Protected>} />
      <Route path="/hrms/payroll/runs/:runId"     element={<Protected><PortalLayout title="Payroll Run Details"><PayrollRunDetails /></PortalLayout></Protected>} />
      <Route path="/hrms/payroll/runs"            element={<Protected><PortalLayout title="Payroll Runs"><PayrollRunList /></PortalLayout></Protected>} />
      <Route path="/hrms/payroll/payslips"        element={<Protected><PortalLayout title="Payslips"><PayslipList /></PortalLayout></Protected>} />
      <Route path="/hrms/payroll/compensations"   element={<Protected><PortalLayout title="Employee Compensation"><EmployeeCompensationList /></PortalLayout></Protected>} />
      <Route path="/hrms/payroll/components"      element={<Protected><PortalLayout title="Salary Components"><SalaryComponentList /></PortalLayout></Protected>} />
      <Route path="/hrms/payroll/structures"      element={<Protected><PortalLayout title="Salary Structures"><SalaryStructureList /></PortalLayout></Protected>} />
      <Route path="/hrms/payroll/cycles"          element={<Protected><PortalLayout title="Payroll Cycles"><PayrollCycleList /></PortalLayout></Protected>} />
      <Route path="/hrms/payroll/statutory"       element={<Protected><PortalLayout title="Statutory Compliance"><StatutoryList /></PortalLayout></Protected>} />
      <Route path="/hrms/payroll"                 element={<Protected><PortalLayout title="Payroll Management"><PayrollDashboard /></PortalLayout></Protected>} />
      {/* ── Employee Loan Management ──────────────────────────────────── */}
      <Route path="/hrms/loans/applications/:appId" element={<Protected><LoanApplicationDetails /></Protected>} />
      <Route path="/hrms/loans/applications"        element={<Protected><LoanApplicationList /></Protected>} />
      <Route path="/hrms/loans/types"               element={<Protected><LoanTypeList /></Protected>} />
      <Route path="/hrms/loans/policies"            element={<Protected><LoanPolicyList /></Protected>} />
      <Route path="/hrms/loans/repayments"          element={<Protected><LoanRepaymentList /></Protected>} />
      <Route path="/hrms/loans"                     element={<Protected><LoanDashboard /></Protected>} />
      <Route path="/hrms/expenses/claims/new"         element={<Protected><ExpenseClaimForm /></Protected>} />
      <Route path="/hrms/expenses/claims/:claimId/edit" element={<Protected><ExpenseClaimForm editMode /></Protected>} />
      <Route path="/hrms/expenses/claims/:claimId"   element={<Protected><ExpenseClaimDetails /></Protected>} />
      <Route path="/hrms/expenses/claims"            element={<Protected><ExpenseClaimList /></Protected>} />
      <Route path="/hrms/expenses/categories"        element={<Protected><ExpenseCategoryList /></Protected>} />
      <Route path="/hrms/expenses/policies"          element={<Protected><ExpensePolicyList /></Protected>} />
      <Route path="/hrms/expenses/mileage"           element={<Protected><MileageClaimList /></Protected>} />
      <Route path="/hrms/expenses/reimbursements"    element={<Protected><ReimbursementList /></Protected>} />
      <Route path="/hrms/expenses"                   element={<Protected><ExpenseDashboard /></Protected>} />
      <Route path="/hrms/exit/resignations/new"                      element={<Protected><ResignationForm /></Protected>} />
      <Route path="/hrms/exit/resignations/:resignationId/edit"      element={<Protected><ResignationForm editMode /></Protected>} />
      <Route path="/hrms/exit/resignations/:resignationId/interview" element={<Protected><ExitInterviewPage /></Protected>} />
      <Route path="/hrms/exit/resignations/:resignationId"           element={<Protected><ResignationDetails /></Protected>} />
      <Route path="/hrms/exit/resignations"                          element={<Protected><ResignationList /></Protected>} />
      <Route path="/hrms/exit/policies"                              element={<Protected><ExitPolicyList /></Protected>} />
      <Route path="/hrms/exit/interviews"                            element={<Protected><ResignationList /></Protected>} />
      <Route path="/hrms/exit/settlements"                           element={<Protected><FinalSettlementList /></Protected>} />
      <Route path="/hrms/exit/documents"                             element={<Protected><ResignationList /></Protected>} />
      <Route path="/hrms/exit"                                       element={<Protected><ExitDashboard /></Protected>} />
      <Route path="/hrms/ess"         element={<CS module="HRMS" submodule="Employee Self Service" />} />
      <Route path="/hrms"             element={<Navigate to={pp("/recruitment")} replace />} />
      <Route path="/hrms/*"           element={<Navigate to={pp("/recruitment")} replace />} />

      {/* ── CRM ──────────────────────────────────────────────────────── */}
      <Route path="/crm/leads"         element={<CS module="CRM" submodule="CRM Leads" />} />
      <Route path="/crm/accounts"      element={<CS module="CRM" submodule="Accounts" />} />
      <Route path="/crm/contacts"      element={<CS module="CRM" submodule="Contacts" />} />
      <Route path="/crm/opportunities" element={<CS module="CRM" submodule="Opportunities" />} />
      <Route path="/crm/activities"    element={<CS module="CRM" submodule="CRM Activities" />} />
      <Route path="/crm/quotes"        element={<CS module="CRM" submodule="Quotes" />} />
      <Route path="/crm/customers"     element={<CS module="CRM" submodule="Customers" />} />
      <Route path="/crm"               element={<Navigate to={pp("/crm/leads")} replace />} />
      <Route path="/crm/*"             element={<Navigate to={pp("/crm/leads")} replace />} />

      {/* ── LMS ──────────────────────────────────────────────────────── */}
      <Route path="/lms/courses"        element={<CS module="LMS" submodule="Courses" />} />
      <Route path="/lms/paths"          element={<CS module="LMS" submodule="Learning Paths" />} />
      <Route path="/lms/assessments"    element={<CS module="LMS" submodule="Assessments" />} />
      <Route path="/lms/certifications" element={<CS module="LMS" submodule="Certifications" />} />
      <Route path="/lms"                element={<Navigate to={pp("/lms/courses")} replace />} />
      <Route path="/lms/*"              element={<Navigate to={pp("/lms/courses")} replace />} />

      {/* ── BMS ──────────────────────────────────────────────────────── */}
      <Route path="/bms/products"   element={<CS module="BMS" submodule="Products" />} />
      <Route path="/bms/services"   element={<CS module="BMS" submodule="Services" />} />
      <Route path="/bms/categories" element={<CS module="BMS" submodule="BMS Categories" />} />
      <Route path="/bms/customers"  element={<CS module="BMS" submodule="BMS Customers" />} />
      <Route path="/bms/contracts"  element={<CS module="BMS" submodule="Contracts" />} />
      <Route path="/bms"            element={<Navigate to={pp("/bms/products")} replace />} />
      <Route path="/bms/*"          element={<Navigate to={pp("/bms/products")} replace />} />

      {/* ── Finance & Procurement ────────────────────────────────────── */}
      <Route path="/finance/vendors"           element={<CS module="Finance & Procurement" submodule="Vendors" />} />
      <Route path="/finance/purchase-requests" element={<CS module="Finance & Procurement" submodule="Purchase Requests" />} />
      <Route path="/finance/purchase-orders"   element={<CS module="Finance & Procurement" submodule="Purchase Orders" />} />
      <Route path="/finance/invoices"          element={<CS module="Finance & Procurement" submodule="Invoices" />} />
      <Route path="/finance/payments"          element={<CS module="Finance & Procurement" submodule="Payments" />} />
      <Route path="/finance/budgets"           element={<CS module="Finance & Procurement" submodule="Budgets" />} />
      <Route path="/finance/cost-centers"      element={<CS module="Finance & Procurement" submodule="Cost Centers" />} />
      <Route path="/finance"                   element={<Navigate to={pp("/finance/vendors")} replace />} />
      <Route path="/finance/*"                 element={<Navigate to={pp("/finance/vendors")} replace />} />

      {/* ── Task & Project Management ────────────────────────────────── */}
      <Route path="/tasks/projects"   element={<CS module="Task & Project Management" submodule="Projects" />} />
      <Route path="/tasks/milestones" element={<CS module="Task & Project Management" submodule="Milestones" />} />
      <Route path="/tasks/list"       element={<CS module="Task & Project Management" submodule="Task List" />} />
      <Route path="/tasks/sprints"    element={<CS module="Task & Project Management" submodule="Sprints" />} />
      <Route path="/tasks/timesheets" element={<CS module="Task & Project Management" submodule="Timesheets" />} />
      <Route path="/tasks"            element={<Navigate to={pp("/tasks/projects")} replace />} />
      <Route path="/tasks/*"          element={<Navigate to={pp("/tasks/projects")} replace />} />

      {/* ── Helpdesk ─────────────────────────────────────────────────── */}
      <Route path="/helpdesk/tickets"     element={<CS module="Helpdesk" submodule="Tickets" />} />
      <Route path="/helpdesk/catalog"     element={<CS module="Helpdesk" submodule="Service Catalog" />} />
      <Route path="/helpdesk/sla"         element={<CS module="Helpdesk" submodule="SLA Management" />} />
      <Route path="/helpdesk/escalations" element={<CS module="Helpdesk" submodule="Escalations" />} />
      <Route path="/helpdesk/knowledge"   element={<CS module="Helpdesk" submodule="Knowledge Articles" />} />
      <Route path="/helpdesk"             element={<Navigate to={pp("/helpdesk/tickets")} replace />} />
      <Route path="/helpdesk/*"           element={<Navigate to={pp("/helpdesk/tickets")} replace />} />

      {/* ── Visitor Management ───────────────────────────────────────── */}
      <Route path="/visitors/registration"  element={<CS module="Visitor Management" submodule="Visitor Registration" />} />
      <Route path="/visitors/pre-approvals" element={<CS module="Visitor Management" submodule="Pre-Approvals" />} />
      <Route path="/visitors/check-in"      element={<CS module="Visitor Management" submodule="Check-In / Check-Out" />} />
      <Route path="/visitors/passes"        element={<CS module="Visitor Management" submodule="Visitor Passes" />} />
      <Route path="/visitors"               element={<Navigate to={pp("/visitors/registration")} replace />} />
      <Route path="/visitors/*"             element={<Navigate to={pp("/visitors/registration")} replace />} />

      {/* ── Billing Management ───────────────────────────────────────── */}
      <Route path="/billing"   element={<CS module="Billing Management" />} />
      <Route path="/billing/*" element={<CS module="Billing Management" />} />

      {/* ── Reports ──────────────────────────────────────────────────── */}
      <Route path="/reports/org"       element={<CS module="Reports" submodule="Organization Reports" />} />
      <Route path="/reports/hr"        element={<CS module="Reports" submodule="HR Reports" />} />
      <Route path="/reports/assets"    element={<CS module="Reports" submodule="Asset Reports" />} />
      <Route path="/reports/finance"   element={<CS module="Reports" submodule="Finance Reports" />} />
      <Route path="/reports/scheduled" element={<CS module="Reports" submodule="Scheduled Reports" />} />
      <Route path="/reports"           element={<Navigate to={pp("/reports/org")} replace />} />
      <Route path="/reports/*"         element={<Navigate to={pp("/reports/org")} replace />} />

      {/* ── Knowledge Base ───────────────────────────────────────────── */}
      <Route path="/knowledge"   element={<CS module="Knowledge Base" />} />
      <Route path="/knowledge/*" element={<CS module="Knowledge Base" />} />

      {/* ── Workflow Engine ──────────────────────────────────────────── */}
      <Route path="/workflow/approvals"     element={<CS module="Workflow Engine" submodule="Approval Workflows" />} />
      <Route path="/workflow/automation"    element={<CS module="Workflow Engine" submodule="Automation Rules" />} />
      <Route path="/workflow/notifications" element={<CS module="Workflow Engine" submodule="Notification Templates" />} />
      <Route path="/workflow/escalations"   element={<CS module="Workflow Engine" submodule="Escalation Rules" />} />
      <Route path="/workflow"               element={<Navigate to={pp("/workflow/approvals")} replace />} />
      <Route path="/workflow/*"             element={<Navigate to={pp("/workflow/approvals")} replace />} />

      {/* Client Settings */}
      <Route path="/client-settings" element={<Protected><ClientSettingsLayout /></Protected>}>
        <Route index element={<Navigate to={pp("/client-settings/general")} replace />} />
        <Route path="general"         element={<SettingsGeneral />} />
        <Route path="branding"        element={<SettingsBranding />} />
        <Route path="localization"    element={<SettingsLocalization />} />
        <Route path="notifications"   element={<SettingsNotifications />} />
        <Route path="credentials"     element={<SettingsCredentials />} />
        <Route path="common-masters"  element={<SettingsCommonMasters />} />
        <Route path="doc-templates"   element={<SettingsDocTemplates />} />
        <Route path="email-templates" element={<SettingsEmailTemplates />} />
        <Route path="*"               element={<Navigate to={pp("/client-settings/general")} replace />} />
      </Route>
      <Route path="/client-settings/*" element={<Navigate to={pp("/client-settings/general")} replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to={user ? pp("/dashboard") : pp("/")} replace />} />
    </Routes>
  );
}

export default function ClientPortalPage() {
  const { tenant: tenantFromCtx } = useTenant();
  const { subdomain: subFromUrl } = useParams();
  const subdomain = tenantFromCtx ?? subFromUrl;
  return (
    <PortalAuthProvider subdomain={subdomain}>
      <PortalNavProvider>
        <PortalRoutes />
      </PortalNavProvider>
    </PortalAuthProvider>
  );
}
