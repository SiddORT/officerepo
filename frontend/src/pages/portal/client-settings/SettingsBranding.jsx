import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { portalSettingsApi } from "../../../services/apiClient";

const IMAGE_FIELDS = [
  { key: "logo_url",      label: "Company Logo",        hint: "Recommended: 200×60 px, PNG/SVG" },
  { key: "favicon_url",   label: "Favicon",             hint: "Recommended: 32×32 px, ICO/PNG" },
  { key: "seal_url",      label: "Official Seal / Stamp", hint: "Recommended: 200×200 px, PNG (transparent)" },
  { key: "signature_url", label: "Authorised Signature", hint: "Recommended: 200×80 px, PNG (transparent)" },
];

function ImageField({ fieldKey, label, hint, value, onChange, onClear, isDark }) {
  const inp = isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900";
  return (
    <div className={`border rounded-lg p-4 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label className={`block text-xs font-semibold mb-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>{label}</label>
          <p className={`text-xs mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{hint}</p>
          <input
            type="url"
            value={value || ""}
            onChange={e => onChange(fieldKey, e.target.value)}
            placeholder="Paste image URL…"
            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 ${inp}`}
          />
        </div>
        <div className="flex-shrink-0 w-24 h-16 rounded-md overflow-hidden border flex items-center justify-center
          bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
          {value
            ? <img src={value} alt={label} className="w-full h-full object-contain" onError={e => { e.target.style.display = "none"; }} />
            : <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>Preview</span>
          }
        </div>
      </div>
      {value && (
        <button onClick={() => onClear(fieldKey)}
          className="mt-2 text-xs text-red-400 hover:text-red-500 transition-colors">
          ✕ Remove image
        </button>
      )}
    </div>
  );
}

export default function SettingsBranding() {
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
        const res = await portalSettingsApi.getBranding(subdomain, token);
        setData(res.data); setForm(res.data || {});
      } catch { setError("Failed to load branding."); }
      finally { setLoading(false); }
    })();
  }, [subdomain, token]);

  const set    = (k, v) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); };
  const clear  = async (field) => {
    try {
      const res = await portalSettingsApi.clearBrandingField(subdomain, token, field);
      setData(res.data); setForm(res.data); setDirty(false);
      setSuccess(`${field.replace("_url", "").replace("_", " ")} removed.`);
    } catch { setError("Failed to remove image."); }
  };

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const res = await portalSettingsApi.updateBranding(subdomain, token, form);
      setData(res.data); setForm(res.data); setDirty(false);
      setSuccess("Branding saved.");
    } catch { setError("Failed to save branding."); }
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
      <h2 className={`text-xl font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Company Branding</h2>
      <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Upload logos, seals, and configure brand identity for documents and portal.
      </p>

      {error   && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}
      {success && <div className="mb-4 p-3 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-sm">{success}</div>}

      {/* Images */}
      <div className={`border rounded-lg p-5 mb-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Brand Assets</h3>
        <div className="grid grid-cols-1 gap-4">
          {IMAGE_FIELDS.map(f => (
            <ImageField key={f.key} {...f} value={form[f.key]} onChange={set} onClear={clear} isDark={isDark} />
          ))}
        </div>
      </div>

      {/* Identity */}
      <div className={`border rounded-lg p-5 mb-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Signatory & Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "signatory_name", label: "Authorised Signatory Name" },
            { key: "designation",    label: "Designation" },
            { key: "website",        label: "Website URL" },
            { key: "support_email",  label: "Support Email" },
            { key: "phone",          label: "Phone Number" },
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

      {/* Addresses */}
      <div className={`border rounded-lg p-5 mb-5 ${card}`}>
        <h3 className={`text-sm font-semibold mb-4 ${isDark ? "text-gray-200" : "text-gray-800"}`}>Addresses</h3>
        <div className="grid grid-cols-1 gap-4">
          {[
            { key: "registered_address", label: "Registered Address" },
            { key: "corporate_address",  label: "Corporate Address" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className={`block text-xs font-medium mb-1 ${lbl}`}>{label}</label>
              <textarea
                rows={3}
                value={form[key] || ""}
                onChange={e => set(key, e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 resize-none ${inp}`}
                placeholder={label}
              />
            </div>
          ))}
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
