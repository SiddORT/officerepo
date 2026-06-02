import React, { useState, useEffect, useCallback } from "react";
import { securitySettingsApi, secretsApi, corsRejectionsApi } from "../../../../services/apiClient";

const TABS = [
  { key: "password",  label: "Password Policy" },
  { key: "login",     label: "Login Policy" },
  { key: "session",   label: "Session Policy" },
  { key: "twofa",     label: "Two-Factor Auth" },
  { key: "notif",     label: "Security Notifications" },
  { key: "rotation",  label: "Secret Rotation" },
  { key: "cors",      label: "Blocked Origins" },
];

const ENFORCEMENT_MODES = [
  { value: "optional",           label: "Optional — users may enable 2FA" },
  { value: "mandatory_all",      label: "Mandatory — all users" },
  { value: "mandatory_admin",    label: "Mandatory — admin roles only" },
  { value: "mandatory_selected", label: "Mandatory — selected roles" },
];

const GRACE_PERIODS = [
  { value: 0,  label: "Immediate — no grace period" },
  { value: 3,  label: "3 days" },
  { value: 7,  label: "7 days" },
  { value: 15, label: "15 days" },
  { value: 30, label: "30 days" },
];

const NOTIF_CHANNELS = [
  { value: "email",    label: "Email" },
  { value: "sms",      label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "push",     label: "Push Notification" },
];

// ── Shared primitives ─────────────────────────────────────────────────────────

const inputStyle = {
  width: "100%", padding: "8px 10px",
  background: "var(--c-bg)", border: "1px solid var(--c-border)",
  borderRadius: 6, fontSize: 13, color: "var(--c-text)",
  boxSizing: "border-box", outline: "none",
};

function Field({ label, hint, children, inline }) {
  if (inline) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--c-border)" }}>
        <div style={{ flex: 1, paddingRight: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--c-text)" }}>{label}</div>
          {hint && <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>{hint}</div>}
        </div>
        <div style={{ flexShrink: 0 }}>{children}</div>
      </div>
    );
  }
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-text2)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      {hint && <p style={{ fontSize: 11, color: "var(--c-muted)", marginTop: -3, marginBottom: 6 }}>{hint}</p>}
      {children}
    </div>
  );
}

