import React, { useState, useEffect, useCallback } from "react";
import { moduleRegistryApi } from "../../../../services/apiClient";

const ICON_MAP = {
  "id-card":    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>,
  "briefcase":  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  "package":    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  "headphones": <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 18v-6a9 9 0 0118 0v6M3 18a1 1 0 001 1h1a1 1 0 001-1v-3a1 1 0 00-1-1H4a1 1 0 00-1 1v3zm16 0a1 1 0 01-1 1h-1a1 1 0 01-1-1v-3a1 1 0 011-1h1a1 1 0 011 1v3z" /></svg>,
  "credit-card":<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>,
  "bar-chart":  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  "book":       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
  "git-branch": <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>,
  "user-plus":  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
};

function ModuleIcon({ icon }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 9,
      background: "linear-gradient(135deg, rgba(0,174,236,0.15), rgba(0,174,236,0.05))",
      border: "1px solid rgba(0,174,236,0.2)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--c-accent)", flexShrink: 0,
    }}>
      {ICON_MAP[icon] || (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )}
    </div>
  );
}

function StatusBadge({ isActive, isSystem }) {
  if (isSystem) return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
      System
    </span>
  );
  if (isActive) return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
      Active
    </span>
  );
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: "rgba(100,116,139,0.15)", color: "var(--c-muted)" }}>
      Inactive
    </span>
  );
}

