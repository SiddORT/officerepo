import React, { useEffect, useState, useCallback } from "react";
import { authApi } from "../../../services/apiClient";
import { useTheme } from "../../../contexts/ThemeContext";

const unwrap = (res) => res?.data?.data ?? res?.data;

function extractError(err, fallback = "Something went wrong.") {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  return fallback;
}

function Banner({ kind, children, onDismiss }) {
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
      <span className="flex-1">{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} style={{ color: "inherit", opacity: 0.6 }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SectionCard({ title, description, children }) {
  return (
    <div className="rounded-xl mb-6" style={{
      background: "var(--c-surface)",
      border: "1px solid var(--c-border)",
    }}>
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--c-border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>{title}</h2>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>{description}</p>
        )}
      </div>
      <div className="px-6 py-5 flex flex-col gap-5">{children}</div>
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div className="flex items-start gap-4" style={{ flexWrap: "wrap" }}>
      <div style={{ minWidth: 180, flex: "0 0 180px" }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--c-muted)", letterSpacing: "0.06em" }}>{label}</p>
        {hint && <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)", opacity: 0.7 }}>{hint}</p>}
      </div>
      <div style={{ flex: "1 1 220px" }}>{children}</div>
    </div>
  );
}

function StyledSelect({ value, onChange, options, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all appearance-none"
      style={{
        background: "var(--c-surface2)",
        border: `1px solid ${focused ? "var(--c-accent)" : "var(--c-border)"}`,
        boxShadow: focused ? "0 0 0 3px var(--c-accent-dim)" : "none",
        color: "var(--c-text)",
        cursor: disabled ? "not-allowed" : "pointer",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        paddingRight: 32,
      }}
    >
      {options.map((o) => (
        <option key={o.value ?? o} value={o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
    </select>
  );
}

// Curated IANA timezone list with UTC offset labels
const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC — Coordinated Universal Time (+00:00)" },
  { value: "Europe/London", label: "London — GMT/BST (+00:00 / +01:00)" },
  { value: "Europe/Paris", label: "Paris — Central European Time (+01:00 / +02:00)" },
  { value: "Europe/Berlin", label: "Berlin — Central European Time (+01:00 / +02:00)" },
  { value: "Europe/Rome", label: "Rome — Central European Time (+01:00 / +02:00)" },
  { value: "Europe/Amsterdam", label: "Amsterdam — Central European Time (+01:00 / +02:00)" },
  { value: "Europe/Madrid", label: "Madrid — Central European Time (+01:00 / +02:00)" },
  { value: "Europe/Zurich", label: "Zurich — Central European Time (+01:00 / +02:00)" },
  { value: "Europe/Stockholm", label: "Stockholm — Central European Time (+01:00 / +02:00)" },
  { value: "Europe/Helsinki", label: "Helsinki — Eastern European Time (+02:00 / +03:00)" },
  { value: "Europe/Athens", label: "Athens — Eastern European Time (+02:00 / +03:00)" },
  { value: "Europe/Istanbul", label: "Istanbul — Turkey Time (+03:00)" },
  { value: "Europe/Moscow", label: "Moscow — Moscow Standard Time (+03:00)" },
  { value: "Asia/Dubai", label: "Dubai — Gulf Standard Time (+04:00)" },
  { value: "Asia/Kabul", label: "Kabul — Afghanistan Time (+04:30)" },
  { value: "Asia/Karachi", label: "Karachi — Pakistan Standard Time (+05:00)" },
  { value: "Asia/Kolkata", label: "India — India Standard Time (+05:30)" },
  { value: "Asia/Kathmandu", label: "Kathmandu — Nepal Time (+05:45)" },
  { value: "Asia/Dhaka", label: "Dhaka — Bangladesh Standard Time (+06:00)" },
  { value: "Asia/Rangoon", label: "Yangon — Myanmar Time (+06:30)" },
  { value: "Asia/Bangkok", label: "Bangkok — Indochina Time (+07:00)" },
  { value: "Asia/Jakarta", label: "Jakarta — Western Indonesian Time (+07:00)" },
  { value: "Asia/Singapore", label: "Singapore — Singapore Time (+08:00)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong — Hong Kong Time (+08:00)" },
  { value: "Asia/Shanghai", label: "China — China Standard Time (+08:00)" },
  { value: "Asia/Taipei", label: "Taipei — China Standard Time (+08:00)" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur — Malaysia Time (+08:00)" },
  { value: "Australia/Perth", label: "Perth — Australian Western Time (+08:00)" },
  { value: "Asia/Seoul", label: "Seoul — Korea Standard Time (+09:00)" },
  { value: "Asia/Tokyo", label: "Tokyo — Japan Standard Time (+09:00)" },
  { value: "Australia/Darwin", label: "Darwin — Australian Central Time (+09:30)" },
  { value: "Australia/Adelaide", label: "Adelaide — Australian Central Time (+09:30 / +10:30)" },
  { value: "Australia/Brisbane", label: "Brisbane — Australian Eastern Time (+10:00)" },
  { value: "Australia/Sydney", label: "Sydney — Australian Eastern Time (+10:00 / +11:00)" },
  { value: "Pacific/Auckland", label: "Auckland — New Zealand Time (+12:00 / +13:00)" },
  { value: "Pacific/Fiji", label: "Fiji — Fiji Time (+12:00)" },
  { value: "Pacific/Honolulu", label: "Honolulu — Hawaii-Aleutian Time (−10:00)" },
  { value: "America/Anchorage", label: "Anchorage — Alaska Time (−09:00 / −08:00)" },
  { value: "America/Los_Angeles", label: "Los Angeles — Pacific Time (−08:00 / −07:00)" },
  { value: "America/Denver", label: "Denver — Mountain Time (−07:00 / −06:00)" },
  { value: "America/Phoenix", label: "Phoenix — Mountain Standard Time (−07:00)" },
  { value: "America/Chicago", label: "Chicago — Central Time (−06:00 / −05:00)" },
  { value: "America/New_York", label: "New York — Eastern Time (−05:00 / −04:00)" },
  { value: "America/Toronto", label: "Toronto — Eastern Time (−05:00 / −04:00)" },
  { value: "America/Halifax", label: "Halifax — Atlantic Time (−04:00 / −03:00)" },
  { value: "America/Sao_Paulo", label: "São Paulo — Brasília Time (−03:00)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires — Argentina Time (−03:00)" },
  { value: "America/Bogota", label: "Bogotá — Colombia Time (−05:00)" },
  { value: "America/Lima", label: "Lima — Peru Time (−05:00)" },
  { value: "America/Mexico_City", label: "Mexico City — Central Time (−06:00 / −05:00)" },
  { value: "America/Caracas", label: "Caracas — Venezuela Time (−04:00)" },
  { value: "Africa/Cairo", label: "Cairo — Eastern European Time (+02:00)" },
  { value: "Africa/Johannesburg", label: "Johannesburg — South Africa Standard Time (+02:00)" },
  { value: "Africa/Lagos", label: "Lagos — West Africa Time (+01:00)" },
  { value: "Africa/Nairobi", label: "Nairobi — East Africa Time (+03:00)" },
  { value: "Africa/Casablanca", label: "Casablanca — Western European Time (+00:00 / +01:00)" },
];

function TimezoneSelect({ value, onChange, disabled }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);

  // Ensure the current value always shows even if not in curated list
  const allOptions = React.useMemo(() => {
    const inList = TIMEZONE_OPTIONS.some((o) => o.value === value);
    if (!inList && value) {
      return [{ value, label: value }, ...TIMEZONE_OPTIONS];
    }
    return TIMEZONE_OPTIONS;
  }, [value]);

  const filtered = search.trim()
    ? allOptions.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o.value.toLowerCase().includes(search.toLowerCase())
      )
    : allOptions;

  const selected = allOptions.find((o) => o.value === value);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className="w-full rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between"
        style={{
          background: "var(--c-surface2)",
          border: `1px solid ${open ? "var(--c-accent)" : "var(--c-border)"}`,
          boxShadow: open ? "0 0 0 3px var(--c-accent-dim)" : "none",
          color: "var(--c-text)",
          cursor: disabled ? "not-allowed" : "pointer",
          minHeight: 36,
        }}
      >
        <span className="truncate">{selected?.label ?? value ?? "Select timezone…"}</span>
        <svg className="w-3.5 h-3.5 flex-shrink-0 ml-2" style={{ color: "var(--c-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={open ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden" style={{
          background: "var(--c-surface)",
          border: "1px solid var(--c-border)",
          maxHeight: 260,
          display: "flex",
          flexDirection: "column",
        }}>
          <div className="p-2" style={{ borderBottom: "1px solid var(--c-border)" }}>
            <input
              autoFocus
              type="text"
              placeholder="Search timezone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md px-3 py-1.5 text-sm outline-none"
              style={{
                background: "var(--c-surface2)",
                border: "1px solid var(--c-border)",
                color: "var(--c-text)",
              }}
            />
          </div>
          <div className="overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-xs py-3 text-center" style={{ color: "var(--c-muted)" }}>No results</p>
            )}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); setSearch(""); }}
                className="w-full text-left px-3 py-2 text-sm transition-colors"
                style={{
                  background: o.value === value ? "var(--c-accent-dim)" : "transparent",
                  color: o.value === value ? "var(--c-accent)" : "var(--c-text)",
                  fontWeight: o.value === value ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (o.value !== value) e.currentTarget.style.background = "var(--c-surface2)"; }}
                onMouseLeave={(e) => { if (o.value !== value) e.currentTarget.style.background = "transparent"; }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Theme pill button group
function ThemePicker({ value, onChange }) {
  const opts = [
    {
      key: "light",
      label: "Light",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ),
    },
    {
      key: "dark",
      label: "Dark",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      ),
    },
    {
      key: "system",
      label: "System",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="2" y="3" width="20" height="14" rx="2" strokeWidth={2} />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M12 17v4" />
        </svg>
      ),
    },
  ];
  return (
    <div className="flex gap-2">
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: active ? "var(--c-accent)" : "var(--c-surface2)",
              color: active ? "#fff" : "var(--c-text2)",
              border: `1px solid ${active ? "var(--c-accent)" : "var(--c-border)"}`,
              boxShadow: active ? "0 0 0 3px var(--c-accent-dim)" : "none",
              cursor: "pointer",
            }}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function GeneralSettings() {
  const { setTheme: applyTheme } = useTheme();

  const [form, setForm] = useState(null);
  const [original, setOriginal] = useState(null);
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prefsRes, optsRes] = await Promise.all([
        authApi.getPreferences(),
        authApi.getPreferencesOptions(),
      ]);
      const prefs = unwrap(prefsRes);
      const opts = unwrap(optsRes);
      setForm(prefs);
      setOriginal(prefs);
      setOptions(opts);
      // Apply the stored theme on load
      if (prefs?.theme) applyTheme(prefs.theme);
    } catch (err) {
      setMsg({ kind: "error", text: extractError(err, "Failed to load preferences.") });
    } finally {
      setLoading(false);
    }
  }, [applyTheme]);

  useEffect(() => { load(); }, [load]);

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }));

  const handleThemeChange = (theme) => {
    set("theme")(theme);
    applyTheme(theme); // instant visual preview
  };

  const isDirty = form && original && JSON.stringify(form) !== JSON.stringify(original);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await authApi.updatePreferences(form);
      const saved = unwrap(res);
      setForm(saved);
      setOriginal(saved);
      if (saved?.theme) applyTheme(saved.theme);
      setMsg({ kind: "success", text: "Preferences saved." });
      setTimeout(() => setMsg(null), 4000);
    } catch (err) {
      setMsg({ kind: "error", text: extractError(err, "Failed to save preferences.") });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm(original);
    if (original?.theme) applyTheme(original.theme);
    setMsg(null);
  };

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>General Settings</h1>
          <p className="text-sm mt-1" style={{ color: "var(--c-muted)" }}>Display, date/time, and navigation preferences.</p>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: "var(--c-muted)" }}>
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading preferences…
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-lg font-bold" style={{ color: "var(--c-text)" }}>General Settings</h1>
        <p className="text-sm mt-1" style={{ color: "var(--c-muted)" }}>
          Customize how Office Repo looks and behaves for your account.
        </p>
      </div>

      <Banner kind={msg?.kind} onDismiss={() => setMsg(null)}>{msg?.text}</Banner>

      {/* ── Display Preferences ── */}
      <SectionCard
        title="Display"
        description="Appearance and language settings."
      >
        <FieldRow label="Theme" hint="Theme previews instantly; saved on click below.">
          <ThemePicker value={form.theme} onChange={handleThemeChange} />
        </FieldRow>

        <div style={{ height: 1, background: "var(--c-border)" }} />

        <FieldRow label="Language" hint="Interface language.">
          <StyledSelect
            value={form.language}
            onChange={set("language")}
            options={options?.languages ?? [{ value: "en", label: "English" }]}
          />
        </FieldRow>
      </SectionCard>

      {/* ── Date & Time ── */}
      <SectionCard
        title="Date & Time"
        description="How dates, times, and weeks are displayed."
      >
        <FieldRow label="Timezone" hint="Used for displaying scheduled events.">
          <TimezoneSelect value={form.timezone} onChange={set("timezone")} />
        </FieldRow>

        <div style={{ height: 1, background: "var(--c-border)" }} />

        <FieldRow label="Date Format">
          <StyledSelect
            value={form.date_format}
            onChange={set("date_format")}
            options={(options?.date_formats ?? []).map((v) => ({ value: v, label: v }))}
          />
        </FieldRow>

        <div style={{ height: 1, background: "var(--c-border)" }} />

        <FieldRow label="Time Format">
          <StyledSelect
            value={form.time_format}
            onChange={set("time_format")}
            options={options?.time_formats ?? [
              { value: "12h", label: "12-Hour (1:00 PM)" },
              { value: "24h", label: "24-Hour (13:00)" },
            ]}
          />
        </FieldRow>

        <div style={{ height: 1, background: "var(--c-border)" }} />

        <FieldRow label="Week Starts On">
          <StyledSelect
            value={form.week_start_day}
            onChange={set("week_start_day")}
            options={options?.week_start_days ?? [
              { value: "monday", label: "Monday" },
              { value: "sunday", label: "Sunday" },
              { value: "saturday", label: "Saturday" },
            ]}
          />
        </FieldRow>
      </SectionCard>

      {/* ── Navigation ── */}
      <SectionCard
        title="Navigation"
        description="Default page and table behaviour."
      >
        <FieldRow label="Default Landing Page" hint="Where you land after login.">
          <StyledSelect
            value={form.default_landing_page}
            onChange={set("default_landing_page")}
            options={options?.landing_pages ?? []}
          />
        </FieldRow>

        <div style={{ height: 1, background: "var(--c-border)" }} />

        <FieldRow label="Table Page Size" hint="Rows per page in all list views.">
          <StyledSelect
            value={String(form.table_page_size)}
            onChange={(v) => set("table_page_size")(Number(v))}
            options={(options?.table_page_sizes ?? [25]).map((v) => ({
              value: String(v),
              label: `${v} rows per page`,
            }))}
          />
        </FieldRow>
      </SectionCard>

      {/* ── Action bar ── */}
      <div className="flex items-center gap-3 pt-1 pb-8">
        <button
          onClick={save}
          disabled={saving || !isDirty}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: saving || !isDirty ? "var(--c-surface2)" : "var(--c-accent)",
            color: saving || !isDirty ? "var(--c-muted)" : "#fff",
            border: `1px solid ${saving || !isDirty ? "var(--c-border)" : "var(--c-accent)"}`,
            cursor: saving || !isDirty ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>

        {isDirty && !saving && (
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: "transparent",
              color: "var(--c-muted)",
              border: "1px solid var(--c-border)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--c-surface2)"; e.currentTarget.style.color = "var(--c-text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--c-muted)"; }}
          >
            Discard
          </button>
        )}

        {!isDirty && !saving && original && (
          <span className="text-xs" style={{ color: "var(--c-muted)" }}>
            All changes saved.
          </span>
        )}
      </div>
    </div>
  );
}
