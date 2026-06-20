import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { portalEmpDocApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";

const inp = { padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
const hdr = { padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface-alt,var(--c-surface))" };
const cell = { padding: "10px 12px", borderBottom: "1px solid var(--c-border)", fontSize: 13 };

const CATEGORIES = ["Identity Documents", "Employment Documents", "Education Documents", "Previous Employment", "Compliance Documents", "Other Documents"];

const BLANK = { code: "", name: "", category: "Identity Documents", expiry_tracking: false, verification_required: false, mandatory_onboarding: false };

export default function DocTypeList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    portalEmpDocApi.listTypes(subdomain, token).then(r => setTypes(r.data?.data?.items || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => { setEditing(null); setForm(BLANK); setError(""); setShowModal(true); };
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>Document Types</h2>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--c-muted)" }}>{types.length} types configured</p>
        </div>
        <button onClick={openNew} style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>+ Add Type</button>
      </div>

      {loading ? <p style={{ color: "var(--c-muted)", fontSize: 13 }}>Loading…</p> : grouped.map(({ cat, items }) => (
        <div key={cat} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--c-accent)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{cat}</div>
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={hdr}>Code</th><th style={hdr}>Name</th>
                <th style={{ ...hdr, textAlign: "center" }}>Expiry Tracking</th>
                <th style={{ ...hdr, textAlign: "center" }}>Verification</th>
                <th style={{ ...hdr, textAlign: "center" }}>Mandatory</th>
                <th style={{ ...hdr, textAlign: "center" }}>Status</th>
                <th style={{ ...hdr, textAlign: "right" }}>Actions</th>
              </tr></thead>
              <tbody>{items.map(t => (
                <tr key={t.id}>
                  <td style={{ ...cell, fontFamily: "monospace", fontSize: 11, color: "var(--c-muted)" }}>{t.code}</td>
                  <td style={{ ...cell, fontWeight: 600 }}>{t.name}{t.is_system && <span style={{ marginLeft: 6, fontSize: 10, background: "rgba(99,102,241,0.12)", color: "#818cf8", borderRadius: 4, padding: "1px 5px" }}>System</span>}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{t.expiry_tracking ? "✅" : "—"}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{t.verification_required ? "✅" : "—"}</td>
                  <td style={{ ...cell, textAlign: "center" }}>{t.mandatory_onboarding ? "✅" : "—"}</td>
                  <td style={{ ...cell, textAlign: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: t.is_active ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: t.is_active ? "#22c55e" : "#ef4444" }}>{t.is_active ? "Active" : "Inactive"}</span>
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>
                    <button onClick={() => openEdit(t)} style={{ background: "none", border: "none", color: "var(--c-accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Edit</button>
                    {!t.is_system && (
                      <button onClick={() => portalEmpDocApi.updateType(subdomain, token, t.id, { is_active: !t.is_active }).then(load)} style={{ background: "none", border: "none", color: "var(--c-muted)", cursor: "pointer", fontSize: 12, marginLeft: 8 }}>
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
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 28, width: 460, maxWidth: "95vw" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>{editing ? "Edit Document Type" : "Add Document Type"}</h3>
            {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "8px 12px", borderRadius: 6, marginBottom: 14, fontSize: 13 }}>{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {!editing && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 4, textTransform: "uppercase" }}>Code *</label>
                  <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SALARY_CERT" style={inp} />
                </div>
              )}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 4, textTransform: "uppercase" }}>Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Salary Certificate" style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-muted)", marginBottom: 4, textTransform: "uppercase" }}>Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={inp}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                {[["expiry_tracking", "Expiry Tracking"], ["verification_required", "Verification Required"], ["mandatory_onboarding", "Mandatory During Onboarding"]].map(([key, label]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                    <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "8px 18px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={save} disabled={saving} style={{ padding: "8px 18px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
