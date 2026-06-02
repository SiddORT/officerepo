import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";

const inputStyle = {
  width: "100%", padding: "8px 10px",
  background: "var(--c-bg)", border: "1px solid var(--c-border)",
  borderRadius: 6, fontSize: 13, color: "var(--c-text)", boxSizing: "border-box",
};

export default function RoleForm({ editMode = false }) {
  const { subdomain, roleId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const loadRole = useCallback(async () => {
    if (!editMode || !roleId) return;
    setLoading(true);
    try {
      const res = await portalUserMgmtApi.getRole(subdomain, token, roleId);
      const r = res.data?.data || {};
      setForm({ name: r.name || "", description: r.description || "" });
    } catch { setError("Failed to load role."); }
    finally { setLoading(false); }
  }, [subdomain, token, roleId, editMode]);

  useEffect(() => { loadRole(); }, [loadRole]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Role name is required."); return; }
    setSaving(true); setError("");
    try {
      if (editMode) {
        await portalUserMgmtApi.updateRole(subdomain, token, roleId, form);
      } else {
        await portalUserMgmtApi.createRole(subdomain, token, form);
      }
      navigate(`/portal/${subdomain}/user-management/roles`);
    } catch (e) {
      setError(e.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <UserManagementLayout title={editMode ? "Edit Role" : "Create Role"}>
      <div style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>
            {editMode ? "Edit Role" : "Create Role"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--c-muted)" }}>
            {editMode ? "Update this role's details." : "Define a new role for workspace members."}
          </p>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>{error}</div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
            <div style={{ display: "grid", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Role Name *</label>
                <input style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Team Lead" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
                <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Describe what this role can do…" />
              </div>

              {editMode && (
                <div style={{ padding: "10px 12px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 6, fontSize: 12, color: "#818cf8" }}>
                  Note: System roles (Super Admin, Admin) cannot be renamed.
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={handleSubmit} disabled={saving}
                style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editMode ? "Save Changes" : "Create Role"}
              </button>
              <button onClick={() => navigate(-1)} disabled={saving}
                style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontWeight: 500, fontSize: 13, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </UserManagementLayout>
  );
}
