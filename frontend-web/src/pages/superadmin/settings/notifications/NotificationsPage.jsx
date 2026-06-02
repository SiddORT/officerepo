import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { notificationsApi } from "../../../../services/apiClient";

const QUILL_MODULES_EMAIL = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ color: [] }, { background: [] }],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["link"],
    ["blockquote", "code-block"],
    ["clean"],
  ],
};

const QUILL_MODULES_PLAIN = {
  toolbar: [["bold", "italic"], ["link"], ["clean"]],
};

const QUILL_THEME_CSS = `
  .ql-toolbar.ql-snow {
    background: var(--c-surface2, var(--c-surface));
    border-color: var(--c-border) !important;
    border-radius: 6px 6px 0 0;
    padding: 6px 8px;
  }
  .ql-container.ql-snow {
    background: var(--c-bg);
    border-color: var(--c-border) !important;
    border-radius: 0 0 6px 6px;
    font-family: inherit;
    font-size: 13px;
  }
  .ql-editor {
    color: var(--c-text);
    min-height: 160px;
    max-height: 320px;
    overflow-y: auto;
  }
  .ql-editor.ql-blank::before {
    color: var(--c-muted);
    font-style: normal;
  }
  .ql-toolbar .ql-stroke { stroke: var(--c-text2) !important; }
  .ql-toolbar .ql-fill { fill: var(--c-text2) !important; }
  .ql-toolbar button:hover .ql-stroke,
  .ql-toolbar button.ql-active .ql-stroke { stroke: var(--c-accent) !important; }
  .ql-toolbar button:hover .ql-fill,
  .ql-toolbar button.ql-active .ql-fill { fill: var(--c-accent) !important; }
  .ql-toolbar .ql-picker-label { color: var(--c-text2) !important; }
  .ql-toolbar .ql-picker-options {
    background: var(--c-surface) !important;
    border-color: var(--c-border) !important;
    color: var(--c-text) !important;
  }
`;

// ── helpers ────────────────────────────────────────────────────────────────────
const TABS = [
  { key: "channels",  label: "Channels" },
  { key: "templates", label: "Templates" },
  { key: "events",    label: "Events" },
  { key: "logs",      label: "Logs" },
];

const CHANNEL_META = {
  email:    { label: "Email",              color: "#3b82f6" },
  sms:      { label: "SMS",               color: "#10b981" },
  whatsapp: { label: "WhatsApp",          color: "#22c55e" },
  push:     { label: "Push Notifications",color: "#f59e0b" },
};

const STATUS_COLORS = {
  queued:     { bg: "#eff6ff", text: "#1d4ed8" },
  processing: { bg: "#fefce8", text: "#a16207" },
  sent:       { bg: "#f0fdf4", text: "#15803d" },
  delivered:  { bg: "#dcfce7", text: "#166534" },
  failed:     { bg: "#fef2f2", text: "#dc2626" },
};

const EVENT_GROUPS = {
  "CRM":           ["lead.created","lead.assigned","lead.updated","lead.converted","lead.closed"],
  "Clients":       ["client.created","client.activated","client.deactivated"],
  "Subscriptions": ["subscription.created","subscription.renewed","subscription.expiring","subscription.expired"],
  "Invoices":      ["invoice.generated","invoice.sent","invoice.paid","invoice.overdue"],
  "Payments":      ["payment.received","payment.failed"],
  "Users":         ["user.created","user.password_reset","user.login","user.2fa_enabled","user.2fa_disabled"],
  "Platform":      ["platform.maintenance","platform.announcement"],
};

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 36, height: 20,
        borderRadius: 10,
        background: checked ? "var(--c-accent)" : "var(--c-border)",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: "absolute",
        top: 2, left: checked ? 18 : 2,
        width: 16, height: 16,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function Pill({ label, style }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 12,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
      ...style,
    }}>{label}</span>
  );
}