function NumberInput({ value, onChange, min, max, step = 1, suffix }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <input
        type="number" min={min} max={max} step={step}
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? null : Number(e.target.value))}
        style={{ ...inputStyle, width: 90, textAlign: "center" }}
      />
      {suffix && <span style={{ fontSize: 12, color: "var(--c-muted)", whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button" onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: checked ? "var(--c-accent)" : "var(--c-border)",
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 20 : 3,
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div style={{
      background: "var(--c-surface)", border: "1px solid var(--c-border)",
      borderRadius: 10, marginBottom: 20, overflow: "hidden",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--c-border)", background: "var(--c-surface2, var(--c-surface))" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{title}</div>
        {description && <div style={{ fontSize: 12, color: "var(--c-muted)", marginTop: 2 }}>{description}</div>}
      </div>
      <div style={{ padding: "4px 20px 16px" }}>{children}</div>
    </div>
  );
}

function SaveBar({ onSave, onDiscard, loading, dirty }) {
  if (!dirty) return null;
  return (
    <div style={{
      position: "sticky", bottom: 0, zIndex: 10,
      background: "var(--c-surface)", borderTop: "1px solid var(--c-border)",
      padding: "12px 0", display: "flex", alignItems: "center", gap: 10,
      marginTop: 8,
    }}>
      <button
        onClick={onSave} disabled={loading}
        style={{
          padding: "8px 20px", borderRadius: 6, fontWeight: 600, fontSize: 13,
          background: "var(--c-accent)", color: "#fff", border: "none",
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        {loading && <span style={{ width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
        Save Changes
      </button>
      <button
        onClick={onDiscard} disabled={loading}
        style={{
          padding: "8px 16px", borderRadius: 6, fontWeight: 500, fontSize: 13,
          background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)",
          cursor: "pointer",
        }}
      >
        Discard
      </button>
      <span style={{ fontSize: 12, color: "var(--c-muted)" }}>You have unsaved changes</span>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", top: 20, right: 20, zIndex: 9999,
      background: toast.ok ? "#166534" : "#dc2626", color: "#fff",
      padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    }}>{toast.msg}</div>
  );
}

function usePolicy(getter, updater) {
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getter();
      const d = res.data?.data || {};
      setData(d);
      setForm(d);
    } catch {
      showToast("Failed to load policy", false);
    } finally {
      setLoading(false);
    }
  }, [getter]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const dirty = form && data && JSON.stringify(form) !== JSON.stringify(data);

  const save = async () => {
    setSaving(true);
    try {
      const res = await updater(form);
      const d = res.data?.data || form;
      setData(d);
      setForm(d);
      showToast("Settings saved");
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed to save", false);
    } finally {
      setSaving(false);
    }
  };

  const discard = () => setForm(data);

  return { form, set, loading, saving, dirty, save, discard, toast };
}

// ── PASSWORD POLICY TAB ───────────────────────────────────────────────────────

function PasswordPolicyTab() {
  const { form, set, loading, saving, dirty, save, discard, toast } =
    usePolicy(securitySettingsApi.getPasswordPolicy, securitySettingsApi.updatePasswordPolicy);

  if (loading) return <div style={{ padding: 32, color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>;
  if (!form) return null;

  return (
    <>
      <Toast toast={toast} />
      <SectionCard title="Password Strength" description="Define complexity requirements for all user passwords">
        <Field label="Minimum Length" hint="Must be at least 8 characters">
          <NumberInput value={form.min_length} onChange={v => set("min_length", v)} min={8} max={form.max_length || 128} suffix="characters" />
        </Field>
        <Field label="Maximum Length" hint="Up to 128 characters recommended">
          <NumberInput value={form.max_length} onChange={v => set("max_length", v)} min={form.min_length || 8} max={128} suffix="characters" />
        </Field>
        <Field label="Require Uppercase Letter" inline hint="e.g. A–Z">
          <Toggle checked={form.require_uppercase} onChange={v => set("require_uppercase", v)} />
        </Field>
        <Field label="Require Lowercase Letter" inline hint="e.g. a–z">
          <Toggle checked={form.require_lowercase} onChange={v => set("require_lowercase", v)} />
        </Field>
        <Field label="Require Number" inline hint="e.g. 0–9">
          <Toggle checked={form.require_number} onChange={v => set("require_number", v)} />
        </Field>
        <Field label="Require Special Character" inline hint="e.g. !@#$%^&*">
          <Toggle checked={form.require_special_char} onChange={v => set("require_special_char", v)} />
        </Field>
      </SectionCard>

      <SectionCard title="Password Expiry & History" description="Control how often users must change their passwords">
        <Field label="Password Expiry" hint="Set to 0 to disable expiry">
          <NumberInput value={form.expiry_days} onChange={v => set("expiry_days", v)} min={0} max={3650} suffix="days (0 = never)" />
        </Field>
        <Field label="Prevent Password Reuse" inline hint="Block users from reusing recent passwords">
          <Toggle checked={form.prevent_reuse} onChange={v => set("prevent_reuse", v)} />
        </Field>
        {form.prevent_reuse && (
          <Field label="Password History Count" hint="How many previous passwords to remember">
            <NumberInput value={form.history_count} onChange={v => set("history_count", v)} min={1} max={24} suffix="passwords" />
          </Field>
        )}
        <Field label="Force Change on First Login" inline hint="Users must set a new password on first sign-in">
          <Toggle checked={form.force_change_on_first_login} onChange={v => set("force_change_on_first_login", v)} />
        </Field>
      </SectionCard>

      <SaveBar onSave={save} onDiscard={discard} loading={saving} dirty={dirty} />
    </>
  );
}

// ── LOGIN POLICY TAB ──────────────────────────────────────────────────────────

function LoginPolicyTab() {
  const { form, set, loading, saving, dirty, save, discard, toast } =
    usePolicy(securitySettingsApi.getLoginPolicy, securitySettingsApi.updateLoginPolicy);

  if (loading) return <div style={{ padding: 32, color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>;
  if (!form) return null;

  return (
    <>
      <Toast toast={toast} />
      <SectionCard title="Brute Force Protection" description="Limit failed login attempts and automatically lock accounts">
        <Field label="Max Failed Login Attempts" hint="Account is locked after this many consecutive failures">
          <NumberInput value={form.max_failed_attempts} onChange={v => set("max_failed_attempts", v)} min={1} max={20} suffix="attempts" />
        </Field>
        <Field label="Account Lock Duration" hint="How long an account stays locked after too many failures">
          <NumberInput value={form.lock_duration_minutes} onChange={v => set("lock_duration_minutes", v)} min={1} max={1440} suffix="minutes" />
        </Field>
        <Field label="Show CAPTCHA After" hint="Number of failed attempts before CAPTCHA is shown">
          <NumberInput value={form.captcha_after_attempts} onChange={v => set("captcha_after_attempts", v)} min={1} max={20} suffix="attempts" />
        </Field>
      </SectionCard>

      <SectionCard title="Session & Device Controls" description="Configure concurrent sessions and remember-me behaviour">
        <Field label="Allow Concurrent Logins" inline hint="Let users be logged in from multiple browsers simultaneously">
          <Toggle checked={form.allow_concurrent_logins} onChange={v => set("allow_concurrent_logins", v)} />
        </Field>
        <Field label="Allow Multiple Devices" inline hint="Let users log in from multiple trusted devices">
          <Toggle checked={form.allow_multiple_devices} onChange={v => set("allow_multiple_devices", v)} />
        </Field>
        <Field label="Remember Me Duration" hint="How long a remembered session stays active (0 = disabled)">
          <NumberInput value={form.remember_me_days} onChange={v => set("remember_me_days", v)} min={0} max={365} suffix="days" />
        </Field>
        <Field label="Force Logout on Password Change" inline hint="Revoke all active sessions when a user changes their password">
          <Toggle checked={form.force_logout_on_password_change} onChange={v => set("force_logout_on_password_change", v)} />
        </Field>
      </SectionCard>

      <SaveBar onSave={save} onDiscard={discard} loading={saving} dirty={dirty} />
    </>
  );
}

// ── SESSION POLICY TAB ────────────────────────────────────────────────────────

function SessionPolicyTab() {
  const { form, set, loading, saving, dirty, save, discard, toast } =
    usePolicy(securitySettingsApi.getSessionPolicy, securitySettingsApi.updateSessionPolicy);

  if (loading) return <div style={{ padding: 32, color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>;
  if (!form) return null;

  return (
    <>
      <Toast toast={toast} />
      <SectionCard title="Token Expiry" description="Control how long access and refresh tokens remain valid">
        <Field label="Access Token Expiry" hint="Short-lived JWT used for API requests">
          <NumberInput value={form.access_token_expiry_minutes} onChange={v => set("access_token_expiry_minutes", v)} min={5} max={1440} suffix="minutes" />
        </Field>
        <Field label="Refresh Token Expiry" hint="Long-lived token used to obtain new access tokens">
          <NumberInput value={form.refresh_token_expiry_days} onChange={v => set("refresh_token_expiry_days", v)} min={1} max={365} suffix="days" />
        </Field>
      </SectionCard>

      <SectionCard title="Session Timeout" description="Automatically log out idle or long-running sessions">
        <Field label="Session Timeout" hint="Maximum session duration regardless of activity">
          <NumberInput value={form.session_timeout_minutes} onChange={v => set("session_timeout_minutes", v)} min={5} max={1440} suffix="minutes" />
        </Field>
        <Field label="Idle Session Timeout" hint="Log out users who have been inactive for this long">
          <NumberInput value={form.idle_timeout_minutes} onChange={v => set("idle_timeout_minutes", v)} min={1} max={480} suffix="minutes" />
        </Field>
        <Field label="Max Active Sessions Per User" hint="Oldest session is revoked when the limit is exceeded">
          <NumberInput value={form.max_sessions_per_user} onChange={v => set("max_sessions_per_user", v)} min={1} max={50} suffix="sessions" />
        </Field>
      </SectionCard>

      <SaveBar onSave={save} onDiscard={discard} loading={saving} dirty={dirty} />
    </>
  );
}

// ── 2FA POLICY TAB ────────────────────────────────────────────────────────────

const ALL_2FA_METHODS = [
  { value: "email_otp", label: "Email OTP", available: true },
  { value: "totp",      label: "Authenticator App (TOTP)", available: false },
  { value: "sms_otp",   label: "SMS OTP", available: false },
  { value: "backup_codes", label: "Backup Codes", available: false },
];

function TwoFATab() {
  const { form, set, loading, saving, dirty, save, discard, toast } =
    usePolicy(securitySettingsApi.get2FAPolicy, securitySettingsApi.update2FAPolicy);

  if (loading) return <div style={{ padding: 32, color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>;
  if (!form) return null;

  const methods = form.allowed_methods || [];

  const toggleMethod = (val) => {
    const next = methods.includes(val)
      ? methods.filter(m => m !== val)
      : [...methods, val];
    set("allowed_methods", next.length ? next : ["email_otp"]);
  };

  return (
    <>
      <Toast toast={toast} />

      <SectionCard title="Global 2FA Switch" description="Master toggle — enable the 2FA feature organisation-wide">
        <Field label="Enable Two-Factor Authentication" inline hint="When off, 2FA is unavailable to all users regardless of other settings">
          <Toggle checked={form.is_enabled} onChange={v => set("is_enabled", v)} />
        </Field>
      </SectionCard>

      {form.is_enabled && (
        <>
          <SectionCard title="Enforcement Mode" description="Decide which users must use 2FA">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
              {ENFORCEMENT_MODES.map(m => (
                <label key={m.value} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 0" }}>
                  <input
                    type="radio" name="enforcement_mode"
                    value={m.value}
                    checked={form.enforcement_mode === m.value}
                    onChange={() => set("enforcement_mode", m.value)}
                    style={{ accentColor: "var(--c-accent)", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: "var(--c-text)" }}>{m.label}</span>
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Allowed 2FA Methods" description="Which methods users can use to verify their identity">
            <div style={{ paddingTop: 8 }}>
              {ALL_2FA_METHODS.map(m => (
                <label key={m.value} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", borderBottom: "1px solid var(--c-border)",
                  cursor: m.available ? "pointer" : "not-allowed",
                  opacity: m.available ? 1 : 0.45,
                }}>
                  <input
                    type="checkbox"
                    checked={methods.includes(m.value)}
                    onChange={() => m.available && toggleMethod(m.value)}
                    disabled={!m.available}
                    style={{ accentColor: "var(--c-accent)", width: 15, height: 15 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, color: "var(--c-text)", fontWeight: 500 }}>{m.label}</div>
                    {!m.available && (
                      <div style={{ fontSize: 11, color: "var(--c-muted)" }}>Coming soon</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Grace Period" description="Time window for users to set up 2FA after it becomes required">
            <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>
              {GRACE_PERIODS.map(g => (
                <label key={g.value} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "6px 0" }}>
                  <input
                    type="radio" name="grace_period"
                    value={g.value}
                    checked={Number(form.grace_period_days) === g.value}
                    onChange={() => set("grace_period_days", g.value)}
                    style={{ accentColor: "var(--c-accent)", width: 16, height: 16 }}
                  />
                  <span style={{ fontSize: 13, color: "var(--c-text)" }}>{g.label}</span>
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Recovery Options" description="How users can regain access if they lose their 2FA device">
            <Field label="Allow Recovery Codes" inline hint="Users can generate one-time recovery codes as a backup">
              <Toggle checked={form.allow_recovery_codes} onChange={v => set("allow_recovery_codes", v)} />
            </Field>
            <Field label="Allow Admin Reset" inline hint="A superadmin can reset 2FA for a locked-out user">
              <Toggle checked={form.allow_admin_reset} onChange={v => set("allow_admin_reset", v)} />
            </Field>
            <Field label="Allow Backup Email" inline hint="Send a one-time code to a verified backup email address">
              <Toggle checked={form.allow_backup_email} onChange={v => set("allow_backup_email", v)} />
            </Field>
          </SectionCard>
        </>
      )}

      <SaveBar onSave={save} onDiscard={discard} loading={saving} dirty={dirty} />
    </>
  );
}

// ── SECURITY NOTIFICATIONS TAB ────────────────────────────────────────────────

const NOTIF_EVENTS = [
  { key: "notify_login_success",   label: "Login Success",      description: "Alert when a user signs in successfully" },
  { key: "notify_login_failure",   label: "Login Failure",      description: "Alert on each failed login attempt" },
  { key: "notify_account_locked",  label: "Account Locked",     description: "Alert when an account is locked out" },
  { key: "notify_password_changed",label: "Password Changed",   description: "Alert when a user's password is changed" },
  { key: "notify_password_reset",  label: "Password Reset",     description: "Alert when a password reset is initiated" },
  { key: "notify_2fa_enabled",     label: "2FA Enabled",        description: "Alert when a user enables two-factor auth" },
  { key: "notify_2fa_disabled",    label: "2FA Disabled",       description: "Alert when a user disables two-factor auth" },
  { key: "notify_new_device",      label: "New Device Login",   description: "Alert when sign-in is from an unrecognised device" },
  { key: "notify_new_location",    label: "New Location Login", description: "Alert when sign-in is from a new geographic location" },
];

function SecurityNotificationsTab() {
  const { form, set, loading, saving, dirty, save, discard, toast } =
    usePolicy(securitySettingsApi.getNotificationPolicy, securitySettingsApi.updateNotificationPolicy);

  if (loading) return <div style={{ padding: 32, color: "var(--c-muted)", fontSize: 13 }}>Loading…</div>;
  if (!form) return null;

  return (
    <>
      <Toast toast={toast} />

      <SectionCard title="Notification Channel" description="All security alerts are sent via this channel">
        <Field label="Channel">
          <select
            value={form.notification_channel || "email"}
            onChange={e => set("notification_channel", e.target.value)}
            style={{ ...inputStyle, maxWidth: 240 }}
          >
            {NOTIF_CHANNELS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard title="Security Event Alerts" description="Choose which security events trigger a notification">
        {NOTIF_EVENTS.map(ev => (
          <Field key={ev.key} label={ev.label} hint={ev.description} inline>
            <Toggle checked={!!form[ev.key]} onChange={v => set(ev.key, v)} />
          </Field>
        ))}
      </SectionCard>

      <SaveBar onSave={save} onDiscard={discard} loading={saving} dirty={dirty} />
    </>
  );
}

// ── SECRET ROTATION TAB ───────────────────────────────────────────────────────

function formatRemaining(ms) {
  if (ms <= 0) return "expired";
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); } }}
      style={{ fontSize: 12, color: "var(--c-accent)", fontWeight: 500, background: "none", border: "none", cursor: "pointer" }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SecretRow({ label, value }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <code style={{ flex: 1, padding: "8px 10px", background: "var(--c-bg)", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 12, fontFamily: "monospace", wordBreak: "break-all", color: "var(--c-text)" }}>{value}</code>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

function SecretRotationTab() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleRotate = async () => {
    setConfirmOpen(false);
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await secretsApi.rotate();
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to rotate secrets.");
    } finally {
      setLoading(false);
    }
  };

  const expiresAt = result?.grace_period_expires_at ? new Date(result.grace_period_expires_at) : null;
  const remainingMs = expiresAt ? expiresAt.getTime() - now : null;
  const isProduction = result && result.rotated === false;

  return (
    <>
      <SectionCard title="Rotate Secrets" description="Promotes the current secrets to PREVIOUS_*, generates new ones, and starts the grace-period clock.">
        <div style={{ paddingTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => setConfirmOpen(true)} disabled={loading}
            style={{ padding: "8px 20px", borderRadius: 6, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Rotating…" : "Rotate Secrets"}
          </button>
        </div>
      </SectionCard>

      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#f87171" }}>{error}</div>
      )}

      {result && (
        <SectionCard title={result.rotated ? "Rotation Complete" : "Manual Rotation Required"}>
          <p style={{ fontSize: 13, color: "var(--c-text2)", marginBottom: 16 }}>{result.message}</p>
          {expiresAt && (
            <div style={{ padding: 14, background: "var(--c-surface2, var(--c-bg))", border: "1px solid var(--c-border)", borderRadius: 8, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Grace period expires</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--c-text)" }}>{expiresAt.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: "var(--c-accent)", marginTop: 2 }}>
                {remainingMs > 0 ? `${formatRemaining(remainingMs)} remaining` : "Grace period has expired"}
              </div>
              {result.grace_period_hours != null && <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>Grace window: {result.grace_period_hours} hours</div>}
            </div>
          )}
          {result.rotated && result.new_jwt_secret && (
            <div>
              <div style={{ padding: "10px 14px", background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.30)", borderRadius: 6, fontSize: 12, color: "#f59e0b", marginBottom: 14 }}>
                These values are shown only once. Copy them into your secrets manager now.
              </div>
              <SecretRow label="New JWT Secret" value={result.new_jwt_secret} />
              <SecretRow label="New Refresh Secret" value={result.new_refresh_secret} />
              {result.previous_jwt_secret_kid && (
                <p style={{ fontSize: 11, color: "var(--c-muted)" }}>
                  Previous JWT key id: <code style={{ fontFamily: "monospace" }}>{result.previous_jwt_secret_kid}</code>
                  {result.previous_refresh_secret_kid && <> · Previous refresh key id: <code style={{ fontFamily: "monospace" }}>{result.previous_refresh_secret_kid}</code></>}
                </p>
              )}
            </div>
          )}
          {result.instructions?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {isProduction ? "Manual rotation steps" : "Next steps"}
              </div>
              <ol style={{ margin: 0, paddingLeft: 18 }}>
                {result.instructions.map((step, i) => (
                  <li key={step} style={{ fontSize: 13, color: "var(--c-text2)", marginBottom: 4 }}>{step.replace(/^\d+\.\s*/, "")}</li>
                ))}
              </ol>
            </div>
          )}
        </SectionCard>
      )}

      {confirmOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 12, padding: 24, width: "100%", maxWidth: 400 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--c-text)", marginBottom: 8 }}>Rotate secrets?</div>
            <p style={{ fontSize: 13, color: "var(--c-muted)", marginBottom: 20 }}>
              This generates new signing secrets immediately. Existing sessions keep working during the grace period.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleRotate} style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontWeight: 600, fontSize: 13, background: "var(--c-accent)", color: "#fff", border: "none", cursor: "pointer" }}>Yes, rotate</button>
              <button onClick={() => setConfirmOpen(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 6, fontWeight: 500, fontSize: 13, background: "transparent", color: "var(--c-text2)", border: "1px solid var(--c-border)", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── BLOCKED ORIGINS TAB ───────────────────────────────────────────────────────

function BlockedOriginsTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await corsRejectionsApi.list();
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || "Failed to load blocked origins.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = data?.items || [];

  return (
    <SectionCard title="Blocked Origins (CORS)" description="Browser requests rejected by the CORS policy. A recurring entry usually means a typo'd subdomain or a missing ALLOWED_ORIGINS entry.">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={load} disabled={loading}
          style={{ padding: "7px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "transparent", border: "1px solid var(--c-border)", color: "var(--c-text2)", cursor: "pointer" }}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {data && (
        <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Distinct origins</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--c-text)" }}>{data.distinct_origins}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total blocks</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--c-text)" }}>{data.total_hits}</div>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: "#f87171" }}>{error}</p>}

      {!error && !loading && items.length === 0 && (
        <div style={{ padding: 14, background: "var(--c-bg)", borderRadius: 8, fontSize: 13, color: "var(--c-muted)" }}>
          No blocked origins recorded. Cross-origin requests are being accepted as configured.
        </div>
      )}

      {items.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 11, color: "var(--c-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: "8px 12px 8px 0", fontWeight: 600 }}>Origin</th>
                <th style={{ padding: "8px 12px 8px 0", fontWeight: 600 }}>Blocks</th>
                <th style={{ padding: "8px 12px 8px 0", fontWeight: 600 }}>Last request</th>
                <th style={{ padding: "8px 12px 8px 0", fontWeight: 600 }}>Last seen</th>
                <th style={{ padding: "8px 0", fontWeight: 600 }}>First seen</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={`${row.origin}-${i}`} style={{ borderTop: "1px solid var(--c-border)" }}>
                  <td style={{ padding: "9px 12px 9px 0" }}><code style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>{row.origin}</code></td>
                  <td style={{ padding: "9px 12px 9px 0" }}><span className="badge-warning">{row.hit_count}</span></td>
                  <td style={{ padding: "9px 12px 9px 0", color: "var(--c-text2)" }}>
                    {row.last_method ? <><span style={{ fontFamily: "monospace", fontSize: 12 }}>{row.last_method}</span> <span style={{ color: "var(--c-muted)", wordBreak: "break-all" }}>{row.last_path || ""}</span></> : "—"}
                  </td>
                  <td style={{ padding: "9px 12px 9px 0", color: "var(--c-text2)", whiteSpace: "nowrap" }}>{formatTimestamp(row.last_seen_at)}</td>
                  <td style={{ padding: "9px 0", color: "var(--c-text2)", whiteSpace: "nowrap" }}>{formatTimestamp(row.first_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// ── ROOT PAGE ─────────────────────────────────────────────────────────────────

export default function SecuritySettingsPage() {
  const [activeTab, setActiveTab] = useState("password");

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--c-text)" }}>Security Settings</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--c-muted)" }}>
          Configure authentication policies, password rules, session management, and 2FA enforcement.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 2,
        borderBottom: "2px solid var(--c-border)",
        marginBottom: 24,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "9px 16px",
              background: "none", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400,
              color: activeTab === t.key ? "var(--c-accent)" : "var(--c-text2)",
              borderBottom: activeTab === t.key ? "2px solid var(--c-accent)" : "2px solid transparent",
              marginBottom: -2, transition: "color 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "password"  && <PasswordPolicyTab />}
      {activeTab === "login"     && <LoginPolicyTab />}
      {activeTab === "session"   && <SessionPolicyTab />}
      {activeTab === "twofa"     && <TwoFATab />}
      {activeTab === "notif"     && <SecurityNotificationsTab />}
      {activeTab === "rotation"  && <SecretRotationTab />}
      {activeTab === "cors"      && <BlockedOriginsTab />}
    </div>
  );
}
