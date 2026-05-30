import React, { useEffect, useState } from "react";
import { authApi } from "../../../services/apiClient";
import { useAuth } from "../../../contexts/AuthContext";
import Input from "../../../components/ui/Input";

const unwrap = (res) => res?.data?.data ?? res?.data;

function Banner({ kind, children }) {
  if (!children) return null;
  const ok = kind === "success";
  return (
    <div
      className="text-sm rounded-lg px-3 py-2 mb-4"
      style={{
        background: ok ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
        color: ok ? "#10b981" : "#ef4444",
      }}
    >
      {children}
    </div>
  );
}

function ProfileInformation({ onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    authApi
      .getProfile()
      .then((res) => {
        const d = unwrap(res) || {};
        setForm({ name: d.name || "", phone: d.phone || "", email: d.email || "" });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setMsg(null);
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await authApi.updateProfile({ name: form.name.trim(), phone: form.phone.trim() });
      setMsg({ kind: "success", text: "Profile updated." });
      onSaved?.();
    } catch (err) {
      setMsg({ kind: "error", text: err.response?.data?.detail || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.name || form.email || "A").trim().slice(0, 1).toUpperCase();

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2.5 mb-6">
        <svg className="w-5 h-5 t-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h3 className="text-base font-bold t-heading">Profile Information</h3>
      </div>

      <Banner kind={msg?.kind}>{msg?.text}</Banner>

      {loading ? (
        <p className="text-sm t-muted py-6">Loading…</p>
      ) : (
        <>
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #00aeec, #ff7a1a)" }}
            >
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold t-heading">{form.name || "—"}</p>
              <p className="text-xs t-muted capitalize">{user?.role || "superadmin"}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              required
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              error={errors.name}
              placeholder="Your name"
              maxLength={255}
            />
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="+91 9876543210"
              maxLength={20}
            />
          </div>

          <div className="mt-4">
            <Input
              label="Email Address"
              value={form.email}
              disabled
              hint="Email cannot be changed"
            />
          </div>

          <div className="flex justify-end mt-6">
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setMsg(null);
    const e = {};
    if (!form.current) e.current = "Current password is required.";
    if (!form.next || form.next.length < 8) e.next = "New password must be at least 8 characters.";
    if (form.confirm !== form.next) e.confirm = "Passwords do not match.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      await authApi.changePassword({ current_password: form.current, new_password: form.next });
      setMsg({ kind: "success", text: "Password updated." });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setMsg({ kind: "error", text: err.response?.data?.detail || "Failed to update password." });
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, ph) => (
    <div className="relative">
      <Input
        label={label}
        required
        type={show[key] ? "text" : "password"}
        value={form[key]}
        onChange={(e) => setField(key, e.target.value)}
        error={errors[key]}
        placeholder={ph}
        inputClassName="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
        className="absolute right-3 top-[34px] t-muted hover:t-accent"
        tabIndex={-1}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="card p-6 mt-6">
      <div className="flex items-center gap-2.5 mb-6">
        <svg className="w-5 h-5 t-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 className="text-base font-bold t-heading">Change Password</h3>
      </div>

      <Banner kind={msg?.kind}>{msg?.text}</Banner>

      <div className="mb-4">{field("current", "Current Password", "Enter current password")}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {field("next", "New Password", "Enter new password")}
        {field("confirm", "Confirm New Password", "Re-enter new password")}
      </div>

      <div className="flex justify-end mt-6">
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Updating…" : "Update Password"}
        </button>
      </div>
    </div>
  );
}

export default function ProfileSettings() {
  const { refreshPermissions } = useAuth();
  return (
    <div>
      <ProfileInformation onSaved={refreshPermissions} />
      <ChangePassword />
    </div>
  );
}
