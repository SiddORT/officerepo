import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";
import PageHeader from "../shared/PageHeader";

export default function RoleForm({ editMode = false }) {
  const { subdomain, roleId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", description: "" });
  const [isSystemRole, setIsSystemRole] = useState(false);
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Permissions state
  const [catalog, setCatalog] = useState([]);      // [{module, module_label, permissions:[{id,name,description}]}]
  const [checkedIds, setCheckedIds] = useState(new Set());
  const [permsLoading, setPermsLoading] = useState(false);
  const [permsSaving, setPermsSaving] = useState(false);
  const [permsMsg, setPermsMsg] = useState(null);  // {ok, text}

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Load permission catalog
  const loadCatalog = useCallback(async () => {
    setPermsLoading(true);
    try {
      const res = await portalUserMgmtApi.getPermissions(subdomain, token);
      setCatalog(res.data?.data || []);
    } catch { /* silent */ }
    finally { setPermsLoading(false); }
  }, [subdomain, token]);

  // Load current role permissions (edit mode)
  const loadRolePerms = useCallback(async () => {
    if (!editMode || !roleId) return;
    try {
      const res = await portalUserMgmtApi.getRolePermissions(subdomain, token, roleId);
      const ids = res.data?.data?.permission_ids || [];
      setCheckedIds(new Set(ids));
    } catch { /* silent */ }
  }, [subdomain, token, roleId, editMode]);

  const loadRole = useCallback(async () => {
    if (!editMode || !roleId) return;
    setLoading(true);
    try {
      const res = await portalUserMgmtApi.getRole(subdomain, token, roleId);
      const r = res.data?.data || {};
      setForm({ name: r.name || "", description: r.description || "" });
      setIsSystemRole(!!r.is_system_role);
    } catch { setError("Failed to load role."); }
    finally { setLoading(false); }
  }, [subdomain, token, roleId, editMode]);

  useEffect(() => {
    loadCatalog();
    if (editMode) {
      loadRole();
      loadRolePerms();
    }
  }, [loadCatalog, loadRole, loadRolePerms, editMode]);

  const togglePerm = (permId) => {
    if (isSystemRole) return;
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleModule = (modulePerms) => {
    if (isSystemRole) return;
    const allChecked = modulePerms.every(p => checkedIds.has(p.id));
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (allChecked) { modulePerms.forEach(p => next.delete(p.id)); }
      else { modulePerms.forEach(p => next.add(p.id)); }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Role name is required."); return; }
    setSaving(true); setError("");
    try {
      let savedRoleId = roleId;
      if (editMode) {
        if (!isSystemRole) await portalUserMgmtApi.updateRole(subdomain, token, roleId, form);
      } else {
        const res = await portalUserMgmtApi.createRole(subdomain, token, form);
        savedRoleId = res.data?.data?.id;
      }
      // Save permissions
      if (savedRoleId && !isSystemRole) {
        await portalUserMgmtApi.setRolePermissions(subdomain, token, savedRoleId, [...checkedIds]);
      }
      navigate(`/portal/${subdomain}/user-management/roles`);
    } catch (e) {
      setError(e.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePermsOnly = async () => {
    if (!roleId || isSystemRole) return;
    setPermsSaving(true); setPermsMsg(null);
    try {
      await portalUserMgmtApi.setRolePermissions(subdomain, token, roleId, [...checkedIds]);
      setPermsMsg({ ok: true, text: "Permissions saved." });
      setTimeout(() => setPermsMsg(null), 2500);
    } catch (e) {
      setPermsMsg({ ok: false, text: e.response?.data?.detail || "Failed to save permissions." });
    } finally {
      setPermsSaving(false);
    }
  };

  const allPerms = catalog.flatMap(m => m.permissions);
  const allChecked = allPerms.length > 0 && allPerms.every(p => checkedIds.has(p.id));
  const someChecked = allPerms.some(p => checkedIds.has(p.id));

  return (
    <UserManagementLayout title={editMode ? "Edit Role" : "Create Role"}>
      <div>
        <PageHeader 
          title={editMode ? "Edit Role" : "Create Role"} 
          subtitle={editMode ? "Update role details and permissions." : "Define a new role and assign permissions."} 
        />

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>{error}</div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── Role details ─────────────────────────────────────────── */}
            <div className="portal-form-card">
              <div className="portal-form-title">Role Details</div>
              <div className="portal-form-row">
                <div>
                  <label className="portal-form-label portal-form-label-req">Role Name</label>
                  <input className="input-field" style={{ opacity: isSystemRole ? 0.6 : 1 }}
                    value={form.name} onChange={e => set("name", e.target.value)}
                    placeholder="e.g. Team Lead" disabled={isSystemRole} />
                </div>
                <div>
                  <label className="portal-form-label">Description</label>
                  <textarea className="input-field" style={{ resize: "vertical", minHeight: 72, opacity: isSystemRole ? 0.6 : 1 }}
                    value={form.description} onChange={e => set("description", e.target.value)}
                    placeholder="Describe what this role can do…" disabled={isSystemRole} />
                </div>
                {isSystemRole && (
                  <div style={{ padding: "10px 12px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 6, fontSize: 12, color: "#818cf8" }}>
                    System roles cannot be renamed. You can still adjust permissions below.
                  </div>
                )}
              </div>
            </div>

            {/* ── Permissions ───────────────────────────────────────────── */}
            <div className="portal-form-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div className="portal-form-title" style={{ border: "none", padding: 0 }}>Permissions</div>
                  <div className="t-muted" style={{ fontSize: 11, marginTop: 2 }}>
                    {checkedIds.size} of {allPerms.length} selected
                  </div>
                </div>
                {!isSystemRole && allPerms.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (allChecked) setCheckedIds(new Set());
                      else setCheckedIds(new Set(allPerms.map(p => p.id)));
                    }}
                    className="btn-secondary" style={{ padding: "4px 10px", fontSize: 11 }}>
                    {allChecked ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>

              {permsLoading ? (
                <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>Loading permissions…</div>
              ) : catalog.length === 0 ? (
                <div style={{ padding: "20px 0", textAlign: "center", fontSize: 12, color: "var(--c-muted)" }}>No permissions defined yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {catalog.map(group => {
                    const moduleChecked = group.permissions.every(p => checkedIds.has(p.id));
                    const moduleSome = group.permissions.some(p => checkedIds.has(p.id));
                    return (
                      <div key={group.module}>
                        {/* Module header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          {!isSystemRole && (
                            <button
                              type="button"
                              onClick={() => toggleModule(group.permissions)}
                              style={{
                                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                border: `2px solid ${moduleChecked ? "var(--c-accent)" : moduleSome ? "var(--c-accent)" : "var(--c-border)"}`,
                                background: moduleChecked ? "var(--c-accent)" : moduleSome ? "rgba(0,174,236,0.3)" : "var(--c-bg)",
                                cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                              {(moduleChecked || moduleSome) && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                  {moduleChecked
                                    ? <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    : <path d="M2 5h6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
                                  }
                                </svg>
                              )}
                            </button>
                          )}
                          <span className="portal-form-label" style={{ marginBottom: 0 }}>
                            {group.module_label}
                          </span>
                        </div>

                        {/* Permission rows */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingLeft: isSystemRole ? 0 : 24 }}>
                          {group.permissions.map(perm => {
                            const checked = checkedIds.has(perm.id);
                            return (
                              <button
                                key={perm.id}
                                type="button"
                                onClick={() => togglePerm(perm.id)}
                                disabled={isSystemRole}
                                style={{
                                  display: "flex", alignItems: "flex-start", gap: 8,
                                  padding: "8px 10px", borderRadius: 6, textAlign: "left",
                                  cursor: isSystemRole ? "default" : "pointer",
                                  border: `1px solid ${checked ? "rgba(0,174,236,0.4)" : "var(--c-border)"}`,
                                  background: checked ? "rgba(0,174,236,0.06)" : "var(--c-bg)",
                                  transition: "all 0.12s",
                                }}>
                                <div style={{
                                  width: 14, height: 14, borderRadius: 3, flexShrink: 0, marginTop: 1,
                                  border: `2px solid ${checked ? "var(--c-accent)" : "var(--c-border)"}`,
                                  background: checked ? "var(--c-accent)" : "transparent",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}>
                                  {checked && (
                                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                      <path d="M1.5 4.5l2 2L7.5 2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                                <div>
                                  <div className="t-accent" style={{ fontSize: 12, fontWeight: 600, color: checked ? "var(--c-accent)" : "var(--c-text)", lineHeight: 1.3 }}>
                                    {perm.description || perm.name}
                                  </div>
                                  <div className="t-muted" style={{ fontSize: 10, marginTop: 1, fontFamily: "monospace" }}>
                                    {perm.name}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick-save permissions in edit mode */}
              {editMode && !isSystemRole && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--c-border)" }}>
                  <button
                    onClick={handleSavePermsOnly}
                    disabled={permsSaving}
                    className="btn-primary" style={{ fontSize: 12 }}>
                    {permsSaving ? "Saving…" : "Save Permissions"}
                  </button>
                  {permsMsg && (
                    <span style={{ fontSize: 12, color: permsMsg.ok ? "#4ade80" : "#f87171" }}>{permsMsg.text}</span>
                  )}
                </div>
              )}
            </div>

            {/* ── Action buttons ──────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? "Saving…" : editMode ? "Save Changes" : "Create Role"}
              </button>
              <button onClick={() => navigate(-1)} disabled={saving} className="btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </UserManagementLayout>
  );
}
