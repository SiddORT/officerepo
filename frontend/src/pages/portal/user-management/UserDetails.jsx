import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import { EditIconBtn } from "../../../components/ui/ActionIcons";

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--c-border)" }}>
      <div className="portal-form-label" style={{ width: 140, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--c-text)", wordBreak: "break-word" }}>{value || "—"}</div>
    </div>
  );
}

export default function UserDetails() {
  const { subdomain, userId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [resetPw, setResetPw] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [showResetPw, setShowResetPw] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);

  const showToast = (msg, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await portalUserMgmtApi.getUser(subdomain, token, userId);
      setUser(res.data?.data);
    } catch { setError("Failed to load user."); }
    finally { setLoading(false); }
  }, [subdomain, token, userId]);

  useEffect(() => { load(); }, [load]);

  const doAction = async (action) => {
    setActionBusy(action);
    try {
      if (action === "activate") await portalUserMgmtApi.activateUser(subdomain, token, userId);
      else if (action === "deactivate") await portalUserMgmtApi.deactivateUser(subdomain, token, userId);
      else if (action === "forceLogout") await portalUserMgmtApi.forceLogout(subdomain, token, userId);
      showToast(action === "activate" ? "User activated." : action === "deactivate" ? "User deactivated." : "User sessions terminated.");
      load();
    } catch (e) { showToast(e.response?.data?.detail || "Action failed.", false); }
    finally { setActionBusy(""); }
  };

  const doReset = async () => {
    if (resetPw.length < 8) { showToast("Password must be at least 8 characters.", false); return; }
    setActionBusy("reset");
    try {
      await portalUserMgmtApi.resetPassword(subdomain, token, userId, resetPw);
      showToast("Password reset successfully.");
      setShowReset(false); setResetPw("");
    } catch (e) { showToast(e.response?.data?.detail || "Reset failed.", false); }
    finally { setActionBusy(""); }
  };

  if (loading) return <UserManagementLayout title="User"><div style={{ padding: 40, textAlign: "center", color: "var(--c-muted)", fontSize: 13 }}>Loading…</div></UserManagementLayout>;
  if (error) return <UserManagementLayout title="User"><div style={{ padding: 20, color: "#f87171", fontSize: 13 }}>{error}</div></UserManagementLayout>;
  if (!user) return null;

  const name = user.display_name || `${user.first_name} ${user.last_name || ""}`.trim();
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <UserManagementLayout title={name}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#00aeec,#ff7a1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div className="t-heading" style={{ fontSize: 17, fontWeight: 700 }}>{name}</div>
            <div className="t-muted" style={{ fontSize: 13, marginTop: 2 }}>{user.email}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              {(user.status === "Active" || user.status === "Inactive")
                ? <button onClick={() => setConfirmAction(user.status === "Active" ? "deactivate" : "activate")} disabled={!!actionBusy} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }} title={user.status === "Active" ? "Click to deactivate" : "Click to activate"}><Badge status={user.status} /></button>
                : <Badge status={user.status} />
              }
              {user.roles?.map(r => (
                <span key={r.id} className="badge-info">{r.name}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <EditIconBtn onClick={() => navigate(`/portal/${subdomain}/user-management/users/${userId}/edit`)} title="Edit user" />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
        {/* Info */}
        <div className="portal-form-card">
          <div className="portal-form-title">User Information</div>
          <InfoRow label="First Name" value={user.first_name} />
          <InfoRow label="Last Name" value={user.last_name} />
          <InfoRow label="Display Name" value={user.display_name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Mobile" value={user.country_code ? `${user.country_code} ${user.phone || ""}` : user.phone} />
          <InfoRow label="Status" value={user.status} />
          <InfoRow label="Last Login" value={user.last_login ? new Date(user.last_login).toLocaleString() : "Never"} />
          <InfoRow label="Invite Accepted" value={user.invite_accepted_at ? new Date(user.invite_accepted_at).toLocaleDateString() : "—"} />
          <InfoRow label="Created" value={new Date(user.created_at).toLocaleDateString()} />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="portal-form-card">
            <div className="portal-form-title">Actions</div>

            <button onClick={() => setShowReset(r => !r)}
              className="btn-secondary" style={{ width: "100%", textAlign: "left", marginBottom: 8 }}>
              🔑 Reset Password
            </button>

            {showReset && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ position: "relative", marginBottom: 6 }}>
                  <input type={showResetPw ? "text" : "password"} className="input-field" placeholder="New password (min 8)" value={resetPw} onChange={e => setResetPw(e.target.value)} />
                  <button type="button" onClick={() => setShowResetPw(s => !s)}
                    aria-label={showResetPw ? "Hide password" : "Show password"}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: showResetPw ? "var(--c-accent)" : "var(--c-muted)", padding: 2, display: "flex", alignItems: "center" }}>
                    {showResetPw ? (
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <button onClick={doReset} disabled={actionBusy === "reset"}
                  className="btn-primary" style={{ width: "100%", background: "#f59e0b" }}>
                  {actionBusy === "reset" ? "Saving…" : "Set Password"}
                </button>
              </div>
            )}

            <button onClick={() => doAction("forceLogout")} disabled={!!actionBusy}
              className="btn-secondary" style={{ width: "100%", color: "#f87171", textAlign: "left" }}>
              {actionBusy === "forceLogout" ? "…" : "⊘ Force Logout All Sessions"}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === "deactivate" ? "Deactivate User" : "Activate User"}
        message={`${confirmAction === "deactivate" ? "Deactivate" : "Activate"} user "${user?.display_name || user?.email}"?`}
        confirmLabel={confirmAction === "deactivate" ? "Deactivate" : "Activate"}
        confirmVariant={confirmAction === "deactivate" ? "danger" : "primary"}
        onConfirm={() => { doAction(confirmAction); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
    </UserManagementLayout>
  );
}
