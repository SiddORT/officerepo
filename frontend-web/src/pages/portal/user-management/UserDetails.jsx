import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalUserMgmtApi } from "../../../services/apiClient";
import UserManagementLayout from "./UserManagementLayout";

const STATUS_COLORS = {
  Active:   { bg: "rgba(34,197,94,0.1)", color: "#4ade80" },
  Inactive: { bg: "rgba(100,116,139,0.15)", color: "var(--c-muted)" },
  Invited:  { bg: "rgba(251,191,36,0.12)", color: "#fbbf24" },
};

function InfoRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--c-border)" }}>
      <div style={{ width: 140, fontSize: 12, color: "var(--c-muted)", fontWeight: 500, flexShrink: 0 }}>{label}</div>
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
  const [actionBusy, setActionBusy] = useState("");

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
  const sc = STATUS_COLORS[user.status] || { bg: "rgba(100,116,139,0.1)", color: "var(--c-muted)" };

  return (
    <UserManagementLayout title={name}>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: toast.ok ? "#166534" : "#dc2626", color: "#fff", padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      {/* Header card */}
      <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#00aeec,#ff7a1a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--c-text)" }}>{name}</div>
            <div style={{ fontSize: 13, color: "var(--c-muted)", marginTop: 2 }}>{user.email}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: sc.bg, color: sc.color }}>{user.status}</span>
              {user.roles?.map(r => (
                <span key={r.id} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: "rgba(0,174,236,0.1)", color: "var(--c-accent)" }}>{r.name}</span>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link to={`/portal/${subdomain}/user-management/users/${userId}/edit`}
              style={{ padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "var(--c-accent)", color: "#fff", textDecoration: "none" }}>
              Edit
            </Link>
            {user.status === "Active"
              ? <button onClick={() => doAction("deactivate")} disabled={!!actionBusy}
                  style={{ padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "transparent", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer" }}>
                  {actionBusy === "deactivate" ? "…" : "Deactivate"}
                </button>
              : user.status === "Inactive"
              ? <button onClick={() => doAction("activate")} disabled={!!actionBusy}
                  style={{ padding: "7px 14px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "transparent", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer" }}>
                  {actionBusy === "activate" ? "…" : "Activate"}
                </button>
              : null
            }
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, alignItems: "start" }}>
        {/* Info */}
        <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--c-text)", marginBottom: 12 }}>User Information</div>
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
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--c-text)", marginBottom: 12 }}>Actions</div>

            <button onClick={() => setShowReset(r => !r)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer", marginBottom: 8, textAlign: "left" }}>
              🔑 Reset Password
            </button>

            {showReset && (
              <div style={{ marginBottom: 10 }}>
                <input type="password" placeholder="New password (min 8)" value={resetPw} onChange={e => setResetPw(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--c-border)", background: "var(--c-bg)", color: "var(--c-text)", fontSize: 12, marginBottom: 6, boxSizing: "border-box" }} />
                <button onClick={doReset} disabled={actionBusy === "reset"}
                  style={{ width: "100%", padding: "7px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, background: "#f59e0b", color: "#fff", border: "none", cursor: "pointer" }}>
                  {actionBusy === "reset" ? "Saving…" : "Set Password"}
                </button>
              </div>
            )}

            <button onClick={() => doAction("forceLogout")} disabled={!!actionBusy}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: "transparent", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)", cursor: "pointer", textAlign: "left" }}>
              {actionBusy === "forceLogout" ? "…" : "⊘ Force Logout All Sessions"}
            </button>
          </div>
        </div>
      </div>
    </UserManagementLayout>
  );
}
