import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { portalSettingsApi } from "../../../services/apiClient";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DATE_FORMATS = ["DD/MM/YYYY","MM/DD/YYYY","YYYY-MM-DD","DD-MMM-YYYY"];
const WEEK_DAYS    = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const LANGUAGES    = [
  { code: "en", label: "English" }, { code: "hi", label: "Hindi" },
  { code: "mr", label: "Marathi" }, { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" }, { code: "kn", label: "Kannada" },
];

export default function SettingsGeneral() {
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
        const res = await portalSettingsApi.getGeneral(subdomain, token);
        setData(res.data);
        setForm(res.data || {});
      } catch {
        setError("Failed to load general settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [subdomain, token]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await portalSettingsApi.updateGeneral(subdomain, token, form);
      setData(res.data);
      setForm(res.data);
      setDirty(false);
      setSuccess("General settings saved.");
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const card = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";
  const lbl  = isDark ? "text-gray-300" : "text-gray-700";
  const inp  = isDark
    ? "bg-gray-700 border-gray-600 text-white focus:ring-blue-500"
    : "bg-white border-gray-300 text-gray-900 focus:ring-blue-500";

  if (loading) return <div className={`p-8 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className={`text-xl font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>General Settings</h2>
      <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Configure basic workspace information and defaults.
      </p>

      {error   && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{success}</div>}

      <div className={`border rounded-lg p-5 mb-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Workspace Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "client_name",     label: "Workspace Name" },
            { key: "display_name",    label: "Display Name" },
            { key: "default_company", label: "Default Company" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className={`block text-xs font-medium mb-1 ${lbl}`}>{label}</label>
              <input
                type="text"
                value={form[key] || ""}
                onChange={e => set(key, e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}
                placeholder={label}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={`border rounded-lg p-5 mb-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Date & Time Defaults</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Week Starts On</label>
            <select value={form.week_start_day || "Monday"} onChange={e => set("week_start_day", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              {WEEK_DAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Fiscal Year Starts (Month)</label>
            <select value={form.fiscal_year_start || 4} onChange={e => set("fiscal_year_start", parseInt(e.target.value))}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${lbl}`}>Default Language</label>
            <select value={form.default_language || "en"} onChange={e => set("default_language", e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}>
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {dirty && (
          <button
            onClick={() => { setForm(data || {}); setDirty(false); }}
            className={`px-5 py-2 text-sm font-medium rounded-md border transition-colors
              ${isDark ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
          >
            Discard
          </button>
        )}
      </div>
    </div>
  );
}
