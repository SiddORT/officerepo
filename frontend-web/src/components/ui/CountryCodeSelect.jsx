import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { COUNTRY_CODES, flagEmoji } from "../../constants/countryCodes";

export default function CountryCodeSelect({
  label = "Code",
  value = "",
  onChange,
  error,
  required,
  className = "",
  placeholder = "Code",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const labelId = useId();

  useEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const selected = useMemo(
    () => COUNTRY_CODES.find((c) => c.dial === value),
    [value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dial.replace("+", "").includes(q.replace("+", "")) ||
        c.iso2.includes(q)
    );
  }, [query]);

  const pick = (dial) => {
    onChange?.(dial);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={wrapRef}>
      {label && (
        <label id={labelId} className="text-sm font-medium t-body">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="input-field flex items-center gap-2 w-full text-left cursor-pointer"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={label ? labelId : undefined}
        >
          {selected ? (
            <>
              <span className="text-base leading-none shrink-0" aria-hidden="true">
                {flagEmoji(selected.iso2)}
              </span>
              <span className="t-body">{selected.dial}</span>
            </>
          ) : value ? (
            <span className="t-body">{value}</span>
          ) : (
            <span className="t-muted">{placeholder}</span>
          )}
          <svg
            className="ml-auto h-4 w-4 t-muted shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {open && (
          <div
            className="absolute z-30 mt-1 w-64 max-h-72 overflow-hidden rounded-lg layout-dropdown"
            role="listbox"
          >
            <div className="p-2 border-b" style={{ borderColor: "var(--c-border)" }}>
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search country or code..."
                className="input-field w-full text-sm"
              />
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <p className="px-3 py-2 text-xs t-muted">No matches.</p>
              ) : (
                filtered.map((c) => (
                  <button
                    type="button"
                    key={`${c.iso2}-${c.dial}`}
                    onClick={() => pick(c.dial)}
                    className={[
                      "flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:opacity-80",
                      c.dial === value ? "input-bg" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    role="option"
                    aria-selected={c.dial === value}
                  >
                    <span className="text-base leading-none shrink-0" aria-hidden="true">
                      {flagEmoji(c.iso2)}
                    </span>
                    <span className="t-body flex-1 truncate">{c.name}</span>
                    <span className="t-muted">{c.dial}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