function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          borderRadius: 12,
          width, maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--c-border)",
        }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--c-text)" }}>{title}</h3>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--c-muted)", fontSize: 20, lineHeight: 1,
            padding: 4,
          }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, error, children, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--c-text2)", marginBottom: 5 }}>
        {label}{required && <span style={{ color: "var(--c-danger, #ef4444)", marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 3 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: "#ef4444", marginTop: 3 }}>{error}</p>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "8px 10px",
  background: "var(--c-bg)",
  border: "1px solid var(--c-border)",
  borderRadius: 6, fontSize: 13,
  color: "var(--c-text)",
  boxSizing: "border-box",
  outline: "none",
};

const textareaStyle = { ...inputStyle, resize: "vertical", fontFamily: "inherit" };

function Btn({ children, onClick, variant = "primary", size = "md", disabled, type = "button", loading }) {
  const styles = {
    primary: { background: "var(--c-accent)", color: "#fff", border: "none" },
    secondary: { background: "var(--c-surface2, var(--c-surface))", color: "var(--c-text)", border: "1px solid var(--c-border)" },
    danger: { background: "#ef4444", color: "#fff", border: "none" },
    ghost: { background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)" },
  };
  const sizeStyles = {
    sm: { padding: "4px 10px", fontSize: 12 },
    md: { padding: "7px 14px", fontSize: 13 },
    lg: { padding: "9px 18px", fontSize: 14 },
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        ...styles[variant], ...sizeStyles[size],
        borderRadius: 6, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1, transition: "opacity 0.15s",
        display: "inline-flex", alignItems: "center", gap: 6,
      }}
    >
      {loading && <span style={{ width: 12, height: 12, border: "2px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
      {children}
    </button>
  );
}

// ── CHANNELS TAB ──────────────────────────────────────────────────────────────
const EMAIL_FIELDS = [
  { key: "smtp_host",     label: "SMTP Host",       required: true, placeholder: "smtp.example.com" },
  { key: "smtp_port",     label: "SMTP Port",       required: true, placeholder: "587", type: "number" },
  { key: "username",      label: "Username",        required: false, placeholder: "user@example.com" },
  { key: "password",      label: "Password",        required: false, type: "password" },
  { key: "sender_name",   label: "Sender Name",     required: false, placeholder: "Office Repo" },
  { key: "sender_email",  label: "Sender Email",    required: false, placeholder: "noreply@officerepo.com" },
  { key: "reply_to_email",label: "Reply-To Email",  required: false, placeholder: "support@officerepo.com" },
];
const SMS_FIELDS = [
  { key: "provider",    label: "Provider",    required: true, type: "select", options: ["twilio","msg91","textlocal","aws_sns","custom"], optionLabels: ["Twilio","MSG91","TextLocal","AWS SNS","Custom"] },
  { key: "api_key",     label: "API Key / Account SID", required: true },
  { key: "api_secret",  label: "Auth Token / API Secret", required: true, type: "password" },
  { key: "sender_id",   label: "Sender ID / Phone Number", required: false, placeholder: "+919999999999" },
];
const WA_FIELDS = [
  { key: "business_account_id", label: "Business Account ID", required: true },
  { key: "phone_number_id",     label: "Phone Number ID",     required: true },
  { key: "access_token",        label: "Access Token",        required: true, type: "password" },
  { key: "verify_token",        label: "Verify Token",        required: false, type: "password" },
  { key: "webhook_url",         label: "Webhook URL",         required: false, placeholder: "https://..." },
];
const PUSH_FIELDS = [
  { key: "project_id",   label: "Firebase Project ID", required: true },
  { key: "sender_id",    label: "Sender ID",           required: true },
  { key: "server_key",   label: "Server Key",          required: true, type: "password" },
];
const CHANNEL_FIELDS = { email: EMAIL_FIELDS, sms: SMS_FIELDS, whatsapp: WA_FIELDS, push: PUSH_FIELDS };

const ENCRYPTION_OPTIONS = [
  { value: "tls", label: "STARTTLS (recommended)" },
  { value: "ssl", label: "SSL/TLS" },
  { value: "none", label: "None (not recommended)" },
];

function ChannelForm({ channel, data, onSave, onTest }) {
  const fields = CHANNEL_FIELDS[channel] || [];
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (data) {
      setEnabled(data.is_enabled || false);
      setForm(data.config || {});
    }
  }, [data, channel]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    try {
      await onSave(channel, { is_enabled: enabled, config: form });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await onTest(channel);
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const renderField = (f) => {
    const val = form[f.key] ?? "";
    if (f.type === "select") {
      return (
        <select
          value={val}
          onChange={e => set(f.key, e.target.value)}
          style={inputStyle}
        >
          <option value="">— select —</option>
          {f.options.map((o, i) => <option key={o} value={o}>{f.optionLabels?.[i] || o}</option>)}
        </select>
      );
    }
    return (
      <input
        type={f.type === "password" ? "password" : f.type || "text"}
        value={val}
        onChange={e => set(f.key, e.target.value)}
        placeholder={f.placeholder || ""}
        style={inputStyle}
      />
    );
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Toggle checked={enabled} onChange={setEnabled} />
        <span style={{ fontSize: 13, color: "var(--c-text2)" }}>
          {enabled ? "Channel enabled" : "Channel disabled"}
        </span>
      </div>

      {channel === "email" && (
        <Field label="Encryption" required>
          <select value={form.encryption || "tls"} onChange={e => set("encryption", e.target.value)} style={inputStyle}>
            {ENCRYPTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      )}

      {fields.map(f => (
        <Field key={f.key} label={f.label} required={f.required}>
          {renderField(f)}
        </Field>
      ))}

      {testResult && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13,
          background: testResult.ok ? "#f0fdf4" : "#fef2f2",
          color: testResult.ok ? "#166534" : "#dc2626",
          border: `1px solid ${testResult.ok ? "#bbf7d0" : "#fecaca"}`,
        }}>
          {testResult.ok ? "✓" : "✕"} {testResult.message}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <Btn onClick={handleSave} loading={saving}>Save Configuration</Btn>
        {channel === "email" && (
          <Btn variant="ghost" onClick={handleTest} loading={testing}>Test Connection</Btn>
        )}
      </div>
    </div>
  );
}

function ChannelsTab() {
  const [channels, setChannels] = useState([]);
  const [selected, setSelected] = useState("email");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.listChannels();
      setChannels(res.data?.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (ch, payload) => {
    try {
      await notificationsApi.updateChannel(ch, payload);
      showToast("Channel configuration saved");
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed to save", false);
    }
  };

  const handleTest = async (ch) => {
    try {
      const res = await notificationsApi.testChannel(ch);
      return res.data?.data || { ok: false, message: "No response" };
    } catch (e) {
      return { ok: false, message: e.response?.data?.detail || "Connection test failed" };
    }
  };

  const activeChannel = channels.find(c => c.channel === selected);

  return (
    <div>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? "#166534" : "#dc2626", color: "#fff",
          padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}>{toast.msg}</div>
      )}

      <div style={{ display: "flex", gap: 20 }}>
        {/* Channel selector */}
        <div style={{
          width: 200, flexShrink: 0,
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {(["email","sms","whatsapp","push"]).map(ch => {
            const info = channels.find(c => c.channel === ch);
            const meta = CHANNEL_META[ch];
            const active = selected === ch;
            return (
              <button
                key={ch}
                onClick={() => setSelected(ch)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 8,
                  background: active ? "var(--c-accent-dim, rgba(59,130,246,0.08))" : "var(--c-surface2, var(--c-surface))",
                  border: `1px solid ${active ? "var(--c-accent)" : "var(--c-border)"}`,
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: info?.is_enabled ? "#22c55e" : "var(--c-border)",
                  flexShrink: 0,
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: active ? "var(--c-accent)" : "var(--c-text)" }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>
                    {info?.is_enabled ? "Enabled" : "Disabled"}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Config form */}
        <div style={{
          flex: 1,
          background: "var(--c-surface2, var(--c-surface))",
          border: "1px solid var(--c-border)",
          borderRadius: 10,
          padding: 20,
        }}>
          <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>
            {CHANNEL_META[selected]?.label} Configuration
          </h4>
          {loading ? (
            <div style={{ color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
          ) : (
            <ChannelForm
              key={selected}
              channel={selected}
              data={activeChannel}
              onSave={handleSave}
              onTest={handleTest}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── TEMPLATES TAB ─────────────────────────────────────────────────────────────
const EMPTY_TEMPLATE = { channel: "email", name: "", slug: "", subject: "", body: "", variables: "", is_active: true };

function TemplateModal({ open, onClose, initial, onSave }) {
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { ...initial, variables: (initial.variables || []).join(", ") }
        : EMPTY_TEMPLATE
      );
      setError("");
    }
  }, [open, initial]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const isEdit = !!initial?.id;

  const handleSave = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    if (!form.slug.trim()) { setError("Slug is required"); return; }
    if (isBodyEmpty(form.body)) { setError("Body is required"); return; }
    setSaving(true);
    setError("");
    try {
      const vars = form.variables
        ? form.variables.split(",").map(s => s.trim()).filter(Boolean)
        : [];
      await onSave(isEdit ? initial.id : null, { ...form, variables: vars });
      onClose();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isBodyEmpty = (val) => !val || val.trim() === "" || val === "<p><br></p>";

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit Template" : "New Template"} width={740}>
      <style>{QUILL_THEME_CSS}</style>
      <Field label="Channel" required>
        <select value={form.channel} onChange={e => set("channel", e.target.value)} style={inputStyle} disabled={isEdit}>
          {Object.entries(CHANNEL_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Name" required>
          <input value={form.name} onChange={e => set("name", e.target.value)} style={inputStyle} placeholder="Welcome Email" />
        </Field>
        <Field label="Slug" required hint="machine key, e.g. welcome_email">
          <input value={form.slug} onChange={e => set("slug", e.target.value)} style={inputStyle} placeholder="welcome_email" disabled={isEdit} />
        </Field>
      </div>
      {form.channel === "email" && (
        <Field label="Subject">
          <input value={form.subject || ""} onChange={e => set("subject", e.target.value)} style={inputStyle} placeholder="Welcome to {{org_name}}" />
        </Field>
      )}
      <Field
        label="Body"
        required
        hint={form.channel === "email"
          ? "Rich HTML body — use {{variable_name}} for template variables"
          : "Plain text body — use {{variable_name}} for template variables"}
      >
        <ReactQuill
          key={form.channel}
          value={form.body}
          onChange={v => set("body", v)}
          modules={form.channel === "email" ? QUILL_MODULES_EMAIL : QUILL_MODULES_PLAIN}
          theme="snow"
          placeholder={form.channel === "email"
            ? "Hi {{first_name}}, welcome to Office Repo!"
            : "Hi {{first_name}}, your notification here."}
        />
      </Field>
      <Field label="Variables" hint="Comma-separated: first_name, company, email">
        <input
          value={form.variables}
          onChange={e => set("variables", e.target.value)}
          style={inputStyle}
          placeholder="first_name, company"
        />
      </Field>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Toggle checked={form.is_active} onChange={v => set("is_active", v)} />
        <span style={{ fontSize: 13, color: "var(--c-text2)" }}>Active</span>
      </div>
      {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={handleSave} loading={saving}>{isEdit ? "Update" : "Create"}</Btn>
      </div>
    </Modal>
  );
}

function TemplatesTab() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chFilter, setChFilter] = useState("");
  const [modal, setModal] = useState({ open: false, initial: null });
  const [deleting, setDeleting] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = chFilter ? { channel: chFilter } : {};
      const res = await notificationsApi.listTemplates(params);
      setTemplates(res.data?.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [chFilter]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (id, data) => {
    if (id) {
      await notificationsApi.updateTemplate(id, data);
    } else {
      await notificationsApi.createTemplate(data);
    }
    showToast("Template saved");
    load();
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete template "${t.name}"? This cannot be undone.`)) return;
    setDeleting(t.id);
    try {
      await notificationsApi.deleteTemplate(t.id);
      showToast("Template deleted");
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed to delete", false);
    } finally { setDeleting(null); }
  };

  return (
    <div>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? "#166534" : "#dc2626", color: "#fff",
          padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}>{toast.msg}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={chFilter}
            onChange={e => setChFilter(e.target.value)}
            style={{ ...inputStyle, width: "auto", minWidth: 140 }}
          >
            <option value="">All channels</option>
            {Object.entries(CHANNEL_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <Btn onClick={() => setModal({ open: true, initial: null })}>+ New Template</Btn>
      </div>

      {loading ? (
        <div style={{ color: "var(--c-muted)", fontSize: 13, padding: 16 }}>Loading…</div>
      ) : templates.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 40,
          background: "var(--c-surface2, var(--c-surface))",
          borderRadius: 10, border: "1px solid var(--c-border)",
          color: "var(--c-muted)", fontSize: 13,
        }}>
          No templates yet.{" "}
          <button onClick={() => setModal({ open: true, initial: null })}
            style={{ background: "none", border: "none", color: "var(--c-accent)", cursor: "pointer", fontSize: 13 }}>
            Create your first template →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {templates.map(t => (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 16px", borderRadius: 8,
              background: "var(--c-surface2, var(--c-surface))",
              border: "1px solid var(--c-border)",
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: t.is_active ? "#22c55e" : "var(--c-border)",
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)" }}>{t.name}</span>
                  <Pill label={CHANNEL_META[t.channel]?.label || t.channel}
                    style={{ background: "var(--c-accent-dim, rgba(59,130,246,0.1))", color: "var(--c-accent)", fontSize: 10 }} />
                  <code style={{ fontSize: 11, color: "var(--c-muted)", background: "var(--c-bg)", padding: "1px 6px", borderRadius: 4 }}>
                    {t.slug}
                  </code>
                  {t.is_system && <Pill label="system" style={{ background: "#fef3c7", color: "#92400e", fontSize: 10 }} />}
                </div>
                {t.subject && (
                  <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 3 }}>Subject: {t.subject}</div>
                )}
                {t.variables?.length > 0 && (
                  <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1 }}>
                    Vars: {t.variables.join(", ")}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <Btn size="sm" variant="ghost" onClick={() => setModal({ open: true, initial: t })}>Edit</Btn>
                {!t.is_system && (
                  <Btn size="sm" variant="danger" disabled={deleting === t.id}
                    onClick={() => handleDelete(t)}>Delete</Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateModal
        open={modal.open}
        onClose={() => setModal({ open: false, initial: null })}
        initial={modal.initial}
        onSave={handleSave}
      />
    </div>
  );
}

// ── EVENTS TAB ─────────────────────────────────────────────────────────────────
function EventsTab() {
  const [rules, setRules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, tmplRes] = await Promise.all([
        notificationsApi.listEvents(),
        notificationsApi.listTemplates({ active_only: true }),
      ]);
      setRules(rulesRes.data?.data || []);
      setTemplates(tmplRes.data?.data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getRule = (event, channel) =>
    rules.find(r => r.event_name === event && r.channel === channel) || {
      event_name: event, channel,
      is_enabled: false, template_id: null, priority: "normal",
    };

  const handleToggle = async (event, channel, newEnabled) => {
    const key = `${event}:${channel}`;
    setSaving(p => ({ ...p, [key]: true }));
    const existing = getRule(event, channel);
    try {
      const res = await notificationsApi.updateEventRule(event, channel, {
        is_enabled: newEnabled,
        template_id: existing.template_id || null,
        recipient_type: existing.recipient_type || "admin",
        priority: existing.priority || "normal",
      });
      setRules(prev => {
        const next = prev.filter(r => !(r.event_name === event && r.channel === channel));
        return [...next, res.data?.data || { ...existing, is_enabled: newEnabled }];
      });
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed to update", false);
    } finally {
      setSaving(p => ({ ...p, [key]: false }));
    }
  };

  const handleTemplateChange = async (event, channel, templateId) => {
    const key = `${event}:${channel}`;
    setSaving(p => ({ ...p, [key]: true }));
    const existing = getRule(event, channel);
    try {
      const res = await notificationsApi.updateEventRule(event, channel, {
        is_enabled: existing.is_enabled,
        template_id: templateId || null,
        recipient_type: existing.recipient_type || "admin",
        priority: existing.priority || "normal",
      });
      setRules(prev => {
        const next = prev.filter(r => !(r.event_name === event && r.channel === channel));
        return [...next, res.data?.data || { ...existing, template_id: templateId }];
      });
    } catch { /* ignore */ }
    finally {
      setSaving(p => ({ ...p, [key]: false }));
    }
  };

  const channels = ["email","sms","whatsapp","push"];

  if (loading) return <div style={{ color: "var(--c-muted)", fontSize: 13, padding: 16 }}>Loading…</div>;

  return (
    <div>
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? "#166534" : "#dc2626", color: "#fff",
          padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}>{toast.msg}</div>
      )}

      <p style={{ fontSize: 13, color: "var(--c-muted)", marginBottom: 16 }}>
        Configure which channels fire for each platform event. Toggle to enable, then select a template.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--c-muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, background: "var(--c-surface2, var(--c-surface))", border: "1px solid var(--c-border)", minWidth: 180 }}>Event</th>
              {channels.map(ch => (
                <th key={ch} style={{ padding: "8px 12px", color: "var(--c-muted)", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", background: "var(--c-surface2, var(--c-surface))", border: "1px solid var(--c-border)", minWidth: 160 }}>
                  {CHANNEL_META[ch].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(EVENT_GROUPS).map(([group, events]) => (
              <React.Fragment key={group}>
                <tr>
                  <td colSpan={5} style={{
                    padding: "6px 12px", background: "var(--c-bg)",
                    fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                    letterSpacing: 0.5, color: "var(--c-muted)",
                    border: "1px solid var(--c-border)",
                  }}>
                    {group}
                  </td>
                </tr>
                {events.map(event => (
                  <tr key={event}>
                    <td style={{ padding: "8px 12px", border: "1px solid var(--c-border)", color: "var(--c-text)", background: "var(--c-surface)", whiteSpace: "nowrap" }}>
                      {event.replace(/\./g, " › ")}
                    </td>
                    {channels.map(ch => {
                      const rule = getRule(event, ch);
                      const key = `${event}:${ch}`;
                      const chTemplates = templates.filter(t => t.channel === ch);
                      return (
                        <td key={ch} style={{ padding: "6px 12px", border: "1px solid var(--c-border)", background: "var(--c-surface)", verticalAlign: "middle" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                            <Toggle
                              checked={rule.is_enabled}
                              onChange={v => handleToggle(event, ch, v)}
                              disabled={saving[key]}
                            />
                            {rule.is_enabled && (
                              <select
                                value={rule.template_id || ""}
                                onChange={e => handleTemplateChange(event, ch, e.target.value)}
                                style={{ ...inputStyle, fontSize: 11, padding: "3px 6px", width: "100%" }}
                              >
                                <option value="">No template</option>
                                {chTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                              </select>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── LOGS TAB ──────────────────────────────────────────────────────────────────
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ channel: "", status: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: 25 };
      if (filters.channel) params.channel = filters.channel;
      if (filters.status) params.status = filters.status;
      const res = await notificationsApi.listLogs(params);
      const d = res.data?.data || {};
      setLogs(d.items || []);
      setTotal(d.total || 0);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso + (iso.endsWith("Z") ? "" : "Z")).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  const statusColor = (s) => STATUS_COLORS[s] || { bg: "var(--c-surface2)", text: "var(--c-muted)" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select
          value={filters.channel}
          onChange={e => { setFilters(p => ({ ...p, channel: e.target.value })); setPage(1); }}
          style={{ ...inputStyle, width: "auto", minWidth: 140 }}
        >
          <option value="">All channels</option>
          {Object.entries(CHANNEL_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={filters.status}
          onChange={e => { setFilters(p => ({ ...p, status: e.target.value })); setPage(1); }}
          style={{ ...inputStyle, width: "auto", minWidth: 130 }}
        >
          <option value="">All statuses</option>
          {["queued","processing","sent","delivered","failed"].map(s =>
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          )}
        </select>
        <Btn variant="ghost" onClick={load}>Refresh</Btn>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--c-muted)", alignSelf: "center" }}>
          {total} total
        </span>
      </div>

      {loading ? (
        <div style={{ color: "var(--c-muted)", fontSize: 13, padding: 16 }}>Loading…</div>
      ) : logs.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 40,
          background: "var(--c-surface2, var(--c-surface))",
          borderRadius: 10, border: "1px solid var(--c-border)",
          color: "var(--c-muted)", fontSize: 13,
        }}>
          No delivery logs found.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Channel","Recipient","Event","Status","Queued At","Error"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "7px 10px",
                    background: "var(--c-surface2, var(--c-surface))",
                    border: "1px solid var(--c-border)",
                    color: "var(--c-muted)", fontWeight: 500, fontSize: 11,
                    textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => {
                const sc = statusColor(log.status);
                return (
                  <tr key={log.id} style={{ background: "var(--c-surface)" }}>
                    <td style={{ padding: "7px 10px", border: "1px solid var(--c-border)", whiteSpace: "nowrap" }}>
                      <Pill label={CHANNEL_META[log.channel]?.label || log.channel}
                        style={{ background: "var(--c-accent-dim, rgba(59,130,246,0.1))", color: "var(--c-accent)", fontSize: 10 }} />
                    </td>
                    <td style={{ padding: "7px 10px", border: "1px solid var(--c-border)", color: "var(--c-text)", fontFamily: "monospace", fontSize: 12 }}>{log.recipient}</td>
                    <td style={{ padding: "7px 10px", border: "1px solid var(--c-border)", color: "var(--c-muted)", fontSize: 11 }}>{log.event_name || "—"}</td>
                    <td style={{ padding: "7px 10px", border: "1px solid var(--c-border)" }}>
                      <Pill label={log.status} style={{ background: sc.bg, color: sc.text }} />
                    </td>
                    <td style={{ padding: "7px 10px", border: "1px solid var(--c-border)", color: "var(--c-muted)", fontSize: 11, whiteSpace: "nowrap" }}>{fmtDate(log.queued_at)}</td>
                    <td style={{ padding: "7px 10px", border: "1px solid var(--c-border)", color: "#ef4444", fontSize: 11, maxWidth: 200 }}>
                      {log.error_message ? (
                        <span title={log.error_message}>{log.error_message.slice(0, 50)}{log.error_message.length > 50 ? "…" : ""}</span>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 25 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
          <Btn size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Btn>
          <span style={{ fontSize: 12, color: "var(--c-muted)", alignSelf: "center" }}>
            Page {page} of {Math.ceil(total / 25)}
          </span>
          <Btn size="sm" variant="ghost" disabled={page >= Math.ceil(total / 25)} onClick={() => setPage(p => p + 1)}>Next →</Btn>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState("channels");

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--c-text)" }}>
          Notification Management
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--c-muted)" }}>
          Configure channels, manage templates, set event triggers, and view delivery logs.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 2, marginBottom: 24,
        borderBottom: "1px solid var(--c-border)",
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "8px 18px", background: "none", border: "none",
              cursor: "pointer", fontSize: 14, fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? "var(--c-accent)" : "var(--c-text2)",
              borderBottom: activeTab === t.key ? "2px solid var(--c-accent)" : "2px solid transparent",
              marginBottom: -1, transition: "all 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "channels"  && <ChannelsTab />}
      {activeTab === "templates" && <TemplatesTab />}
      {activeTab === "events"    && <EventsTab />}
      {activeTab === "logs"      && <LogsTab />}
    </div>
  );
}
