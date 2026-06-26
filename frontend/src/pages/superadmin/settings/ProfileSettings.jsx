import React, { useEffect, useRef, useState } from "react";
import { authApi } from "../../../services/apiClient";
import { useAuth } from "../../../contexts/AuthContext";

const unwrap = (res) => res?.data?.data ?? res?.data;

function extractError(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  return fallback;
}

function Banner({ kind, children }) {
  if (!children) return null;
  const ok = kind === "success";
  return (
    <div className="flex items-center gap-2 text-sm rounded-lg px-4 py-2.5 mb-5" style={{
      background: ok ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)",
      color: ok ? "#10b981" : "#ef4444",
      border: `1px solid ${ok ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
    }}>
      {ok ? (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )}
      {children}
    </div>
  );
}

function Field({ label, required, hint, error, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--c-muted)", letterSpacing: "0.06em" }}>
        {label}{required && <span style={{ color: "#ef4444" }}> *</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: "#ef4444" }}>{error}</p>}
      {!error && hint && <p className="text-xs mt-1" style={{ color: "var(--c-muted)" }}>{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", disabled, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
      style={{
        background: disabled ? "var(--c-surface2)" : "var(--c-surface2)",
        border: `1px solid ${error ? "#ef4444" : focused ? "var(--c-accent)" : "var(--c-border)"}`,
        boxShadow: focused ? (error ? "0 0 0 3px rgba(239,68,68,0.12)" : "0 0 0 3px var(--c-accent-dim)") : "none",
        color: disabled ? "var(--c-muted)" : "var(--c-text)",
        cursor: disabled ? "not-allowed" : "text",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function PasswordInput({ value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none transition-all"
        style={{
          background: "var(--c-surface2)",
          border: `1px solid ${error ? "#ef4444" : focused ? "var(--c-accent)" : "var(--c-border)"}`,
          boxShadow: focused ? (error ? "0 0 0 3px rgba(239,68,68,0.12)" : "0 0 0 3px var(--c-accent-dim)") : "none",
          color: "var(--c-text)",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--c-muted)" }}>
        {show ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function SectionCard({ icon, title, children }) {
  return (
    <div className="rounded-xl overflow-hidden mb-5" style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
      boxShadow: "var(--c-shadow)",
    }}>
      <div style={{ height: "2px", background: "linear-gradient(90deg, #00aeec, #ff7a1a)" }} />
      <div className="flex items-center gap-2.5 px-5 py-4" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <span style={{ color: "var(--c-accent)" }}>{icon}</span>
        <h3 className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AvatarSection({ profile, onUpdated }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);

  const initials = [profile.first_name, profile.last_name]
    .filter(Boolean).map(s => s[0].toUpperCase()).join("")
    || (profile.email || "A")[0].toUpperCase();

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG, GIF, or WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview({ file, objectUrl });
  }

  async function uploadFile() {
    if (!preview) return;
    setUploading(true);
    setError(null);
    try {
      const res = await authApi.uploadAvatar(preview.file);
      URL.revokeObjectURL(preview.objectUrl);
      setPreview(null);
      onUpdated(unwrap(res));
    } catch (err) {
      setError(extractError(err, "Upload failed. Please try again."));
    } finally {
      setUploading(false);
    }
  }

  function cancelPreview() {
    if (preview) URL.revokeObjectURL(preview.objectUrl);
    setPreview(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function removeAvatar() {
    setRemoving(true);
    setError(null);
    try {
      const res = await authApi.removeAvatar();
      onUpdated(unwrap(res));
    } catch (err) {
      setError(extractError(err, "Failed to remove avatar."));
    } finally {
      setRemoving(false);
    }
  }

  const imgSrc = preview?.objectUrl || (profile.has_avatar ? profile.avatar_url : null);

  return (
    <SectionCard
      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
      title="Profile Picture"
    >
      <div className="flex items-center gap-5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-white text-2xl font-bold"
            style={{ background: imgSrc ? "transparent" : "linear-gradient(135deg, #00aeec, #ff7a1a)" }}>
            {imgSrc ? (
              <img src={imgSrc} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {preview && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center"
              style={{ background: "rgba(0,0,0,0.3)" }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--c-text)" }}>
            {profile.display_name || [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email}
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--c-muted)" }}>
            JPEG, PNG, GIF or WebP · max 5 MB
          </p>

          {preview ? (
            <div className="flex items-center gap-2">
              <button onClick={uploadFile} disabled={uploading}
                className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5">
                {uploading ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                {uploading ? "Uploading…" : "Upload"}
              </button>
              <button onClick={cancelPreview} disabled={uploading}
                className="btn-secondary text-xs px-3 py-1.5">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => fileRef.current?.click()}
                className="btn-secondary flex items-center gap-1.5 text-xs px-3 py-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {profile.has_avatar ? "Change Photo" : "Upload Photo"}
              </button>
              {profile.has_avatar && (
                <button onClick={removeAvatar} disabled={removing}
                  className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.05)" }}>
                  {removing ? "Removing…" : "Remove"}
                </button>
              )}
            </div>
          )}

          {error && <p className="text-xs mt-2" style={{ color: "#ef4444" }}>{error}</p>}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange} className="hidden" />
    </SectionCard>
  );
}

function ProfileInformation({ profile, onUpdated }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", display_name: "", phone: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      display_name: profile.display_name || "",
      phone: profile.phone || "",
    });
  }, [profile]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "First name is required.";
    if (form.first_name.trim().length > 150) e.first_name = "Max 150 characters.";
    if (!form.last_name.trim()) e.last_name = "Last name is required.";
    if (form.last_name.trim().length > 150) e.last_name = "Max 150 characters.";
    return e;
  };

  const save = async () => {
    setMsg(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        display_name: form.display_name.trim() || null,
        phone: form.phone.trim() || null,
      };
      const res = await authApi.updateProfile(payload);
      onUpdated(unwrap(res));
      setMsg({ kind: "success", text: "Profile updated successfully." });
    } catch (err) {
      setMsg({ kind: "error", text: extractError(err, "Failed to save. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
      title="Profile Information"
    >
      <Banner kind={msg?.kind}>{msg?.text}</Banner>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" required error={errors.first_name}>
            <TextInput value={form.first_name} onChange={set("first_name")} placeholder="John" error={errors.first_name} />
          </Field>
          <Field label="Last Name" required error={errors.last_name}>
            <TextInput value={form.last_name} onChange={set("last_name")} placeholder="Doe" error={errors.last_name} />
          </Field>
        </div>

        <Field label="Display Name" hint="Shown in the sidebar and topbar. Defaults to your full name if blank.">
          <TextInput value={form.display_name} onChange={set("display_name")} placeholder="e.g. J. Doe" />
        </Field>

        <Field label="Email Address" hint="Email cannot be changed.">
          <TextInput value={profile.email || ""} disabled />
        </Field>

        <Field label="Phone Number">
          <TextInput value={form.phone} onChange={set("phone")} placeholder="+91 9876543210" type="tel" />
        </Field>
      </div>

      <div className="flex justify-end mt-5">
        <button className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2" onClick={save} disabled={saving}>
          {saving ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </SectionCard>
  );
}

function ChangePassword() {
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

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
      setMsg({ kind: "success", text: "Password updated successfully." });
      setForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      setMsg({ kind: "error", text: err?.response?.data?.detail || "Failed to update password." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
      title="Change Password"
    >
      <Banner kind={msg?.kind}>{msg?.text}</Banner>

      <div className="space-y-4">
        <Field label="Current Password" required error={errors.current}>
          <PasswordInput value={form.current} onChange={set("current")} placeholder="Enter current password" error={errors.current} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="New Password" required error={errors.next}>
            <PasswordInput value={form.next} onChange={set("next")} placeholder="Min 8 characters" error={errors.next} />
          </Field>
          <Field label="Confirm New Password" required error={errors.confirm}>
            <PasswordInput value={form.confirm} onChange={set("confirm")} placeholder="Re-enter new password" error={errors.confirm} />
          </Field>
        </div>
      </div>

      <div className="flex justify-end mt-5">
        <button className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2" onClick={submit} disabled={saving}>
          {saving ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {saving ? "Updating…" : "Update Password"}
        </button>
      </div>
    </SectionCard>
  );
}

export default function ProfileSettings() {
  const { refreshPermissions } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.getProfile()
      .then(res => setProfile(unwrap(res) || {}))
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  }, []);

  function handleUpdated(updated) {
    if (updated) setProfile(prev => ({ ...prev, ...updated }));
    refreshPermissions?.();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--c-border)", borderTopColor: "var(--c-accent)" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>Profile Settings</h2>
        <p className="text-sm mt-0.5" style={{ color: "var(--c-muted)" }}>
          Manage your profile picture, personal details, and password
        </p>
      </div>
      <AvatarSection profile={profile} onUpdated={handleUpdated} />
      <ProfileInformation profile={profile} onUpdated={handleUpdated} />
      <ChangePassword />
    </div>
  );
}
