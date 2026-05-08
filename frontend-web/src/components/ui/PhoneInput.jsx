import React, { useState, useRef, useEffect } from "react";

const COUNTRIES = [
  { code: "IN", name: "India",                  dial: "+91",  flag: "🇮🇳" },
  { code: "US", name: "United States",           dial: "+1",   flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom",          dial: "+44",  flag: "🇬🇧" },
  { code: "AE", name: "United Arab Emirates",    dial: "+971", flag: "🇦🇪" },
  { code: "AU", name: "Australia",               dial: "+61",  flag: "🇦🇺" },
  { code: "CA", name: "Canada",                  dial: "+1",   flag: "🇨🇦" },
  { code: "DE", name: "Germany",                 dial: "+49",  flag: "🇩🇪" },
  { code: "FR", name: "France",                  dial: "+33",  flag: "🇫🇷" },
  { code: "JP", name: "Japan",                   dial: "+81",  flag: "🇯🇵" },
  { code: "SG", name: "Singapore",               dial: "+65",  flag: "🇸🇬" },
  { code: "MY", name: "Malaysia",                dial: "+60",  flag: "🇲🇾" },
  { code: "PK", name: "Pakistan",                dial: "+92",  flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh",              dial: "+880", flag: "🇧🇩" },
  { code: "LK", name: "Sri Lanka",               dial: "+94",  flag: "🇱🇰" },
  { code: "NP", name: "Nepal",                   dial: "+977", flag: "🇳🇵" },
  { code: "SA", name: "Saudi Arabia",            dial: "+966", flag: "🇸🇦" },
  { code: "QA", name: "Qatar",                   dial: "+974", flag: "🇶🇦" },
  { code: "KW", name: "Kuwait",                  dial: "+965", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain",                 dial: "+973", flag: "🇧🇭" },
  { code: "OM", name: "Oman",                    dial: "+968", flag: "🇴🇲" },
  { code: "ZA", name: "South Africa",            dial: "+27",  flag: "🇿🇦" },
  { code: "NG", name: "Nigeria",                 dial: "+234", flag: "🇳🇬" },
  { code: "KE", name: "Kenya",                   dial: "+254", flag: "🇰🇪" },
  { code: "EG", name: "Egypt",                   dial: "+20",  flag: "🇪🇬" },
  { code: "BR", name: "Brazil",                  dial: "+55",  flag: "🇧🇷" },
  { code: "MX", name: "Mexico",                  dial: "+52",  flag: "🇲🇽" },
  { code: "AR", name: "Argentina",               dial: "+54",  flag: "🇦🇷" },
  { code: "CN", name: "China",                   dial: "+86",  flag: "🇨🇳" },
  { code: "KR", name: "South Korea",             dial: "+82",  flag: "🇰🇷" },
  { code: "ID", name: "Indonesia",               dial: "+62",  flag: "🇮🇩" },
  { code: "PH", name: "Philippines",             dial: "+63",  flag: "🇵🇭" },
  { code: "TH", name: "Thailand",                dial: "+66",  flag: "🇹🇭" },
  { code: "VN", name: "Vietnam",                 dial: "+84",  flag: "🇻🇳" },
  { code: "IT", name: "Italy",                   dial: "+39",  flag: "🇮🇹" },
  { code: "ES", name: "Spain",                   dial: "+34",  flag: "🇪🇸" },
  { code: "NL", name: "Netherlands",             dial: "+31",  flag: "🇳🇱" },
  { code: "CH", name: "Switzerland",             dial: "+41",  flag: "🇨🇭" },
  { code: "SE", name: "Sweden",                  dial: "+46",  flag: "🇸🇪" },
  { code: "NO", name: "Norway",                  dial: "+47",  flag: "🇳🇴" },
  { code: "DK", name: "Denmark",                 dial: "+45",  flag: "🇩🇰" },
  { code: "FI", name: "Finland",                 dial: "+358", flag: "🇫🇮" },
  { code: "PL", name: "Poland",                  dial: "+48",  flag: "🇵🇱" },
  { code: "RU", name: "Russia",                  dial: "+7",   flag: "🇷🇺" },
  { code: "TR", name: "Turkey",                  dial: "+90",  flag: "🇹🇷" },
  { code: "IL", name: "Israel",                  dial: "+972", flag: "🇮🇱" },
  { code: "NZ", name: "New Zealand",             dial: "+64",  flag: "🇳🇿" },
  { code: "HK", name: "Hong Kong",               dial: "+852", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan",                  dial: "+886", flag: "🇹🇼" },
  { code: "PT", name: "Portugal",                dial: "+351", flag: "🇵🇹" },
  { code: "GR", name: "Greece",                  dial: "+30",  flag: "🇬🇷" },
  { code: "UA", name: "Ukraine",                 dial: "+380", flag: "🇺🇦" },
];

export default function PhoneInput({
  label,
  required,
  dialCode,
  onDialCodeChange,
  number,
  onNumberChange,
  error,
  hint,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);
  const searchRef   = useRef(null);

  const selected = COUNTRIES.find((c) => c.dial === dialCode) || COUNTRIES[0];
  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const pick = (country) => {
    onDialCodeChange(country.dial);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium t-muted">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div
        className="flex items-stretch rounded-lg overflow-visible"
        style={{
          border: `1px solid ${error ? "rgba(239,68,68,0.6)" : "var(--c-border)"}`,
          background: "var(--c-surface2)",
          transition: "border-color 0.15s",
          position: "relative",
        }}
        onFocus={() => {}}
      >
        {/* Country picker trigger */}
        <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 h-full text-sm transition-all"
            style={{
              borderRight: "1px solid var(--c-border)",
              background: open ? "rgba(0,174,236,0.06)" : "transparent",
              borderRadius: "8px 0 0 8px",
              minWidth: 88,
              color: "var(--c-text)",
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{selected.flag}</span>
            <span className="text-xs font-semibold" style={{ color: "var(--c-accent)" }}>
              {selected.dial}
            </span>
            <svg
              className="w-3 h-3 flex-shrink-0"
              style={{
                color: "var(--c-muted)",
                transform: open ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {open && (
            <div
              className="absolute z-50 left-0"
              style={{
                top: "calc(100% + 4px)",
                width: 240,
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                borderRadius: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
                overflow: "hidden",
              }}
            >
              {/* Search */}
              <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid var(--c-border)" }}>
                <div
                  className="flex items-center gap-2 px-2 rounded-lg"
                  style={{ background: "var(--c-surface2)", border: "1px solid var(--c-border)" }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--c-muted)" }}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search country..."
                    className="text-xs py-1.5 w-full bg-transparent outline-none t-body"
                    style={{ color: "var(--c-text)" }}
                  />
                </div>
              </div>

              {/* List */}
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {filtered.length === 0 ? (
                  <p className="text-xs t-muted text-center py-4">No results</p>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => pick(c)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-all"
                      style={{
                        background: c.dial === dialCode ? "rgba(0,174,236,0.08)" : "transparent",
                        color: "var(--c-text)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0,174,236,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          c.dial === dialCode ? "rgba(0,174,236,0.08)" : "transparent";
                      }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0 }}>{c.flag}</span>
                      <span className="flex-1 text-xs truncate" style={{ color: "var(--c-text2)" }}>
                        {c.name}
                      </span>
                      <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--c-accent)" }}>
                        {c.dial}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Number input */}
        <input
          type="tel"
          value={number}
          onChange={(e) => onNumberChange(e.target.value.replace(/[^\d\s\-().]/g, ""))}
          placeholder="555 000 0000"
          className="flex-1 text-sm px-3 py-2 bg-transparent outline-none"
          style={{ color: "var(--c-text)", minWidth: 0 }}
        />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs t-muted">{hint}</p>}
    </div>
  );
}
