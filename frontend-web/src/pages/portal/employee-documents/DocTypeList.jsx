import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portalEmpDocApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";

const CATEGORIES = ["Identity Documents", "Employment Documents", "Education Documents", "Previous Employment", "Compliance Documents", "Other Documents"];

export default function DocTypeList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: "", name: "", category: "Identity Documents", expiry_tracking: false, verification_required: false, mandatory_onboarding: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    portalEmpDocApi.listTypes(subdomain, token).then(r => setTypes(r.data?.data?.items || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => { setEditing(null); setForm({ code: "", name: "", category: "Identity Documents", expiry_tracking: false, verification_required: false, mandatory_onboarding: false }); setError(""); setShowModal(true); };
  const openEdit = (t) => { setEditing(t); setForm({ code: t.code, name: t.name, category: t.category, expiry_tracking: t.expiry_tracking, verification_required: t.verification_required, mandatory_onboarding: t.mandatory_onboarding }); setError(""); setShowModal(true); };

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    try {
      if (editing) {
        await portalEmpDocApi.updateType(subdomain, token, editing.id, { name: form.name, category: form.category, expiry_tracking: form.expiry_tracking, verification_required: form.verification_required, mandatory_onboarding: form.mandatory_onboarding });
      } else {
        if (!form.code.trim()) { setError("Code is required."); setSaving(false); return; }
        await portalEmpDocApi.createType(subdomain, token, form);
      }
      setShowModal(false);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  const grouped = CATEGORIES.map(cat => ({ cat, items: types.filter(t => t.category === cat) })).filter(g => g.items.length > 0);

  return (
    <div>
      <PageHeader
        title="Document Types"
        subtitle={`${types.length} types configured`}
        actions={<button onClick={openNew} className="btn-primary">+ Add Type</button>}
      />

      {loading ? <p className="t-muted" style={{ fontSize: 13 }}>Loading…</p> : grouped.map(({ cat, items }) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <div className="t-accent" style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{cat}</div>
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead><tr>
                <th>Code</th><th>Name</th>
                <th style={{ textAlign: "center" }}>Expiry Tracking</th>
                <th style={{ textAlign: "center" }}>Verification</th>
                <th style={{ textAlign: "center" }}>Mandatory</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr></thead>
              <tbody>{items.map(t => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }} className="t-muted">{t.code}</td>
                  <td style={{ fontWeight: 600 }}>{t.name}{t.is_system && <span style={{ marginLeft: 6, fontSize: 10 }} className="badge-info">System</span>}</td>
                  <td style={{ textAlign: "center" }}>{t.expiry_tracking ? "✅" : "—"}</td>
                  <td style={{ textAlign: "center" }}>{t.verification_required ? "✅" : "—"}</td>
                  <td style={{ textAlign: "center" }}>{t.mandatory_onboarding ? "✅" : "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    <Badge status={t.is_active ? "Active" : "Inactive"} />
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => openEdit(t)} className="t-accent" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                    {!t.is_system && (
                      <button onClick={() => portalEmpDocApi.updateType(subdomain, token, t.id, { is_active: !t.is_active }).then(load)} className="t-muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, marginLeft: 8 }}>
                        {t.is_active ? "Disable" : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ))}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="portal-form-card" style={{ width: 460, maxWidth: "95vw" }}>
            <h3 className="portal-form-title" style={{ margin: 0 }}>{editing ? "Edit Document Type" : "Add Document Type"}</h3>
            {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "8px 12px", borderRadius: 6, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {!editing && (
                <div>
                  <label className="portal-form-label">Code *</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SALARY_CERT" className="input-field" />
                </div>
              )}
              <div>
                <label className="portal-form-label">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Salary Certificate" className="input-field" />
              </div>
              <div>
                <label className="portal-form-label">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-field">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[["expiry_tracking", "Expiry Tracking"], ["verification_required", "Verification Required"], ["mandatory_onboarding", "Mandatory During Onboarding"]].map(([key, label]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
