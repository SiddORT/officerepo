import React, { useEffect, useState } from "react";
import { orgApi } from "../../../services/apiClient";

const unwrap = (res) => res?.data?.data ?? res?.data;

const REQUIRED = ["org_name", "legal_entity_name", "org_code", "support_email"];

const FIELDS = [
  {
    section: "Identity",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    rows: [
      { key: "org_name", label: "Organization Name", required: true, type: "text", col: 2 },
      { key: "legal_entity_name", label: "Legal Entity Name", required: true, type: "text", col: 2 },
      { key: "org_code", label: "Organization Code", required: true, type: "text", col: 1, hint: "Short unique identifier (e.g. ACME)" },
      { key: "website", label: "Website", type: "url", col: 1, hint: "Must start with https://" },
      { key: "gst_number", label: "GST Number", type: "text", col: 1 },
      { key: "company_registration_number", label: "Company Registration Number", type: "text", col: 1 },
    ],
  },
  {
    section: "Contact",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    rows: [
      { key: "support_email", label: "Support Email", required: true, type: "email", col: 1 },
      { key: "sales_email", label: "Sales Email", type: "email", col: 1 },
      { key: "billing_email", label: "Billing Email", type: "email", col: 1 },
      { key: "support_phone", label: "Support Phone", type: "tel", col: 1 },
    ],
  },
];

const EMPTY = {
  org_name: "", legal_entity_name: "", org_code: "",
  website: "", gst_number: "", company_registration_number: "",
  support_email: "", sales_email: "", billing_email: "", support_phone: "",
};

function Banner({ kind, msg }) {
  if (!msg) return null;
  const ok = kind === "success";
  return (
    <div className="flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 mb-5" style={{
      background: ok ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
      color: ok ? "#10b981" : "#ef4444",
      border: `1px solid ${ok ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
    }}>
      {ok ? (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {msg}
    </div>
  );
}

function ReadField({ field, value }) {
  const display = value?.trim() || null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--c-muted)", letterSpacing: "0.06em" }}>
        {field.label}
        {field.required && <span style={{ color: "#ef4444" }}> *</span>}
      </p>
      {display ? (
        <p className="text-sm font-medium" style={{ color: "var(--c-text)" }}>{display}</p>
      ) : (
        <p className="text-sm" style={{ color: "var(--c-muted)", fontStyle: "italic" }}>Not set</p>
      )}
    </div>
  );
}

function EditField({ field, value, onChange, error }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--c-muted)", letterSpacing: "0.06em" }}>
        {field.label}
        {field.required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      <input
        type={field.type === "email" ? "email" : field.type === "url" ? "url" : field.type === "tel" ? "tel" : "text"}
        value={value ?? ""}
        onChange={e => onChange(field.key, e.target.value)}
        placeholder={field.hint ?? ""}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
        style={{
          background: "var(--c-surface2)",
          border: `1px solid ${error ? "#ef4444" : "var(--c-border)"}`,
          color: "var(--c-text)",
          boxShadow: error ? "0 0 0 3px rgba(239,68,68,0.12)" : undefined,
        }}
        onFocus={e => { e.target.style.borderColor = error ? "#ef4444" : "var(--c-accent)"; e.target.style.boxShadow = error ? "0 0 0 3px rgba(239,68,68,0.12)" : "0 0 0 3px var(--c-accent-dim)"; }}
        onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "var(--c-border)"; e.target.style.boxShadow = error ? "0 0 0 3px rgba(239,68,68,0.12)" : "none"; }}
      />
      {error && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{error}</p>}
      {!error && field.hint && (
        <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>{field.hint}</p>
      )}
    </div>
  );
}

export default function OrganizationSettings() {
  const [data, setData] = useState(EMPTY);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await orgApi.get();
      const d = unwrap(res) ?? EMPTY;
      const filled = { ...EMPTY, ...d };
      setData(filled);
      setForm(filled);
    } catch {
      setBanner({ kind: "error", msg: "Failed to load organization settings." });
    } finally {
      setLoading(false);
    }
  }

  function handleChange(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate() {
    const errs = {};
    const emailRx = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    const urlRx = /^https?:\/\/.+/i;

    FIELDS.flatMap(s => s.rows).forEach(f => {
      const v = (form[f.key] ?? "").trim();
      if (f.required && !v) { errs[f.key] = "Required"; return; }
      if (v && f.type === "email" && !emailRx.test(v)) { errs[f.key] = "Invalid email address"; return; }
      if (v && f.type === "url" && !urlRx.test(v)) { errs[f.key] = "Must start with http:// or https://"; }
    });
    return errs;
  }

  function startEdit() { setForm({ ...data }); setErrors({}); setBanner(null); setEditing(true); }
  function cancelEdit() { setForm({ ...data }); setErrors({}); setBanner(null); setEditing(false); }

  async function save() {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    setBanner(null);
    try {
      const payload = {};
      FIELDS.flatMap(s => s.rows).forEach(f => {
        payload[f.key] = form[f.key]?.trim() || null;
      });
      REQUIRED.forEach(k => { if (!payload[k]) payload[k] = ""; });

      const res = await orgApi.update(payload);
      const saved = unwrap(res);
      const filled = { ...EMPTY, ...saved };
      setData(filled);
      setForm(filled);
      setEditing(false);
      setBanner({ kind: "success", msg: "Organization settings saved successfully." });
    } catch (err) {
      const detail = err?.response?.data?.detail || err?.response?.data?.message || "Failed to save. Please try again.";
      setBanner({ kind: "error", msg: Array.isArray(detail) ? detail.map(d => d.msg || d).join("; ") : detail });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--c-border)", borderTopColor: "var(--c-accent)" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>Organization Settings</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--c-muted)" }}>
            Platform identity, registration details, and contact information
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing ? (
            <button onClick={startEdit} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          ) : (
            <>
              <button onClick={cancelEdit} disabled={saving} className="btn-secondary text-sm px-3 py-1.5">
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5">
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      <Banner kind={banner?.kind} msg={banner?.msg} />

      {/* Sections */}
      <div className="space-y-4">
        {FIELDS.map(section => (
          <div
            key={section.section}
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              boxShadow: "var(--c-shadow)",
            }}
          >
            {/* Section header — icon + label + thin accent top strip */}
            <div style={{ borderTop: "2px solid var(--c-accent)", borderRadius: "12px 12px 0 0" }} />
            <div
              className="flex items-center gap-2.5 px-5 py-4"
              style={{ borderBottom: "1px solid var(--c-border)" }}
            >
              <span style={{ color: "var(--c-accent)" }}>{section.icon}</span>
              <h3 className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>
                {section.section}
              </h3>
            </div>

            {/* Fields */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                {section.rows.map(f => (
                  <div key={f.key} className={f.col === 2 ? "col-span-2" : "col-span-1"}>
                    {editing ? (
                      <EditField
                        field={f}
                        value={form[f.key]}
                        onChange={handleChange}
                        error={errors[f.key]}
                      />
                    ) : (
                      <ReadField field={f} value={form[f.key]} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Meta footer */}
      {(data.updated_at || data.updated_by) && (
        <div className="flex items-center gap-5 mt-5 pt-4" style={{ borderTop: "1px solid var(--c-border)" }}>
          {data.updated_by && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--c-muted)" }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Last updated by: <span style={{ color: "var(--c-text2)" }}>{data.updated_by}</span>
            </span>
          )}
          {data.updated_at && (
            <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--c-muted)" }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Updated at: <span style={{ color: "var(--c-text2)" }}>
                {new Date(data.updated_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