function EditModal({ module, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: module?.name || "",
    description: module?.description || "",
    route: module?.route || "",
    icon: module?.icon || "",
    display_order: module?.display_order ?? 0,
    is_active: module?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      if (module) {
        await moduleRegistryApi.update(module.code, form);
      } else {
        await moduleRegistryApi.create({ ...form, code: form.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") });
      }
      onSaved();
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "8px 10px",
    background: "var(--c-bg)", border: "1px solid var(--c-border)",
    borderRadius: 6, fontSize: 13, color: "var(--c-text)", boxSizing: "border-box",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 24, width: "100%", maxWidth: 480 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "var(--c-text)", marginBottom: 20 }}>
          {module ? `Edit Module — ${module.name}` : "Add Module"}
        </div>

        {error && (
          <div style={{ padding: "8px 12px", marginBottom: 14, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, fontSize: 13, color: "#f87171" }}>{error}</div>
        )}

        <div style={{ display: "grid", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Name</label>
            <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Employee Management" />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 64 }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Short description of what this module does" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Route</label>
              <input style={inputStyle} value={form.route} onChange={e => set("route", e.target.value)} placeholder="employees" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Icon</label>
              <input style={inputStyle} value={form.icon} onChange={e => set("icon", e.target.value)} placeholder="id-card" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Display Order</label>
              <input type="number" style={{ ...inputStyle, width: "auto" }} value={form.display_order} onChange={e => set("display_order", Number(e.target.value))} min={0} />
            </div>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <button type="button" onClick={() => set("is_active", !form.is_active)} style={{
                  width: 36, height: 20, borderRadius: 10,
                  background: form.is_active ? "var(--c-accent)" : "var(--c-border)",
                  border: "none", cursor: "pointer", position: "relative", transition: "background 0.2s",
                }}>
                  <span style={{ position: "absolute", top: 2, left: form.is_active ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                </button>
                <span style={{ fontSize: 13, color: "var(--c-text2)" }}>Active</span>
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving}
            style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onClose} disabled={saving}
            style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontWeight: 500, fontSize: 13, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModuleRegistryPage() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState(undefined);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState(null);
  const [deactivating, setDeactivating] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await moduleRegistryApi.list();
      setModules(res.data?.data || []);
    } catch {
      setError("Failed to load modules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeactivate = async (code, name) => {
    if (!window.confirm(`Deactivate module "${name}"? It will be hidden from all clients until re-activated.`)) return;
    setDeactivating(code);
    try {
      await moduleRegistryApi.deactivate(code);
      showToast(`${name} deactivated`);
      load();
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed to deactivate", false);
    } finally {
      setDeactivating(null);
    }
  };

  const handleSaved = () => {
    setEditTarget(undefined);
    setShowAdd(false);
    showToast("Module saved");
    load();
  };

  const active = modules.filter(m => m.is_active);
  const inactive = modules.filter(m => !m.is_active);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--c-text)" }}>Module Registry</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--c-muted)" }}>
            Platform-wide catalog of all available modules. Enable them per client from the Client details page.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          style={{ padding: "8px 16px", borderRadius: 7, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
          + Add Module
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total",   value: modules.length },
          { label: "Active",  value: active.length },
          { label: "Inactive",value: inactive.length },
          { label: "System",  value: modules.filter(m => m.is_system_module).length },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ border: "1px solid var(--c-border)", background: "var(--c-surface2)" }}>
            <p className="text-xs uppercase tracking-widest t-muted">{s.label}</p>
            <p className="text-2xl font-bold t-heading mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>{error}</div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading modules…</div>
      ) : (
        <>
          {/* Active modules grid */}
          {active.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                Active ({active.length})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12, marginBottom: 24 }}>
                {active.map(m => (
                  <div key={m.code} style={{
                    background: "var(--c-surface)", border: "1px solid var(--c-border)",
                    borderRadius: 10, padding: "14px 16px",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <ModuleIcon icon={m.icon} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{m.name}</span>
                          <StatusBadge isActive={m.is_active} isSystem={m.is_system_module} />
                        </div>
                        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1, fontFamily: "monospace" }}>{m.code}</div>
                      </div>
                    </div>
                    {m.description && (
                      <p style={{ margin: 0, fontSize: 12, color: "var(--c-text2)", lineHeight: 1.5 }}>{m.description}</p>
                    )}
                    <div style={{ display: "flex", gap: 6, alignItems: "center", paddingTop: 4, borderTop: "1px solid var(--c-border)" }}>
                      {m.route && (
                        <span style={{ fontSize: 11, color: "var(--c-muted)", fontFamily: "monospace", flex: 1 }}>
                          /{m.route}
                        </span>
                      )}
                      <button onClick={() => setEditTarget(m)}
                        style={{ fontSize: 12, color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: "2px 6px" }}>
                        Edit
                      </button>
                      {!m.is_system_module && (
                        <button
                          onClick={() => handleDeactivate(m.code, m.name)}
                          disabled={deactivating === m.code}
                          style={{ fontSize: 12, color: "#f87171", background: "none", border: "none", cursor: "pointer", fontWeight: 500, padding: "2px 6px" }}>
                          {deactivating === m.code ? "…" : "Deactivate"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inactive modules */}
          {inactive.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                Inactive ({inactive.length})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                {inactive.map(m => (
                  <div key={m.code} style={{
                    background: "var(--c-surface)", border: "1px solid var(--c-border)",
                    borderRadius: 10, padding: "14px 16px", opacity: 0.65,
                    display: "flex", flexDirection: "column", gap: 10,
                  }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <ModuleIcon icon={m.icon} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{m.name}</span>
                          <StatusBadge isActive={m.is_active} isSystem={m.is_system_module} />
                        </div>
                        <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 1, fontFamily: "monospace" }}>{m.code}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", paddingTop: 4, borderTop: "1px solid var(--c-border)" }}>
                      <button onClick={() => setEditTarget(m)}
                        style={{ fontSize: 12, color: "var(--c-accent)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                        Edit / Re-activate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {modules.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13, background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10 }}>
              No modules registered yet. The catalog seeds automatically on backend startup.
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {editTarget !== undefined && (
        <EditModal module={editTarget} onClose={() => setEditTarget(undefined)} onSaved={handleSaved} />
      )}
      {showAdd && (
        <EditModal module={null} onClose={() => setShowAdd(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}
