import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";
import PageHeader from "../shared/PageHeader";

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button type="button" onClick={copy}
      style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, border: "1px solid var(--c-border)", background: copied ? "rgba(74,222,128,0.12)" : "var(--c-surface2)", color: copied ? "#4ade80" : "var(--c-text2)", cursor: "pointer", whiteSpace: "nowrap" }}>
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

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
  const [inviteResult, setInviteResult] = useState(null); // {invite_link, name}

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
        navigate(`/portal/${subdomain}/user-management/users`);
      } else {
        const res = await portalUserMgmtApi.inviteUser(subdomain, token, {
          first_name: form.first_name,
          last_name: form.last_name || undefined,
          display_name: form.display_name || undefined,
          email: form.email,
          phone: form.phone || undefined,
          country_code: form.country_code || undefined,
          role_ids: form.role_ids,
        });
        const result = res.data?.data || {};
        setInviteResult({
          invite_link: result.invite_link,
          name: result.display_name || `${result.first_name} ${result.last_name || ""}`.trim(),
        });
      }
    } catch (e) {
      setError(e.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const activeRoles = roles.filter(r => r.is_active);

  // ── Invite success screen ────────────────────────────────────────────────
  if (inviteResult) {
    return (
      <UserManagementLayout title="Invite Sent">
        <div>
          <div style={{ background: "var(--c-surface)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(74,222,128,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="20" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--c-heading)" }}>Invitation created</div>
                <div style={{ fontSize: 12, color: "var(--c-muted)" }}>Share this link with {inviteResult.name} to let them set their password.</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="portal-form-label">Invite Link</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 6 }}>
                <span style={{ flex: 1, fontSize: 12, color: "var(--c-text2)", wordBreak: "break-all", fontFamily: "monospace" }}>
                  {inviteResult.invite_link}
                </span>
                <CopyButton text={inviteResult.invite_link} />
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--c-muted)" }}>
                This link expires in 72 hours. You can resend it from the Users list.
              </p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => navigate(`/portal/${subdomain}/user-management/users`)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 6, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>
                Back to Users
              </button>
              <button onClick={() => { setInviteResult(null); setForm({ first_name: "", last_name: "", display_name: "", email: "", phone: "", country_code: "", role_ids: [] }); }}
                style={{ flex: 1, padding: "8px 0", borderRadius: 6, fontWeight: 500, fontSize: 13, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>
                Invite Another
              </button>
            </div>
          </div>
        </div>
      </UserManagementLayout>
    );
  }

  return (
    <UserManagementLayout title={editMode ? "Edit User" : "Invite User"}>
      <div>
        <PageHeader 
          title={editMode ? "Edit User" : "Invite User"} 
          subtitle={editMode ? "Update user information and role assignments." : "An invitation link will be generated for the user to set their own password."} 
        />

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>{error}</div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>
        ) : (
          <div className="portal-form-card">
            <div className="portal-form-row">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="portal-form-label portal-form-label-req">First Name</label>
                  <input className="input-field" value={form.first_name} onChange={e => set("first_name", e.target.value)} placeholder="Reena" />
                </div>
                <div>
                  <label className="portal-form-label">Last Name</label>
                  <input className="input-field" value={form.last_name} onChange={e => set("last_name", e.target.value)} placeholder="Maisheri" />
                </div>
              </div>

              <div>
                <label className="portal-form-label">Display Name</label>
                <input className="input-field" value={form.display_name} onChange={e => set("display_name", e.target.value)} placeholder="Reena M." />
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--c-muted)" }}>Shown in the UI. Falls back to full name if left blank.</p>
              </div>

              {!editMode && (
                <div>
                  <label className="portal-form-label portal-form-label-req">Work Email</label>
                  <input type="email" className="input-field" value={form.email} onChange={e => set("email", e.target.value)} placeholder="reena@company.com" />
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--c-muted)" }}>The invite link will be tied to this email address.</p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 8 }}>
                <div>
                  <label className="portal-form-label">Code</label>
                  <input className="input-field" value={form.country_code} onChange={e => set("country_code", e.target.value)} placeholder="+91" />
                </div>
                <div>
                  <label className="portal-form-label">Mobile Number</label>
                  <input className="input-field" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="9876543210" />
                </div>
              </div>

              {/* Roles */}
              {activeRoles.length > 0 && (
                <div>
                  <label className="portal-form-label">Roles</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {activeRoles.map(r => {
                      const selected = form.role_ids.includes(r.id);
                      return (
                        <button key={r.id} type="button" onClick={() => toggleRole(r.id)}
                          className={selected ? "btn-primary" : "btn-secondary"}
                          style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                          {r.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ flex: 1 }}>
                {saving ? "Saving…" : editMode ? "Save Changes" : "Send Invite"}
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
