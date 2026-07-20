import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clientsApi } from "../../../services/apiClient";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import CountryCodeSelect from "../../../components/ui/CountryCodeSelect";
import Toggle from "../../../components/ui/Toggle";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import {
  StatusBadge,
  DbStatusBadge,
  SubscriptionStatusBadge,
  AdminStatusBadge,
} from "./components/StatusBadge";
import { toOptions, formatDate, formatDateTime, toInputDate, contactName } from "./constants";

function getPortalUrl(domains = []) {
  const active = domains.find((d) => d.is_active);
  if (!active) return null;
  if (active.domain_type === "subdomain" && active.subdomain) {
    const baseDomain = import.meta.env.VITE_BASE_DOMAIN;
    if (baseDomain) return `https://${active.subdomain}.${baseDomain}`;
    return `${window.location.origin}/portal/${active.subdomain}`;
  }
  if (active.custom_domain) return `https://${active.custom_domain}`;
  return null;
}

const TABS = [
  "Overview",
  "Contacts",
  "Commercials",
  "Modules",
  "Subscription",
  "Documents",
  "Activities",
  "Database",
  "Domains",
  "Admin Users",
];

export default function ClientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Overview");
  const [options, setOptions] = useState({});
  const [statusModal, setStatusModal] = useState(false);
  const [statusValue, setStatusValue] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await clientsApi.get(id);
      const d = res.data?.data ?? res.data;
      setClient(d);
      setStatusValue(d.status);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load client.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    clientsApi.options()
      .then((res) => setOptions((res.data?.data ?? res.data) || {}))
      .catch(() => {});
  }, []);

  const saveStatus = async () => {
    try {
      await clientsApi.setStatus(id, statusValue);
      setStatusModal(false);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to update status.");
    }
  };

  if (loading) return <div className="p-6 text-sm t-muted">Loading…</div>;
  if (error) return <div className="p-6 text-sm text-red-400">{error}</div>;
  if (!client) return null;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button onClick={() => navigate("/superadmin/clients")} className="text-xs t-muted hover:underline mb-1">← Back to Clients</button>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="inline-block w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
            <h1 className="text-2xl font-bold t-heading">{client.company_name}</h1>
            <StatusBadge status={client.status} />
            {client.converted_from_lead && (
              <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.25)" }}>From Lead</span>
            )}
          </div>
          <div className="flex items-center gap-3 ml-3 text-sm t-muted">
            <code className="text-[11px] px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: "var(--c-surface2)", border: "1px solid var(--c-border)" }}>{client.client_code}</code>
            {client.industry && <span>{client.industry}</span>}
            {client.country && <span>· {client.country}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(() => {
            const portalUrl = getPortalUrl(client.domains || []);
            return portalUrl ? (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-1.5 text-sm"
                title={portalUrl}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open Client Portal
              </a>
            ) : null;
          })()}
          <button onClick={() => { setStatusValue(client.status); setStatusModal(true); }} className="btn-secondary">Change Status</button>
          {client.converted_from_lead && client.lead_id && (
            <button onClick={() => navigate(`/superadmin/leads/${client.lead_id}`)} className="btn-secondary">View Source Lead</button>
          )}
          <EditIconBtn onClick={() => navigate(`/superadmin/clients/${id}/edit`)} title="Edit client" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b" style={{ borderColor: "var(--c-border)" }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-2 text-sm font-medium transition-all relative"
            style={{ color: tab === t ? "var(--c-accent)" : "var(--c-muted)" }}
          >
            {t}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "linear-gradient(90deg, #00aeec, #ff7a1a)" }} />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "Overview" && <OverviewTab client={client} />}
        {tab === "Contacts" && <ContactsTab clientId={id} contacts={client.contacts} options={options} onChange={load} />}
        {tab === "Commercials" && <CommercialsTab clientId={id} billing={client.billing_profile} options={options} onChange={load} />}
        {tab === "Modules" && <ModulesTab clientId={id} onChange={load} />}
        {tab === "Subscription" && <SubscriptionTab clientId={id} subscription={client.subscription} options={options} onChange={load} />}
        {tab === "Documents" && <DocumentsTab clientId={id} documents={client.documents} options={options} onChange={load} />}
        {tab === "Activities" && <ActivitiesTab clientId={id} />}
        {tab === "Database" && <DatabaseTab clientId={id} db={client.db_connection} clientCode={client.client_code} options={options} onChange={load} />}
        {tab === "Domains" && <DomainsTab clientId={id} domains={client.domains} onChange={load} />}
        {tab === "Admin Users" && <AdminUsersTab clientId={id} admins={client.admin_users} options={options} onChange={load} />}
      </div>

      <Modal
        open={statusModal}
        onClose={() => setStatusModal(false)}
        title="Change Client Status"
        size="sm"
        footer={
          <>
            <button onClick={() => setStatusModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={saveStatus} className="btn-primary">Save</button>
          </>
        }
      >
        <Select label="Status" value={statusValue} onChange={(e) => setStatusValue(e.target.value)} options={toOptions(options.statuses)} placeholder="Select status" />
      </Modal>
    </div>
  );
}

