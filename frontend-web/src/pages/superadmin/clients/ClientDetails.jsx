import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clientsApi } from "../../../services/apiClient";
import Modal from "../../../components/ui/Modal";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import CountryCodeSelect from "../../../components/ui/CountryCodeSelect";
import Toggle from "../../../components/ui/Toggle";
import {
  StatusBadge,
  DbStatusBadge,
  SubscriptionStatusBadge,
  AdminStatusBadge,
} from "./components/StatusBadge";
import { toOptions, formatDate, formatDateTime, toInputDate, contactName } from "./constants";

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
        <div className="flex items-center gap-2">
          <button onClick={() => { setStatusValue(client.status); setStatusModal(true); }} className="btn-secondary">Change Status</button>
          {client.converted_from_lead && client.lead_id && (
            <button onClick={() => navigate(`/superadmin/leads/${client.lead_id}`)} className="btn-secondary">View Source Lead</button>
          )}
          <button onClick={() => navigate(`/superadmin/clients/${id}/edit`)} className="btn-primary">Edit</button>
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
        {tab === "Modules" && <ModulesTab clientId={id} modules={client.modules} options={options} onChange={load} />}
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
          <Field label="Country" value={client.country} />
          <Field label="State" value={client.state} />
          <Field label="City" value={client.city} />
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

  const remove = async (c) => {
    if (!window.confirm(`Delete contact ${contactName(c)}?`)) return;
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
                <button onClick={() => open(c)} className="text-xs t-muted hover:text-[var(--c-accent)]">Edit</button>
                <button onClick={() => remove(c)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
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
    </Card>
  );
}

// ── Commercials (billing profile) ────────────────────────────────────────────
const BILLING_FIELDS = [
  ["gst_number", "GST Number"], ["pan_number", "PAN Number"], ["tax_registration_number", "Tax Reg. Number"],
  ["billing_email", "Billing Email"], ["billing_address_1", "Address Line 1"], ["billing_address_2", "Address Line 2"],
  ["city", "City"], ["state", "State"], ["country", "Country"], ["postal_code", "Postal Code"],
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

// ── Modules ───────────────────────────────────────────────────────────────────
function ModulesTab({ clientId, modules = [], options, onChange }) {
  const [busy, setBusy] = useState("");
  const enabledMap = Object.fromEntries(modules.map((m) => [m.module_name, m.is_enabled]));
  const allModules = options.modules || [];

  const toggle = async (name, value) => {
    setBusy(name);
    try { await clientsApi.toggleModule(clientId, name, value); onChange(); }
    catch (e) { alert(e.response?.data?.detail || "Failed."); }
    finally { setBusy(""); }
  };

  return (
    <Card title="Modules">
      {allModules.length === 0 ? <Empty>No modules available.</Empty> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {allModules.map((name) => (
            <div key={name} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
              <span className="text-sm t-body">{name}</span>
              <Toggle checked={!!enabledMap[name]} disabled={busy === name} onChange={(v) => toggle(name, v)} />
            </div>
          ))}
        </div>
      )}
    </Card>
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
function DocumentsTab({ clientId, documents = [], options, onChange }) {
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("Other");
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  const upload = async () => {
    if (!file) { setErr("Choose a file first."); return; }
    setUploading(true); setErr("");
    try {
      await clientsApi.uploadDocument(clientId, file, docType);
      setFile(null);
      onChange();
    } catch (e) { setErr(e.response?.data?.detail || "Upload failed."); }
    finally { setUploading(false); }
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

  const remove = async (doc) => {
    if (!window.confirm(`Delete ${doc.file_name}?`)) return;
    try { await clientsApi.deleteDocument(clientId, doc.id); onChange(); }
    catch (e) { alert(e.response?.data?.detail || "Failed."); }
  };

  return (
    <Card title="Documents">
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <Select label="Type" value={docType} onChange={(e) => setDocType(e.target.value)} options={toOptions(options.document_types)} className="w-40" />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium t-body">File</label>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm t-body" />
        </div>
        <button onClick={upload} disabled={uploading} className="btn-primary">{uploading ? "Uploading..." : "Upload"}</button>
      </div>
      {err && <div className="rounded-lg px-3 py-2 text-sm text-red-400 mb-3" style={{ background: "rgba(239,68,68,0.08)" }}>{err}</div>}
      {documents.length === 0 ? <Empty>No documents yet.</Empty> : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg p-3" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
              <div className="min-w-0">
                <span className="text-sm font-medium t-heading block truncate">{doc.file_name}</span>
                <span className="text-xs t-muted">{doc.document_type} · {formatDate(doc.created_at)}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button onClick={() => download(doc)} className="text-xs t-muted hover:text-[var(--c-accent)]">Download</button>
                <button onClick={() => remove(doc)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
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

  const remove = async (d) => {
    if (!window.confirm("Delete this domain?")) return;
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
                  <button
                    onClick={() => remove(d)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

function AdminUsersTab({ clientId, admins = [], options, onChange }) {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ADMIN);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

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
              <button onClick={() => open(a)} className="text-xs t-muted hover:text-[var(--c-accent)] flex-shrink-0">Edit</button>
            </div>
          ))}
        </div>
      )}

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
