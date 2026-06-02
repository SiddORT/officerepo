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

const Label = ({ children }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}
  </label>
);

export default function UserForm({ editMode = false }) {
  const { subdomain, userId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "", last_name: "", display_name: "", email: "",
    phone: "", country_code: "", role_ids: [],
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const loadRoles = useCallback(async () => {
    try {
      const res = await portalUserMgmtApi.listRoles(subdomain, token);
      setRoles(res.data?.data || []);
    } catch {}
  }, [subdomain, token]);

  const loadUser = useCallback(async () => {
    if (!editMode || !userId) return;
    setLoading(true);
    try {
      const res = await portalUserMgmtApi.getUser(subdomain, token, userId);
      const u = res.data?.data || {};
      setForm({
        first_name: u.first_name || "",
        last_name: u.last_name || "",
        display_name: u.display_name || "",
        email: u.email || "",
        phone: u.phone || "",
        country_code: u.country_code || "",
        role_ids: (u.roles || []).map(r => r.id),
      });
    } catch {
      setError("Failed to load user.");
    } finally {
      setLoading(false);
    }
  }, [subdomain, token, userId, editMode]);

  useEffect(() => {
    loadRoles();
    loadUser();
  }, [loadRoles, loadUser]);

  const toggleRole = (roleId) => {
    setForm(p => ({
      ...p,
      role_ids: p.role_ids.includes(roleId)
        ? p.role_ids.filter(r => r !== roleId)
        : [...p.role_ids, roleId],
    }));
  };

  const handleSubmit = async () => {
    if (!form.first_name.trim()) { setError("First name is required."); return; }
    if (!editMode && !form.email.trim()) { setError("Email is required."); return; }
    setSaving(true); setError("");
    try {
      if (editMode) {
        await portalUserMgmtApi.updateUser(subdomain, token, userId, {
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          display_name: form.display_name || undefined,
          phone: form.phone || undefined,
          country_code: form.country_code || undefined,
          role_ids: form.role_ids,
        });
      } else {
        await portalUserMgmtApi.createUser(subdomain, token, {
          first_name: form.first_name,
          last_name: form.last_name || undefined,
          display_name: form.display_name || undefined,
          email: form.email,
          phone: form.phone || undefined,
          country_code: form.country_code || undefined,
          role_ids: form.role_ids,
        });
      }
      navigate(`/portal/${subdomain}/user-management/users`);
    } catch (e) {
      setError(e.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const activeRoles = roles.filter(r => r.is_active);

  return (
    <UserManagementLayout title={editMode ? "Edit User" : "Add User"}>
      <div style={{ maxWidth: 560 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--c-text)" }}>
            {editMode ? "Edit User" : "Add User"}
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--c-muted)" }}>
            {editMode ? "Update user information and role assignments." : "Create a new workspace member."}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <Label>First Name *</Label>
                  <input style={inputStyle} value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Reena" />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <input style={inputStyle} value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Maisheri" />
                </div>
              </div>

              <div>
                <Label>Display Name</Label>
                <input style={inputStyle} value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="Reena M." />
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--c-muted)" }}>Shown in the UI. Falls back to full name if left blank.</p>
              </div>

              {!editMode && (
                <div>
                  <Label>Email *</Label>
                  <input type="email" style={inputStyle} value={form.email} onChange={e => set("email", e.target.value)} placeholder="reena@company.com" />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8 }}>
                <div>
                  <Label>Code</Label>
                  <input style={inputStyle} value={form.country_code} onChange={e => set("country_code", e.target.value)} placeholder="+91" />
                </div>
                <div>
                  <Label>Mobile Number</Label>
                  <input style={inputStyle} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" />
                </div>
              </div>

              {/* Roles */}
              {activeRoles.length > 0 && (
                <div>
                  <Label>Roles</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {activeRoles.map(r => {
                      const selected = form.role_ids.includes(r.id);
                      return (
                        <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                          style={{
                            padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer",
                            background: selected ? "var(--c-accent)" : "var(--c-surface2)",
                            color: selected ? "#fff" : "var(--c-text2)",
                            border: `1px solid ${selected ? "var(--c-accent)" : "var(--c-border)"}`,
                          }}>
                          {r.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={handleSubmit} disabled={saving}
                style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : editMode ? "Save Changes" : "Create User"}
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
