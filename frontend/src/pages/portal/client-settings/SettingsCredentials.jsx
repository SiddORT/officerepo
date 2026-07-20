import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { portalSettingsApi } from "../../../services/apiClient";

const CREDENTIAL_FIELDS = {
  smtp: [
    { key: "host",     label: "SMTP Host",  placeholder: "smtp.gmail.com" },
    { key: "port",     label: "Port",       placeholder: "587" },
    { key: "username", label: "Username",   placeholder: "you@example.com" },
    { key: "password", label: "Password",   placeholder: "••••••••", type: "password" },
    { key: "from_name",label: "From Name",  placeholder: "Acme Corp" },
    { key: "from_email",label:"From Email", placeholder: "noreply@acme.com" },
  ],
  sms_gateway: [
    { key: "provider",   label: "Provider",   placeholder: "twilio, msg91, …" },
    { key: "api_key",    label: "API Key",    placeholder: "••••••••", type: "password" },
    { key: "sender_id",  label: "Sender ID",  placeholder: "ACME" },
  ],
  whatsapp_api: [
    { key: "business_id", label: "Business Account ID", placeholder: "" },
    { key: "api_token",   label: "API Token",           placeholder: "••••••••", type: "password" },
    { key: "phone_id",    label: "Phone Number ID",     placeholder: "" },
  ],
  google_oauth: [
    { key: "client_id",     label: "Client ID",     placeholder: "" },
    { key: "client_secret", label: "Client Secret", placeholder: "••••••••", type: "password" },
    { key: "redirect_uri",  label: "Redirect URI",  placeholder: "https://…/oauth/google/callback" },
  ],
  microsoft_oauth: [
    { key: "tenant_id",     label: "Tenant ID",     placeholder: "" },
    { key: "client_id",     label: "Client ID",     placeholder: "" },
    { key: "client_secret", label: "Client Secret", placeholder: "••••••••", type: "password" },
  ],
  calendar: [
    { key: "provider",  label: "Provider",   placeholder: "google, microsoft, …" },
    { key: "api_key",   label: "API Key",    placeholder: "••••••••", type: "password" },
  ],
  storage: [
    { key: "provider",        label: "Provider",       placeholder: "s3, gcs, azure" },
    { key: "bucket",          label: "Bucket / Container", placeholder: "" },
    { key: "access_key",      label: "Access Key",     placeholder: "••••••••", type: "password" },
    { key: "secret_key",      label: "Secret Key",     placeholder: "••••••••", type: "password" },
    { key: "region",          label: "Region",         placeholder: "ap-south-1" },
  ],
  custom_api: [
    { key: "base_url",    label: "Base URL",    placeholder: "https://api.example.com" },
    { key: "api_key",     label: "API Key",     placeholder: "••••••••", type: "password" },
    { key: "description", label: "Description", placeholder: "What this integration does" },
  ],
};

export default function SettingsCredentials() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const { isDark } = useTheme();

  const [creds, setCreds]       = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [formMap, setFormMap]   = useState({});
  const [saving, setSaving]     = useState(null);
  const [clearing, setClearing] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await portalSettingsApi.getCredentials(subdomain, token);
        setCreds(res.data || []);
      } catch { setError("Failed to load credentials."); }
      finally { setLoading(false); }
    })();
  }, [subdomain, token]);

  const toggleExpand = (type) => {
    setExpanded(e => e === type ? null : type);
    if (!formMap[type]) setFormMap(m => ({ ...m, [type]: {} }));
  };

  const setField = (type, key, val) =>
    setFormMap(m => ({ ...m, [type]: { ...(m[type] || {}), [key]: val } }));

  const save = async (type) => {
    setSaving(type);
    try {
      const res = await portalSettingsApi.updateCredential(subdomain, token, type, formMap[type] || {});
      setCreds(prev => prev.map(c => c.credential_type === type ? { ...c, ...res.data } : c));
      setFormMap(m => ({ ...m, [type]: {} }));
      setExpanded(null);
    } catch { setError("Failed to save credential."); }
    finally { setSaving(null); }
  };

  const clear = async (type) => {
    if (!window.confirm("Remove this credential configuration?")) return;
    setClearing(type);
    try {
      const res = await portalSettingsApi.clearCredential(subdomain, token, type);
      setCreds(prev => prev.map(c => c.credential_type === type ? { ...c, ...res.data } : c));
    } catch { setError("Failed to clear credential."); }
    finally { setClearing(null); }
  };

  const inp = isDark
    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:ring-blue-500"
    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500";

  if (loading) return <div className={`p-8 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className={`text-xl font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Credentials & Integrations</h2>
      <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Securely configure third-party service credentials. Secret values are encrypted and never shown after saving.
      </p>

      {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <div className="space-y-2">
        {creds.map(cred => {
          const isOpen  = expanded === cred.credential_type;
          const fields  = CREDENTIAL_FIELDS[cred.credential_type] || [];
          const fm      = formMap[cred.credential_type] || {};

          return (
            <div key={cred.credential_type}
              className={`border rounded-lg overflow-hidden transition-all
                ${isDark ? "border-gray-700" : "border-gray-200"}`}>
              {/* Header row */}
              <button
                onClick={() => toggleExpand(cred.credential_type)}
                className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors
                  ${isDark ? "hover:bg-gray-750 bg-gray-800" : "hover:bg-gray-50 bg-white"}`}>
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${cred.is_configured ? "bg-green-500" : "bg-gray-400"}`} />
                  <div className="text-left">
                    <div className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>{cred.label}</div>
                    <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{cred.description || ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${cred.is_configured
                    ? "bg-green-500/15 text-green-500"
                    : isDark ? "bg-gray-700 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                    {cred.is_configured ? "Configured" : "Not configured"}
                  </span>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    className={`transition-transform ${isOpen ? "rotate-180" : ""} ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded form */}
              {isOpen && (
                <div className={`px-5 pb-5 pt-3 border-t ${isDark ? "border-gray-700 bg-gray-900/50" : "border-gray-100 bg-gray-50/50"}`}>
                  {fields.length === 0 ? (
                    <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      No fields configured for this credential type.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {fields.map(f => (
                        <div key={f.key}>
                          <label className={`block text-xs font-medium mb-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{f.label}</label>
                          <input
                            type={f.type || "text"}
                            value={fm[f.key] || ""}
                            onChange={e => setField(cred.credential_type, f.key, e.target.value)}
                            placeholder={f.placeholder}
                            autoComplete="off"
                            className={`w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 ${inp}`}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button onClick={() => save(cred.credential_type)}
                      disabled={saving === cred.credential_type}
                      className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {saving === cred.credential_type ? "Saving…" : "Save"}
                    </button>
                    {cred.is_configured && (
                      <button onClick={() => clear(cred.credential_type)}
                        disabled={clearing === cred.credential_type}
                        className="px-4 py-1.5 text-sm font-medium text-red-400 border border-red-400/30 rounded-md hover:bg-red-500/10 disabled:opacity-50 transition-colors">
                        {clearing === cred.credential_type ? "Clearing…" : "Remove"}
                      </button>
                    )}
                    <button onClick={() => setExpanded(null)}
                      className={`px-4 py-1.5 text-sm rounded-md border transition-colors
                        ${isDark ? "border-gray-600 text-gray-400 hover:bg-gray-700" : "border-gray-300 text-gray-500 hover:bg-gray-100"}`}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
