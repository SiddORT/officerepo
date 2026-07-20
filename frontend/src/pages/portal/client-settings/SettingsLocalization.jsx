import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { portalSettingsApi } from "../../../services/apiClient";

const TIMEZONES = [
  "Asia/Kolkata","Asia/Dubai","Asia/Singapore","Asia/Tokyo","Asia/Shanghai",
  "Europe/London","Europe/Paris","Europe/Berlin","America/New_York","America/Chicago",
  "America/Los_Angeles","America/Toronto","Australia/Sydney","Pacific/Auckland",
];
const DATE_FORMATS    = ["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD","DD-MMM-YYYY"];
const NUMBER_FORMATS  = ["1,00,000.00","1,000,000.00","1.000.000,00"];
const CURRENCIES = [
  { code: "INR", label: "INR — Indian Rupee (₹)", symbol: "₹" },
  { code: "USD", label: "USD — US Dollar ($)",     symbol: "$" },
  { code: "EUR", label: "EUR — Euro (€)",           symbol: "€" },
  { code: "GBP", label: "GBP — British Pound (£)", symbol: "£" },
  { code: "AED", label: "AED — UAE Dirham",         symbol: "AED" },
  { code: "SGD", label: "SGD — Singapore Dollar",   symbol: "S$" },
];
const LANGUAGES = [
  { code: "en", label: "English" }, { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" }, { code: "ta", label: "Tamil" },
];

export default function SettingsLocalization() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const { isDark } = useTheme();

  const [data, setData]       = useState(null);
  const [form, setForm]       = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await portalSettingsApi.getLocalization(subdomain, token);
        setData(res.data); setForm(res.data || {});
      } catch { setError("Failed to load localization settings."); }
      finally { setLoading(false); }
    })();
  }, [subdomain, token]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const onCurrencyChange = (code) => {
    const cur = CURRENCIES.find(c => c.code === code);
    set("currency_code",   code);
    if (cur) set("currency_symbol", cur.symbol);
  };

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await portalSettingsApi.updateLocalization(subdomain, token, form);
      setData(res.data); setForm(res.data); setDirty(false);
      setSuccess("Localization settings saved.");
    } catch { setError("Failed to save settings."); }
    finally { setSaving(false); }
  };

  const card = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const lbl  = isDark ? "text-gray-300" : "text-gray-700";
  const inp  = isDark
    ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-500"
    : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500";

  if (loading) return <div className={`p-8 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className={`text-xl font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Localization</h2>
      <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Set currency, timezone, and regional formatting preferences.
      </p>

      {error   && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{success}</div>}

      {/* Currency */}
      <div className={`border rounded-lg p-5 mb-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Currency</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Default Currency</label>
            <select value={form.currency_code || "INR"} onChange={e => onCurrencyChange(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Currency Symbol</label>
            <input type="text" value={form.currency_symbol || ""} onChange={e => set("currency_symbol", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}
              placeholder="₹" />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Symbol Position</label>
            <select value={form.currency_position || "before"} onChange={e => set("currency_position", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              <option value="before">Before amount (₹100)</option>
              <option value="after">After amount (100₹)</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Decimal Precision</label>
            <select value={form.decimal_precision ?? 2} onChange={e => set("decimal_precision", parseInt(e.target.value))}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              {[0,1,2,3,4].map(n => <option key={n} value={n}>{n} decimal places</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Regional */}
      <div className={`border rounded-lg p-5 mb-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Regional Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Timezone</label>
            <select value={form.timezone || "Asia/Kolkata"} onChange={e => set("timezone", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Country</label>
            <input type="text" value={form.country || ""} onChange={e => set("country", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}
              placeholder="India" />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Language</label>
            <select value={form.language || "en"} onChange={e => set("language", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Date Format</label>
            <select value={form.date_format || "DD/MM/YYYY"} onChange={e => set("date_format", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              {DATE_FORMATS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Time Format</label>
            <select value={form.time_format || "12"} onChange={e => set("time_format", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              <option value="12">12-hour (AM/PM)</option>
              <option value="24">24-hour</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Number Format</label>
            <select value={form.number_format || "1,00,000.00"} onChange={e => set("number_format", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              {NUMBER_FORMATS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || !dirty}
          className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {dirty && (
          <button onClick={() => { setForm(data || {}); setDirty(false); }}
            className={`px-5 py-2 text-sm font-medium rounded-md border transition-colors
              ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            Discard
          </button>
        )}
      </div>
    </div>
  );
}