// ── Reusable card / field ─────────────────────────────────────────────────────
function Card({ title, action, children }) {
  return (
    <div className="rounded-xl p-5" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold t-heading flex items-center gap-2">
            <span className="inline-block w-1 h-4 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
            {title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs t-muted mb-0.5">{label}</p>
      <p className="text-sm t-body">{value || "—"}</p>
    </div>
  );
}

function Empty({ children }) {
  return <p className="text-sm t-muted py-4 text-center">{children}</p>;
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab({ client }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Organization">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" value={client.company_name} />
          <Field label="Legal Name" value={client.legal_name} />
          <Field label="Industry" value={client.industry} />
          <Field label="Company Size" value={client.company_size} />
          <Field label="Website" value={client.website} />
          <Field label="Status" value={client.status} />
        </div>
      </Card>
      <Card title="Location">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Postal Code" value={client.postal_code} />
          <Field label="City" value={client.city} />
          <Field label="District" value={client.district} />
          <Field label="State" value={client.state} />
          <Field label="Country" value={client.country} />
          <Field label="Timezone" value={client.timezone} />
        </div>
      </Card>
      <Card title="Record">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Client Code" value={client.client_code} />
          <Field label="Source" value={client.converted_from_lead ? "Converted from Lead" : "Direct"} />
          <Field label="Created" value={formatDateTime(client.created_at)} />
          <Field label="Last Updated" value={formatDateTime(client.updated_at)} />
        </div>
      </Card>
    </div>
  );
}

// ── Contacts ──────────────────────────────────────────────────────────────────
const EMPTY_CONTACT = { contact_type: "Primary", first_name: "", last_name: "", designation: "", email: "", country_code: "", phone: "", is_primary: false };

function ContactsTab({ clientId, contacts = [], options, onChange }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CONTACT);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const open = (c) => {
    setEditing(c || null);
    setForm(c ? { ...EMPTY_CONTACT, ...c } : EMPTY_CONTACT);
    setErr("");
    setModal(true);
  };

  const save = async () => {
    if (!form.first_name.trim()) { setErr("First name is required."); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        contact_type: form.contact_type,
        first_name: form.first_name.trim(),
        last_name: form.last_name?.trim() || undefined,
        designation: form.designation?.trim() || undefined,
        email: form.email?.trim() || undefined,
        country_code: form.country_code?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        is_primary: !!form.is_primary,
      };
      if (editing) await clientsApi.updateContact(clientId, editing.id, payload);
      else await clientsApi.addContact(clientId, payload);
      setModal(false);
      onChange();
    } catch (e) {
      setErr(e.response?.data?.detail || "Failed to save contact.");
    } finally { setSaving(false); }
  };

  const [confirmRemove, setConfirmRemove] = useState(null);

  const remove = async () => {
    if (!confirmRemove) return;
    const c = confirmRemove;
    setConfirmRemove(null);
    try { await clientsApi.deleteContact(clientId, c.id); onChange(); }
    catch (e) { alert(e.response?.data?.detail || "Failed to delete."); }
  };

  return (
    <Card title="Contacts" action={<button onClick={() => open(null)} className="btn-secondary text-xs px-3 py-1.5">+ Add Contact</button>}>
      {contacts.length === 0 ? <Empty>No contacts yet.</Empty> : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium t-heading">{contactName(c)}</span>
                  {c.is_primary && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,174,236,0.12)", color: "#00aeec" }}>Primary</span>}
                  <span className="text-[10px] t-muted">{c.contact_type}</span>
                </div>
                <p className="text-xs t-muted truncate">{[c.designation, c.email, [c.country_code, c.phone].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <EditIconBtn onClick={() => open(c)} title="Edit contact" />
                <DeleteIconBtn onClick={() => setConfirmRemove(c)} title="Delete contact" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Contact" : "Add Contact"}
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save"}</button></>}>
        {err && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Contact Type" value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })} options={toOptions(options.contact_types)} />
          <Input label="First Name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} maxLength={120} />
          <Input label="Last Name" value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} maxLength={120} />
          <Input label="Designation" value={form.designation || ""} onChange={(e) => setForm({ ...form, designation: e.target.value })} maxLength={120} />
          <Input label="Email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <CountryCodeSelect value={form.country_code || ""} onChange={(v) => setForm({ ...form, country_code: v })} />
            <div className="col-span-2"><Input label="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} /></div>
          </div>
          <div className="sm:col-span-2"><Toggle checked={!!form.is_primary} onChange={(v) => setForm({ ...form, is_primary: v })} label="Primary contact" /></div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmRemove}
        title="Delete Contact"
        message={`Delete contact ${contactName(confirmRemove)}?`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={remove}
        onCancel={() => setConfirmRemove(null)}
      />
    </Card>
  );
}

// ── Commercials (billing profile) ────────────────────────────────────────────
const BILLING_FIELDS = [
  ["gst_number", "GST Number"], ["pan_number", "PAN Number"], ["tax_registration_number", "Tax Reg. Number"],
  ["billing_email", "Billing Email"], ["billing_address_1", "Address Line 1"], ["billing_address_2", "Address Line 2"],
  ["city", "City"], ["district", "District"], ["state", "State"], ["country", "Country"], ["postal_code", "Postal Code"],
  ["bank_account_name", "Account Name"], ["bank_account_number", "Account Number"], ["bank_name", "Bank Name"],
  ["bank_branch_name", "Branch"], ["bank_ifsc_code", "IFSC"], ["bank_swift_code", "SWIFT"],
  ["bank_iban", "IBAN"], ["bank_upi_id", "UPI ID"],
];

function CommercialsTab({ clientId, billing, options, onChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const start = () => { setForm({ ...(billing || {}) }); setErr(""); setEditing(true); };

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const payload = {};
      [...BILLING_FIELDS.map(([k]) => k), "payment_terms", "currency_code"].forEach((k) => {
        const v = form[k];
        payload[k] = typeof v === "string" ? (v.trim() || null) : (v ?? null);
      });
      await clientsApi.saveBilling(clientId, payload);
      setEditing(false);
      onChange();
    } catch (e) { setErr(e.response?.data?.detail || "Failed to save."); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <Card title="Commercials & Billing" action={<button onClick={start} className="btn-secondary text-xs px-3 py-1.5">{billing ? "Edit" : "Add"}</button>}>
        {!billing ? <Empty>No billing profile yet.</Empty> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Currency" value={billing.currency_code} />
            <Field label="Payment Terms" value={billing.payment_terms} />
            {BILLING_FIELDS.map(([k, label]) => <Field key={k} label={label} value={billing[k]} />)}
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card title="Edit Commercials & Billing">
      {err && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select label="Currency" value={form.currency_code || ""} onChange={(e) => setForm({ ...form, currency_code: e.target.value })} options={toOptions(options.currencies)} placeholder="Select" />
        <Select label="Payment Terms" value={form.payment_terms || ""} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} options={toOptions(options.payment_terms)} placeholder="Select" />
        {BILLING_FIELDS.map(([k, label]) => (
          <Input key={k} label={label} value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        ))}
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save"}</button>
      </div>
    </Card>
  );
}

// ── Top-level module catalog (UI metadata + submodules) ──────────────────────
const MODULE_CATALOG_UI = {
  "Organization Management": {
    description: "Manage companies, organization structure and employees.",
    color: "#00aeec",
    icon: "building",
    submodules: ["Companies", "Branches", "Departments", "Designations", "Employees", "Employee Documents"],
  },
  "HRMS": {
    description: "Manage the complete employee lifecycle — recruitment, attendance, leave, and payroll.",
    color: "#8b5cf6",
    icon: "briefcase",
    submodules: ["Recruitment", "Interview Management", "Employee Onboarding", "Attendance Management", "Leave Management", "Payroll Management", "Employee Loan Management", "Expense & Reimbursements", "Employee Self Service"],
  },
  "Asset Management": {
    description: "Manage company assets and assignments across locations and teams.",
    color: "#f59e0b",
    icon: "package",
    submodules: ["Asset Inventory", "Asset Maintenance", "Asset Audits", "Asset Requests", "Asset Assignment", "Asset Transfers", "Asset Returns", "Asset Disposal"],
  },
  "CRM": {
    description: "Customer relationship management — leads, accounts, contacts, and opportunities.",
    color: "#ec4899",
    icon: "users",
    submodules: ["CRM Leads", "Accounts", "Contacts", "Opportunities", "CRM Activities", "Quotes", "Customers"],
  },
  "LMS": {
    description: "Learning management — courses, learning paths, assessments, and certifications.",
    color: "#6366f1",
    icon: "academic-cap",
    submodules: ["Courses", "Learning Paths", "Assessments", "Certifications"],
  },
  "BMS": {
    description: "Business management — products, services, categories, and contracts.",
    color: "#0ea5e9",
    icon: "briefcase-alt",
    submodules: ["Products", "Services", "BMS Categories", "BMS Customers", "Contracts"],
  },
  "Finance & Procurement": {
    description: "Vendors, purchase orders, invoices, payments, and budget management.",
    color: "#22c55e",
    icon: "currency",
    submodules: ["Vendors", "Purchase Requests", "Purchase Orders", "Invoices", "Payments", "Budgets", "Cost Centers"],
  },
  "Task & Project Management": {
    description: "Projects, milestones, sprints, task tracking, and timesheets.",
    color: "#f97316",
    icon: "clipboard-list",
    submodules: ["Projects", "Milestones", "Task List", "Sprints", "Timesheets"],
  },
  "Helpdesk": {
    description: "Support ticket and service-request management with SLA tracking.",
    color: "#ef4444",
    icon: "headphones",
    submodules: ["Tickets", "Service Catalog", "SLA Management", "Escalations", "Knowledge Articles"],
  },
  "Visitor Management": {
    description: "Visitor registration, pre-approvals, check-in/check-out, and visitor passes.",
    color: "#14b8a6",
    icon: "id-card",
    submodules: ["Visitor Registration", "Pre-Approvals", "Check-In / Check-Out", "Visitor Passes"],
  },
  "Billing Management": {
    description: "Invoices, payments, and financial records for the workspace.",
    color: "#10b981",
    icon: "credit-card",
    submodules: [],
  },
  "Reports": {
    description: "Analytics dashboards and exportable reports across all modules.",
    color: "#fb923c",
    icon: "bar-chart",
    submodules: ["Organization Reports", "HR Reports", "Asset Reports", "Finance Reports", "Scheduled Reports"],
  },
  "Knowledge Base": {
    description: "Internal wiki, SOPs, and documentation with version control.",
    color: "#84cc16",
    icon: "book",
    submodules: [],
  },
  "Workflow Engine": {
    description: "Process automation and multi-step approval workflows.",
    color: "#06b6d4",
    icon: "git-branch",
    submodules: ["Approval Workflows", "Automation Rules", "Notification Templates", "Escalation Rules"],
  },
  "Client Settings": {
    description: "Workspace configuration — general settings, branding, localization, notifications, and credentials.",
    color: "#64748b",
    icon: "settings",
    submodules: [],
    system: true,
  },
  "User Management": {
    description: "Portal user accounts, roles, and access control for this workspace.",
    color: "#64748b",
    icon: "users",
    submodules: [],
    system: true,
  },
};

function ModuleIcon({ name, color, size = 20 }) {
  const paths = {
    settings:          "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
    building:          "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    briefcase:         "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    "briefcase-alt":   "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    package:           "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    users:             "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    "academic-cap":    "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222",
    currency:          "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    "clipboard-list":  "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    "id-card":         "M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2",
    "credit-card":     "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
    "git-branch":      "M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z",
    "bar-chart":       "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    headphones:        "M3 18v-6a9 9 0 0118 0v6M3 18a1 1 0 001 1h1a1 1 0 001-1v-3a1 1 0 00-1-1H4a1 1 0 00-1 1v3zm16 0a1 1 0 01-1 1h-1a1 1 0 01-1-1v-3a1 1 0 011-1h1a1 1 0 011 1v3z",
    book:              "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  };
  return (
    <svg width={size} height={size} fill="none" stroke={color} strokeWidth={1.7} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name] || paths.package} />
    </svg>
  );
}

// ── Modules ───────────────────────────────────────────────────────────────────
function ModulesTab({ clientId, onChange }) {
  const [nestedModules, setNestedModules] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [pending, setPending]  = useState({});   // module_name → bool
  const [infoModule, setInfoModule] = useState(null); // {name, color, icon, submodules, children}
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving]    = useState(false);
  const [err, setErr]          = useState("");

  const load = useCallback(async () => {
    try {
      const res = await clientsApi.modulesNested(clientId);
      setNestedModules(res.data?.data || []);
    } catch {
      setNestedModules([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  // Build a saved-state lookup from the nested data
  const savedEnabled = useMemo(() => {
    const map = {};
    nestedModules.forEach((mod) => {
      map[mod.module_name] = mod.is_enabled;
      (mod.children || []).forEach((ch) => { map[ch.module_name] = ch.is_enabled; });
    });
    return map;
  }, [nestedModules]);

  const effective = (name) => (name in pending ? pending[name] : !!savedEnabled[name]);

  // Stage a change, recording only diffs from saved state
  const stage = (updates) => {
    setPending((prev) => {
      const next = { ...prev };
      Object.entries(updates).forEach(([name, val]) => {
        if (val === !!savedEnabled[name]) {
          delete next[name];
        } else {
          next[name] = val;
        }
      });
      return next;
    });
  };

  // Toggle a top-level module card (cascades all children)
  const stageParent = (parentName, val) => {
    const parentMod = nestedModules.find((m) => m.module_name === parentName);
    const updates = { [parentName]: val };
    (parentMod?.children || []).forEach((ch) => { updates[ch.module_name] = val; });
    stage(updates);
  };

  // Toggle a single child module (cascade up/down as needed)
  const stageChild = (childName, val, parentMod) => {
    const updates = { [childName]: val };
    if (val) {
      // enabling child → also ensure parent is on
      if (!effective(parentMod.module_name)) updates[parentMod.module_name] = true;
    } else {
      // disabling child → if all siblings now off, also disable parent
      const otherSiblings = (parentMod.children || []).filter((c) => c.module_name !== childName);
      const anyOtherOn = otherSiblings.some((c) => {
        const nm = c.module_name;
        return nm in updates ? updates[nm] : effective(nm);
      });
      if (!anyOtherOn) updates[parentMod.module_name] = false;
    }
    stage(updates);
  };

  // "Select All" toggle in the info modal
  const stageSelectAll = (parentMod, allOn) => {
    const updates = { [parentMod.module_name]: allOn };
    (parentMod.children || []).forEach((ch) => { updates[ch.module_name] = allOn; });
    stage(updates);
  };

  const hasPending = Object.keys(pending).length > 0;
  const discard = () => { setPending({}); setErr(""); };

  const saveAll = async () => {
    setSaving(true); setErr("");
    try {
      for (const [name, val] of Object.entries(pending)) {
        await clientsApi.toggleModule(clientId, name, val);
      }
      setPending({});
      setConfirming(false);
      await load();
      onChange();
    } catch (e) {
      setErr(e.response?.data?.detail || "Some changes could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const enabledChanges  = Object.entries(pending).filter(([, v]) => v).map(([n]) => n);
  const disabledChanges = Object.entries(pending).filter(([, v]) => !v).map(([n]) => n);

  if (loading) return <Card title="Modules"><p style={{ color: "var(--c-muted)", fontSize: 13 }}>Loading…</p></Card>;

  return (
    <>
      <Card title="Modules">
        {hasPending && (
          <div style={{
            marginBottom: 16, padding: "10px 14px", borderRadius: 8,
            background: "rgba(0,174,236,0.08)", border: "1px solid rgba(0,174,236,0.25)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <span style={{ fontSize: 13, color: "var(--c-accent)" }}>
              {Object.keys(pending).length} unsaved change{Object.keys(pending).length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={discard}
                style={{ fontSize: 12, padding: "4px 12px", borderRadius: 5, border: "1px solid var(--c-border)", background: "var(--c-surface2)", color: "var(--c-text2)", cursor: "pointer" }}>
                Discard
              </button>
              <button type="button" onClick={() => setConfirming(true)}
                style={{ fontSize: 12, padding: "4px 14px", borderRadius: 5, border: "none", background: "var(--c-accent)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                Save Changes
              </button>
            </div>
          </div>
        )}
        {err && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{err}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {nestedModules.map((mod) => {
            const ui = MODULE_CATALOG_UI[mod.module_name] || {};
            const isOn = effective(mod.module_name);
            const isDirty = mod.module_name in pending;
            const hasChildren = (mod.children || []).length > 0;
            const enabledChildCount = hasChildren
              ? (mod.children || []).filter((c) => effective(c.module_name)).length
              : null;

            return (
              <div key={mod.module_name} style={{
                borderRadius: 10, padding: "16px",
                background: "var(--c-bg)",
                border: `1px solid ${isDirty ? "rgba(0,174,236,0.4)" : isOn ? `${ui.color || "#00aeec"}28` : "var(--c-border)"}`,
                transition: "border-color 0.15s, box-shadow 0.15s",
                boxShadow: isOn ? `0 0 0 1px ${ui.color || "#00aeec"}14` : "none",
              }}>
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 9, flexShrink: 0,
                      background: isOn ? `${ui.color || "#00aeec"}1a` : "var(--c-surface2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "background 0.15s",
                    }}>
                      <ModuleIcon name={ui.icon || "package"} color={isOn ? (ui.color || "#00aeec") : "var(--c-muted)"} size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-heading)", lineHeight: 1.2 }}>
                        {mod.module_name}
                      </div>
                      {hasChildren && (
                        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>
                          {enabledChildCount}/{mod.children.length} submodules active
                        </div>
                      )}
                    </div>
                  </div>
                  {ui.system ? (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                      background: "rgba(100,116,139,0.12)", color: "#64748b",
                      border: "1px solid rgba(100,116,139,0.25)",
                      display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
                    }}>
                      <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      System
                    </span>
                  ) : (
                    <Toggle checked={isOn} onChange={(v) => stageParent(mod.module_name, v)} />
                  )}
                </div>

                {/* Description */}
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--c-text2)", lineHeight: 1.5 }}>
                  {ui.description || ""}
                </p>

                {/* Info button row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {isDirty && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "rgba(0,174,236,0.15)", color: "var(--c-accent)" }}>
                      {pending[mod.module_name] !== undefined ? (pending[mod.module_name] ? "Enabling" : "Disabling") : "Modified"}
                    </span>
                  )}
                  {!isDirty && <span />}
                  {hasChildren && (
                    <button type="button"
                      onClick={() => setInfoModule(mod)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 6,
                        border: "1px solid var(--c-border)", background: "var(--c-surface2)",
                        color: "var(--c-text2)", cursor: "pointer",
                      }}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Submodules
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Submodule info / toggle modal ────────────────────────────────── */}
      {infoModule && (() => {
        const ui = MODULE_CATALOG_UI[infoModule.module_name] || {};
        const children = infoModule.children || [];
        const allOn  = children.every((c) => effective(c.module_name));
        const someOn = !allOn && children.some((c) => effective(c.module_name));
        const parentOn = effective(infoModule.module_name);

        return (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9000,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }} onClick={() => setInfoModule(null)}>
            <div style={{
              background: "var(--c-surface)", borderRadius: 14, padding: "0",
              width: "100%", maxWidth: 480, maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 24px 64px rgba(0,0,0,0.45)", border: "1px solid var(--c-border)",
            }} onClick={(e) => e.stopPropagation()}>

              {/* Modal header */}
              <div style={{
                padding: "20px 22px 16px", borderBottom: "1px solid var(--c-border)",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
                position: "sticky", top: 0, background: "var(--c-surface)", zIndex: 1, borderRadius: "14px 14px 0 0",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${ui.color || "#00aeec"}1a`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ModuleIcon name={ui.icon || "package"} color={ui.color || "#00aeec"} size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--c-heading)" }}>{infoModule.module_name}</h3>
                    <p style={{ margin: 0, fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>{ui.description}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setInfoModule(null)}
                  style={{ background: "none", border: "none", color: "var(--c-muted)", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 2, flexShrink: 0 }}>
                  ×
                </button>
              </div>

              <div style={{ padding: "16px 22px" }}>
                {/* Submodules section */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--c-muted)" }}>
                      Submodules
                    </p>
                    {/* Select All */}
                    <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: parentOn ? "pointer" : "not-allowed", opacity: parentOn ? 1 : 0.45 }}>
                      <input
                        type="checkbox"
                        checked={allOn}
                        ref={(el) => { if (el) el.indeterminate = someOn; }}
                        disabled={!parentOn}
                        onChange={(e) => stageSelectAll(infoModule, e.target.checked)}
                        style={{ width: 14, height: 14, cursor: "inherit", accentColor: ui.color || "var(--c-accent)" }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text2)" }}>Select All</span>
                    </label>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {children.map((ch) => {
                      const childOn = effective(ch.module_name);
                      const childDirty = ch.module_name in pending;
                      return (
                        <label key={ch.module_name} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "9px 12px", borderRadius: 8, cursor: parentOn ? "pointer" : "not-allowed",
                          background: childOn ? `${ui.color || "#00aeec"}0d` : "var(--c-bg)",
                          border: `1px solid ${childDirty ? `${ui.color || "#00aeec"}50` : childOn ? `${ui.color || "#00aeec"}25` : "var(--c-border)"}`,
                          transition: "background 0.1s, border-color 0.1s",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              type="checkbox"
                              checked={childOn}
                              disabled={!parentOn}
                              onChange={(e) => stageChild(ch.module_name, e.target.checked, infoModule)}
                              style={{ width: 14, height: 14, flexShrink: 0, accentColor: ui.color || "var(--c-accent)", cursor: "inherit" }}
                            />
                            <span style={{ fontSize: 13, color: "var(--c-text)", fontWeight: childOn ? 500 : 400 }}>
                              {ch.module_name}
                            </span>
                            {childDirty && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: "rgba(0,174,236,0.15)", color: "var(--c-accent)" }}>
                                {pending[ch.module_name] ? "Enabling" : "Disabling"}
                              </span>
                            )}
                          </div>
                          {childOn && (
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ui.color || "#00aeec", flexShrink: 0 }} />
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {!parentOn && (
                    <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--c-muted)", textAlign: "center", fontStyle: "italic" }}>
                      Enable {infoModule.module_name} to configure submodules.
                    </p>
                  )}
                </div>

                {/* Future permissions placeholder */}
                <div style={{
                  padding: "14px", borderRadius: 8,
                  background: "var(--c-surface2)", border: "1px dashed var(--c-border)",
                }}>
                  <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--c-muted)" }}>
                    Permissions — coming soon
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--c-muted)" }}>
                    Granular per-submodule permissions (View, Create, Edit, Delete) will be configurable here in a future release.
                  </p>
                </div>

                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setInfoModule(null)}
                    style={{ padding: "8px 20px", borderRadius: 7, border: "1px solid var(--c-border)", background: "var(--c-surface2)", color: "var(--c-text2)", fontSize: 13, cursor: "pointer" }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Confirmation modal ───────────────────────────────────────────── */}
      {confirming && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "var(--c-surface)", borderRadius: 14, padding: "28px 28px 24px",
            width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            border: "1px solid var(--c-border)",
          }}>
            <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "var(--c-heading)" }}>
              Apply module changes?
            </h3>
            <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--c-text2)" }}>
              The following changes will take effect immediately for this client's portal.
            </p>

            {enabledChanges.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#4ade80" }}>
                  Enabling ({enabledChanges.length})
                </p>
                {enabledChanges.map((n) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0" }}>
                    <svg width="14" height="14" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span style={{ fontSize: 13, color: "var(--c-text)" }}>{n}</span>
                  </div>
                ))}
              </div>
            )}

            {disabledChanges.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ margin: "0 0 6px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#f87171" }}>
                  Disabling ({disabledChanges.length})
                </p>
                {disabledChanges.map((n) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 0" }}>
                    <svg width="14" height="14" fill="none" stroke="#f87171" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span style={{ fontSize: 13, color: "var(--c-text)" }}>{n}</span>
                  </div>
                ))}
              </div>
            )}

            {err && <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" onClick={() => { setConfirming(false); setErr(""); }}
                disabled={saving}
                style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--c-border)", background: "var(--c-surface2)", color: "var(--c-text2)", fontSize: 13, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
                Cancel
              </button>
              <button type="button" onClick={saveAll} disabled={saving}
                style={{ padding: "8px 20px", borderRadius: 7, border: "none", background: "var(--c-accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 7 }}>
                {saving ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animation: "spin 0.8s linear infinite" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Saving…
                  </>
                ) : "Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Subscription ──────────────────────────────────────────────────────────────
function SubscriptionTab({ clientId, subscription, options, onChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const start = () => {
    setForm({
      plan_name: subscription?.plan_name || "",
      start_date: toInputDate(subscription?.start_date),
      end_date: toInputDate(subscription?.end_date),
      billing_cycle: subscription?.billing_cycle || "",
      user_limit: subscription?.user_limit ?? "",
      storage_limit: subscription?.storage_limit || "",
      status: subscription?.status || "",
    });
    setErr(""); setEditing(true);
  };

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const payload = {
        plan_name: form.plan_name?.trim() || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        billing_cycle: form.billing_cycle || null,
        user_limit: form.user_limit === "" ? null : Number(form.user_limit),
        storage_limit: form.storage_limit?.trim() || null,
        status: form.status || null,
      };
      await clientsApi.saveSubscription(clientId, payload);
      setEditing(false); onChange();
    } catch (e) { setErr(e.response?.data?.detail || "Failed to save."); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <Card title="Subscription" action={<button onClick={start} className="btn-secondary text-xs px-3 py-1.5">{subscription ? "Edit" : "Add"}</button>}>
        {!subscription ? <Empty>No subscription yet.</Empty> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Plan" value={subscription.plan_name} />
            <div><p className="text-xs t-muted mb-0.5">Status</p><SubscriptionStatusBadge status={subscription.status} /></div>
            <Field label="Billing Cycle" value={subscription.billing_cycle} />
            <Field label="Start Date" value={formatDate(subscription.start_date)} />
            <Field label="End Date" value={formatDate(subscription.end_date)} />
            <Field label="User Limit" value={subscription.user_limit} />
            <Field label="Storage Limit" value={subscription.storage_limit} />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card title="Edit Subscription">
      {err && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Plan Name" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} maxLength={120} />
        <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={toOptions(options.subscription_statuses)} placeholder="Select" />
        <Select label="Billing Cycle" value={form.billing_cycle} onChange={(e) => setForm({ ...form, billing_cycle: e.target.value })} options={toOptions(options.billing_cycles)} placeholder="Select" />
        <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        <Input label="User Limit" type="number" min="0" value={form.user_limit} onChange={(e) => setForm({ ...form, user_limit: e.target.value })} />
        <Input label="Storage Limit" value={form.storage_limit} onChange={(e) => setForm({ ...form, storage_limit: e.target.value })} placeholder="e.g. 50GB" maxLength={40} />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save"}</button>
      </div>
    </Card>
  );
}

// ── Documents ─────────────────────────────────────────────────────────────────
const IMG_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"];
const PDF_EXT  = "pdf";

function fileExt(name) { return (name || "").split(".").pop().toLowerCase(); }
function isImage(name) { return IMG_EXTS.includes(fileExt(name)); }
function isPdf(name)   { return fileExt(name) === PDF_EXT; }
function isPreviewable(name) { return isImage(name) || isPdf(name); }

function FilePreviewModal({ clientId, doc, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let url;
    clientsApi.downloadDocument(clientId, doc.id)
      .then((res) => {
        const mime = isImage(doc.file_name)
          ? `image/${fileExt(doc.file_name) === "svg" ? "svg+xml" : fileExt(doc.file_name)}`
          : "application/pdf";
        const blob = new Blob([res.data], { type: mime });
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      .catch(() => setErr("Failed to load preview."))
      .finally(() => setLoading(false));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [clientId, doc.id, doc.file_name]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "rgba(0,0,0,0.82)" }}
      onClick={onClose}
    >
      {/* Header bar */}
      <div
        className="w-full max-w-5xl flex items-center justify-between px-4 py-2 mb-2 rounded-t-xl"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium t-heading truncate max-w-[80%]" title={doc.file_name}>{doc.file_name}</span>
        <button
          onClick={onClose}
          className="text-xs t-muted hover:text-[var(--c-accent)] px-2 py-1 rounded"
          style={{ border: "1px solid var(--c-border)" }}
        >
          ✕ Close
        </button>
      </div>

      {/* Preview content */}
      <div
        className="w-full max-w-5xl flex-1 flex items-center justify-center rounded-b-xl overflow-hidden"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", minHeight: 0, maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="text-sm t-muted p-8">Loading preview…</div>
        )}
        {err && (
          <div className="text-sm text-red-400 p-8">{err}</div>
        )}
        {!loading && !err && blobUrl && isImage(doc.file_name) && (
          <img
            src={blobUrl}
            alt={doc.file_name}
            className="max-w-full max-h-full object-contain p-4"
            style={{ maxHeight: "80vh" }}
          />
        )}
        {!loading && !err && blobUrl && isPdf(doc.file_name) && (
          <iframe
            src={blobUrl}
            title={doc.file_name}
            className="w-full"
            style={{ height: "80vh", border: "none" }}
          />
        )}
      </div>
      <p className="text-xs t-muted mt-2 opacity-60">Press Esc or click outside to close</p>
    </div>
  );
}

function DocFileIcon({ name }) {
  const ext = fileExt(name);
  if (isPdf(name)) return (
    <div className="w-10 h-10 flex items-center justify-center rounded-lg text-white text-[10px] font-bold"
         style={{ background: "rgba(239,68,68,0.18)", color: "#ef4444" }}>PDF</div>
  );
  if (isImage(name)) return (
    <div className="w-10 h-10 flex items-center justify-center rounded-lg"
         style={{ background: "rgba(0,174,236,0.1)" }}>
      <svg className="w-5 h-5 text-[var(--c-accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.8} />
        <circle cx="8.5" cy="8.5" r="1.5" strokeWidth={1.8} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  );
  return (
    <div className="w-10 h-10 flex items-center justify-center rounded-lg text-white text-[10px] font-bold uppercase"
         style={{ background: "rgba(100,116,139,0.15)", color: "#64748b" }}>{ext || "?"}</div>
  );
}

export function DocumentsTab({ clientId, documents = [], options, onChange }) {
  const [files, setFiles] = useState([]);
  const [failedFiles, setFailedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [docTypeId, setDocTypeId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [replacing, setReplacing] = useState(null);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceErr, setReplaceErr] = useState("");
  const [replaceSaving, setReplaceSaving] = useState(false);
  const [replaceFailed, setReplaceFailed] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteErr, setDeleteErr] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const replaceInputRef = useRef(null);

  const docTypeMaster = options?.document_type_master || [];

  const upload = async () => {
    const toUpload = failedFiles.length > 0 ? failedFiles : files;
    if (toUpload.length === 0) { setErr("Choose at least one file."); return; }
    setUploading(true); setErr("");
    const selected = docTypeMaster.find((t) => t.id === docTypeId);
    const typeName = selected?.name || "Other";
    const results = await Promise.allSettled(
      toUpload.map((f) => clientsApi.uploadDocument(clientId, f, docTypeId || null, typeName))
    );
    const failed = results
      .map((r, i) => (r.status === "rejected" ? toUpload[i] : null))
      .filter(Boolean);
    const succeededCount = results.filter((r) => r.status === "fulfilled").length;
    if (failed.length > 0) {
      const names = failed.map((f) => f.name).join(", ");
      const word = failed.length === 1 ? "file" : "files";
      setErr(
        succeededCount > 0
          ? `${succeededCount} file${succeededCount !== 1 ? "s" : ""} uploaded. Failed to upload ${failed.length} ${word}: ${names}. Please try again.`
          : `Failed to upload ${failed.length} ${word}: ${names}. Please try again.`
      );
      setFailedFiles(failed);
    } else {
      setFiles([]);
      setFailedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDocTypeId("");
      setErr("");
    }
    if (succeededCount > 0) onChange();
    setUploading(false);
  };

  const download = async (doc) => {
    try {
      const res = await clientsApi.downloadDocument(clientId, doc.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = doc.file_name || "document";
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { alert(e.response?.data?.detail || "Download failed."); }
  };

  const openReplace = (doc) => {
    setReplacing(doc);
    setReplaceFile(null);
    setReplaceErr("");
    setReplaceFailed(false);
  };

  const doReplace = async () => {
    if (!replaceFile) { setReplaceErr("Choose a replacement file first."); return; }
    setReplaceSaving(true); setReplaceErr(""); setReplaceFailed(false);
    try {
      await clientsApi.replaceDocument(clientId, replacing.id, replaceFile);
      setReplacing(null);
      onChange();
    } catch (e) { setReplaceErr(e.response?.data?.detail || "Replace failed. Use ↺ Retry to try again."); setReplaceFailed(true); }
    finally { setReplaceSaving(false); }
  };

  const confirmDelete = (doc) => { setDeleteTarget(doc); setDeleteErr(""); };

  const doDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await clientsApi.deleteDocument(clientId, deleteTarget.id);
      setDeleteTarget(null);
      onChange();
    } catch (e) { setDeleteErr(e.response?.data?.detail || "Delete failed."); }
    finally { setDeleting(false); }
  };

  return (
    <Card title="Documents">
      {/* Upload form */}
      <div className="flex flex-wrap items-end gap-3 mb-4 pb-4" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium t-muted">Document Type</label>
          <select
            value={docTypeId}
            onChange={(e) => setDocTypeId(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm w-48"
            style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
          >
            <option value="">— Select type —</option>
            {docTypeMaster.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium t-muted">File{failedFiles.length > 0 ? ` (${failedFiles.length} failed — retry below)` : ""}</label>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => { setFiles(Array.from(e.target.files || [])); setFailedFiles([]); setErr(""); }}
            className="text-sm t-body file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[var(--c-accent)] file:text-white"
          />
        </div>
        <button onClick={upload} disabled={uploading} className="btn-primary text-sm">
          {uploading
            ? "Uploading…"
            : failedFiles.length > 0
              ? `Retry ${failedFiles.length} failed file${failedFiles.length !== 1 ? "s" : ""}`
              : files.length > 1 ? `Upload ${files.length} files` : "Upload"}
        </button>
      </div>
      {err && (
        <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>
          <span>{err}</span>
          {uploadFailed && file && (
            <button onClick={upload} disabled={uploading}
              className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded"
              style={{ background: "rgba(239,68,68,0.15)", color: "inherit" }}>
              {uploading ? "Retrying…" : "↺ Retry upload"}
            </button>
          )}
        </div>
      )}

      {documents.length === 0 ? <Empty>No documents yet.</Empty> : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-xl p-3 flex gap-3" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
              <DocFileIcon name={doc.file_name} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium t-heading truncate" title={doc.file_name}>{doc.file_name}</p>
                <p className="text-xs t-muted mt-0.5">{doc.document_type || "—"}</p>
                <p className="text-xs t-muted">{formatDate(doc.created_at)}</p>
                <div className="flex items-center gap-3 mt-2">
                  {doc.has_file && isPreviewable(doc.file_name) && (
                    <button onClick={() => setPreviewDoc(doc)} className="text-xs font-medium" style={{ color: "var(--c-accent)" }}>Preview</button>
                  )}
                  <button onClick={() => download(doc)} className="text-xs t-muted hover:text-[var(--c-accent)]">Download</button>
                  <button onClick={() => openReplace(doc)} className="text-xs t-muted hover:text-[var(--c-accent)]">Replace</button>
                  <DeleteIconBtn onClick={() => confirmDelete(doc)} title="Delete document" disabled={deleting} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File preview modal */}
      {previewDoc && (
        <FilePreviewModal
          clientId={clientId}
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {/* Replace modal */}
      {replacing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-xl p-6 w-full max-w-md" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <h3 className="text-base font-semibold t-heading mb-1">Replace File</h3>
            <p className="text-sm t-muted mb-4">Replacing: <span className="font-medium t-body">{replacing.file_name}</span>. The document type and metadata will be kept.</p>
            {replaceErr && (
              <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>
                <span>{replaceErr}</span>
                {replaceFailed && replaceFile && (
                  <button onClick={doReplace} disabled={replaceSaving}
                    className="flex-shrink-0 text-xs font-semibold px-2 py-1 rounded"
                    style={{ background: "rgba(239,68,68,0.15)", color: "inherit" }}>
                    {replaceSaving ? "Retrying…" : "↺ Retry replace"}
                  </button>
                )}
              </div>
            )}
            <input ref={replaceInputRef} type="file" onChange={(e) => setReplaceFile(e.target.files?.[0] || null)}
                   className="text-sm t-body mb-4 block file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[var(--c-accent)] file:text-white" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReplacing(null)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={doReplace} disabled={replaceSaving} className="btn-primary text-sm">{replaceSaving ? "Replacing…" : "Replace"}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Document"
        message={`Delete "${deleteTarget?.file_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={doDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteErr(""); }}
        loading={deleting}
        error={deleteErr}
      />
    </Card>
  );
}

// ── Activities ────────────────────────────────────────────────────────────────
function ActivitiesTab({ clientId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientsApi.activities(clientId)
      .then((res) => setActivities((res.data?.data ?? res.data) || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <Card title="Activity Log">
      {loading ? <Empty>Loading…</Empty> : activities.length === 0 ? <Empty>No activity yet.</Empty> : (
        <ul className="space-y-2">
          {activities.map((a) => (
            <li key={a.id} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
              <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: "#00aeec" }} />
              <div className="min-w-0">
                <p className="text-sm t-heading font-medium">{a.action}</p>
                {a.remarks && <p className="text-xs t-body">{a.remarks}</p>}
                <p className="text-xs t-muted">{formatDateTime(a.created_at)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── Database ──────────────────────────────────────────────────────────────────
function DatabaseTab({ clientId, clientCode, db, options, onChange }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [deprovisioning, setDeprovisioning] = useState(false);
  const [confirmDeprovision, setConfirmDeprovision] = useState(false);
  const [err, setErr] = useState("");

  const expectedDbName = clientCode
    ? "officerepo_" + clientCode.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/^_+|_+$/g, "")
    : null;
  const isProvisioned = db?.database_status === "Active";
  const isNotProvisioned = !db || db.database_status === "Not Provisioned";

  const provision = async () => {
    setProvisioning(true); setErr("");
    try {
      await clientsApi.provisionDatabase(clientId);
      onChange();
    } catch (e) { setErr(e.response?.data?.detail || "Provisioning failed."); }
    finally { setProvisioning(false); }
  };

  const deprovision = async () => {
    setDeprovisioning(true); setConfirmDeprovision(false); setErr("");
    try {
      await clientsApi.deprovisionDatabase(clientId);
      onChange();
    } catch (e) { setErr(e.response?.data?.detail || "Deprovisioning failed."); }
    finally { setDeprovisioning(false); }
  };

  const start = () => {
    setForm({
      database_name: db?.database_name || "",
      database_host: db?.database_host || "",
      database_port: db?.database_port ?? "",
      database_username: db?.database_username || "",
      database_password: "",
      database_status: db?.database_status || "",
    });
    setErr(""); setEditing(true);
  };

  const save = async () => {
    setSaving(true); setErr("");
    try {
      const payload = {
        database_name: form.database_name?.trim() || null,
        database_host: form.database_host?.trim() || null,
        database_port: form.database_port === "" ? null : Number(form.database_port),
        database_username: form.database_username?.trim() || null,
        database_status: form.database_status || null,
      };
      if (form.database_password) payload.database_password = form.database_password;
      await clientsApi.saveDatabase(clientId, payload);
      setEditing(false); onChange();
    } catch (e) { setErr(e.response?.data?.detail || "Failed to save."); }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <Card title="Tenant Database">
        {err && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-4" style={{ background: "rgba(239,68,68,0.08)" }}>{err}</div>}

        {/* Status bar */}
        <div className="rounded-lg p-3 mb-4 flex items-center justify-between gap-3" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
          <div className="flex items-center gap-3">
            <DbStatusBadge status={db?.database_status || "Not Provisioned"} />
            {isNotProvisioned && expectedDbName && (
              <span className="text-xs t-muted">Will create: <code className="font-mono">{expectedDbName}</code></span>
            )}
            {isProvisioned && db?.provisioned_at && (
              <span className="text-xs t-muted">Provisioned {formatDateTime(db.provisioned_at)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isNotProvisioned && (
              <button
                onClick={provision}
                disabled={provisioning}
                className="btn-primary text-xs px-3 py-1.5"
              >
                {provisioning ? "Provisioning…" : "Provision Database"}
              </button>
            )}
            {isProvisioned && !confirmDeprovision && (
              <button
                onClick={() => setConfirmDeprovision(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium"
                style={{ background: "rgba(239,68,68,0.12)", color: "var(--c-error, #f87171)", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                Deprovision
              </button>
            )}
            {isProvisioned && confirmDeprovision && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Drop the database?</span>
                <button onClick={deprovision} disabled={deprovisioning}
                  className="text-xs px-2 py-1 rounded font-medium"
                  style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>
                  {deprovisioning ? "Dropping…" : "Yes, drop it"}
                </button>
                <button onClick={() => setConfirmDeprovision(false)} className="text-xs px-2 py-1 rounded btn-secondary">Cancel</button>
              </div>
            )}
            <button onClick={start} className="btn-secondary text-xs px-3 py-1.5">
              {db ? "Edit" : "Configure"}
            </button>
          </div>
        </div>

        {!db ? <Empty>No database configured. Click "Provision Database" to create one automatically.</Empty> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Database Name" value={db.database_name} />
            <Field label="Host" value={db.database_host} />
            <Field label="Port" value={db.database_port} />
            <Field label="Username" value={db.database_username} />
            <Field label="Password" value={db.has_password ? "•••••• (set)" : "Not set"} />
            <Field label="Provisioned At" value={formatDateTime(db.provisioned_at)} />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card title="Edit Tenant Database">
      {err && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{err}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input label="Database Name" value={form.database_name} onChange={(e) => setForm({ ...form, database_name: e.target.value })} maxLength={120} />
        <Input label="Host" value={form.database_host} onChange={(e) => setForm({ ...form, database_host: e.target.value })} maxLength={255} />
        <Input label="Port" type="number" min="1" max="65535" value={form.database_port} onChange={(e) => setForm({ ...form, database_port: e.target.value })} />
        <Input label="Username" value={form.database_username} onChange={(e) => setForm({ ...form, database_username: e.target.value })} maxLength={120} />
        <Input label="Password" type="password" value={form.database_password} onChange={(e) => setForm({ ...form, database_password: e.target.value })} placeholder={db?.has_password ? "Leave blank to keep" : ""} />
        <Select label="Status" value={form.database_status} onChange={(e) => setForm({ ...form, database_status: e.target.value })} options={toOptions(options.db_statuses)} placeholder="Select" />
      </div>
      <div className="flex justify-end gap-3 mt-4">
        <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
      </div>
    </Card>
  );
}

// ── Domains ───────────────────────────────────────────────────────────────────
const DOMAIN_TYPE_META = {
  subdomain: { label: "Platform Subdomain", color: "#8b5cf6", bg: "rgba(139,92,246,0.10)", hint: "Hosted under officerepo.com, e.g. acme.officerepo.com" },
  domain:    { label: "Domain",             color: "#f59e0b", bg: "rgba(245,158,11,0.10)",  hint: "Your own root domain, e.g. acme.com" },
  custom:    { label: "Custom Domain",      color: "#10b981", bg: "rgba(16,185,129,0.10)",  hint: "Any custom hostname, e.g. app.acme.com" },
};

const EMPTY_DOMAIN_FORM = { domain_type: "subdomain", subdomain: "", custom_domain: "" };

function DomainsTab({ clientId, domains = [], onChange }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_DOMAIN_FORM);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(null);
  const [err, setErr] = useState("");

  const openModal = () => { setErr(""); setForm(EMPTY_DOMAIN_FORM); setModal(true); };

  const save = async () => {
    const value = form.domain_type === "subdomain"
      ? form.subdomain?.trim()
      : form.custom_domain?.trim();
    if (!value) {
      setErr(form.domain_type === "subdomain" ? "Enter a subdomain." : "Enter a domain.");
      return;
    }
    setSaving(true); setErr("");
    try {
      await clientsApi.addDomain(clientId, {
        domain_type: form.domain_type,
        subdomain: form.domain_type === "subdomain" ? form.subdomain?.trim() || undefined : undefined,
        custom_domain: form.domain_type !== "subdomain" ? form.custom_domain?.trim() || undefined : undefined,
      });
      setModal(false);
      onChange();
    } catch (e) { setErr(e.response?.data?.detail || "Failed to add domain."); }
    finally { setSaving(false); }
  };

  const activate = async (d) => {
    setActivating(d.id);
    try { await clientsApi.activateDomain(clientId, d.id); onChange(); }
    catch (e) { alert(e.response?.data?.detail || "Failed to activate."); }
    finally { setActivating(null); }
  };

  const [confirmRemoveDomain, setConfirmRemoveDomain] = useState(null);

  const remove = async () => {
    if (!confirmRemoveDomain) return;
    const d = confirmRemoveDomain;
    setConfirmRemoveDomain(null);
    try { await clientsApi.deleteDomain(clientId, d.id); onChange(); }
    catch (e) { alert(e.response?.data?.detail || "Failed."); }
  };

  const meta = DOMAIN_TYPE_META[form.domain_type] || DOMAIN_TYPE_META.custom;

  return (
    <Card
      title="Domains"
      action={<button onClick={openModal} className="btn-secondary text-xs px-3 py-1.5">+ Add Domain</button>}
    >
      {domains.length === 0 ? (
        <Empty>No domains yet.</Empty>
      ) : (
        <div className="space-y-2">
          {domains.map((d) => {
            const typeMeta = DOMAIN_TYPE_META[d.domain_type] || DOMAIN_TYPE_META.custom;
            const displayValue = d.domain_type === "subdomain"
              ? (d.subdomain ? `${d.subdomain}.officerepo.com` : "—")
              : (d.custom_domain || "—");
            const isActive = d.is_active ?? d.is_primary;
            return (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg p-3 gap-3"
                style={{
                  background: "var(--c-bg)",
                  border: isActive ? `1px solid ${typeMeta.color}40` : "1px solid var(--c-border)",
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                      style={{ background: typeMeta.bg, color: typeMeta.color }}
                    >
                      {typeMeta.label}
                    </span>
                    {isActive && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0"
                        style={{ background: "rgba(0,174,236,0.12)", color: "#00aeec" }}
                      >
                        ● Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium t-heading mt-1 truncate">{displayValue}</p>
                  {d.domain_type === "subdomain" && d.subdomain && (
                    <p className="text-xs t-muted">slug: {d.subdomain}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => activate(d)}
                      disabled={activating === d.id}
                      className="text-xs px-2.5 py-1 rounded font-medium"
                      style={{
                        background: "var(--c-surface2, var(--c-surface))",
                        border: "1px solid var(--c-border)",
                        color: "var(--c-text2)",
                        cursor: activating === d.id ? "not-allowed" : "pointer",
                        opacity: activating === d.id ? 0.6 : 1,
                      }}
                    >
                      {activating === d.id ? "Activating…" : "Set Active"}
                    </button>
                  )}
                  <DeleteIconBtn onClick={() => setConfirmRemoveDomain(d)} title="Delete domain" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmRemoveDomain}
        title="Delete Domain"
        message={`Delete domain "${confirmRemoveDomain?.subdomain || confirmRemoveDomain?.custom_domain}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={remove}
        onCancel={() => setConfirmRemoveDomain(null)}
      />

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Add Domain"
        footer={
          <>
            <button onClick={() => setModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Add"}
            </button>
          </>
        }
      >
        {err && (
          <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>
            {err}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide t-muted mb-2">Domain Type</p>
            <div className="flex flex-col gap-2">
              {Object.entries(DOMAIN_TYPE_META).map(([key, m]) => (
                <label
                  key={key}
                  className="flex items-start gap-3 rounded-lg p-3 cursor-pointer"
                  style={{
                    border: form.domain_type === key ? `1px solid ${m.color}60` : "1px solid var(--c-border)",
                    background: form.domain_type === key ? m.bg : "var(--c-bg)",
                  }}
                >
                  <input
                    type="radio"
                    name="domain_type"
                    value={key}
                    checked={form.domain_type === key}
                    onChange={() => setForm({ ...EMPTY_DOMAIN_FORM, domain_type: key })}
                    className="mt-0.5"
                    style={{ accentColor: m.color }}
                  />
                  <div>
                    <p className="text-sm font-medium t-heading">{m.label}</p>
                    <p className="text-xs t-muted">{m.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {form.domain_type === "subdomain" ? (
            <div>
              <Input
                label="Subdomain Slug"
                value={form.subdomain}
                onChange={(e) => setForm({ ...form, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="acme"
                maxLength={120}
              />
              {form.subdomain && (
                <p className="text-xs mt-1" style={{ color: DOMAIN_TYPE_META.subdomain.color }}>
                  → {form.subdomain}.officerepo.com
                </p>
              )}
            </div>
          ) : (
            <Input
              label={form.domain_type === "domain" ? "Root Domain" : "Custom Hostname"}
              value={form.custom_domain}
              onChange={(e) => setForm({ ...form, custom_domain: e.target.value })}
              placeholder={form.domain_type === "domain" ? "acme.com" : "app.acme.com"}
              maxLength={255}
            />
          )}
        </div>
      </Modal>
    </Card>
  );
}

// ── Admin Users ───────────────────────────────────────────────────────────────
const EMPTY_ADMIN = { first_name: "", last_name: "", email: "", country_code: "", phone: "", status: "Invited" };

function CopyText({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 rounded-lg p-2 text-xs" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
      <code className="flex-1 break-all font-mono" style={{ color: "var(--c-text)", fontSize: 11 }}>{value}</code>
      <button type="button" onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); }}
        className="flex-shrink-0 text-xs font-medium" style={{ color: copied ? "#22c55e" : "var(--c-accent)", background: "none", border: "none", cursor: "pointer" }}>
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

function AdminUsersTab({ clientId, admins = [], options, onChange }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ADMIN);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [inviting, setInviting] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);
  const [inviteErr, setInviteErr] = useState("");

  const sendInvite = async (a) => {
    setInviting(a.id); setInviteResult(null); setInviteErr("");
    try {
      const res = await clientsApi.sendAdminUserInvite(clientId, a.id);
      const d = res.data.data;
      // Build the invite link from the browser's own origin so the URL is always
      // reachable (avoids server-side REPLIT_DOMAINS missing the :5000 port).
      const clientLink = `${window.location.origin}/portal/${d.workspace_id}/accept-invite?token=${d.raw_token}`;
      setInviteResult({ admin: a, ...d, invite_link: clientLink });
    } catch (e) { setInviteErr(e.response?.data?.detail || "Failed to send invite."); }
    finally { setInviting(null); }
  };

  const open = (a) => {
    setEditing(a || null);
    setForm(a ? { ...EMPTY_ADMIN, ...a } : EMPTY_ADMIN);
    setErr(""); setModal(true);
  };

  const save = async () => {
    if (!form.first_name.trim()) { setErr("First name is required."); return; }
    setSaving(true); setErr("");
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name?.trim() || undefined,
        email: form.email?.trim() || undefined,
        country_code: form.country_code?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        status: form.status || undefined,
      };
      if (editing) await clientsApi.updateAdminUser(clientId, editing.id, payload);
      else await clientsApi.addAdminUser(clientId, payload);
      setModal(false); onChange();
    } catch (e) { setErr(e.response?.data?.detail || "Failed to save."); }
    finally { setSaving(false); }
  };

  return (
    <Card title="Admin Users" action={<button onClick={() => open(null)} className="btn-secondary text-xs px-3 py-1.5">+ Add Admin User</button>}>
      {admins.length === 0 ? <Empty>No admin users yet.</Empty> : (
        <div className="space-y-2">
          {admins.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium t-heading">{[a.first_name, a.last_name].filter(Boolean).join(" ")}</span>
                  <AdminStatusBadge status={a.status} />
                </div>
                <p className="text-xs t-muted truncate">{[a.email, [a.country_code, a.phone].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => sendInvite(a)} disabled={!!inviting}
                  className="text-xs t-muted hover:text-[var(--c-accent)]"
                  style={{ opacity: inviting === a.id ? 0.5 : 1 }}>
                  {inviting === a.id ? "Sending…" : "Send Invite"}
                </button>
                <span style={{ color: "var(--c-border)" }}>·</span>
                <button onClick={() => open(a)} className="text-xs t-muted hover:text-[var(--c-accent)]">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {inviteErr && (
        <div className="rounded-lg px-3 py-2 text-sm text-red-400 mt-3" style={{ background: "rgba(239,68,68,0.08)" }}>{inviteErr}</div>
      )}

      <Modal open={!!inviteResult} onClose={() => setInviteResult(null)} title="Invite Sent">
        {inviteResult && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--c-text2)" }}>
              {inviteResult.email_sent
                ? <>An invite email was sent to <strong>{inviteResult.admin?.email || "the user"}</strong>.</>
                : <>Email delivery is not configured — share this link directly.</>}
            </p>
            <div>
              <p className="text-xs font-medium mb-1.5" style={{ color: "var(--c-muted)" }}>Invite link (expires in {inviteResult.expires_days} days)</p>
              <CopyText value={inviteResult.invite_link} />
            </div>
          </div>
        )}
        <div slot="footer" />
      </Modal>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Admin User" : "Add Admin User"}
        footer={<><button onClick={() => setModal(false)} className="btn-secondary">Cancel</button><button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving..." : "Save"}</button></>}>
        {err && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{err}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="First Name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} maxLength={120} />
          <Input label="Last Name" value={form.last_name || ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} maxLength={120} />
          <Input label="Email" type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-3 gap-3">
            <CountryCodeSelect value={form.country_code || ""} onChange={(v) => setForm({ ...form, country_code: v })} />
            <div className="col-span-2"><Input label="Phone" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} /></div>
          </div>
          <Select label="Status" value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value })} options={toOptions(options.admin_statuses)} placeholder="Select" />
        </div>
      </Modal>
    </Card>
  );
}
