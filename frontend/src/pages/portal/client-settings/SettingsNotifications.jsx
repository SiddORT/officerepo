import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { portalSettingsApi } from "../../../services/apiClient";

const CHANNEL_ICONS = {
  email:    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  sms:      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>,
  whatsapp: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  push:     <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  in_app:   <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
};

export default function SettingsNotifications() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const { isDark } = useTheme();

  const [channels, setChannels] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toggling, setToggling] = useState(null);
  const [error, setError]       = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await portalSettingsApi.getNotificationChannels(subdomain, token);
        setChannels(res.data || []);
      } catch { setError("Failed to load notification channels."); }
      finally { setLoading(false); }
    })();
  }, [subdomain, token]);

  const toggle = async (channel, current) => {
    setToggling(channel);
    try {
      const res = await portalSettingsApi.updateNotificationChannel(subdomain, token, channel, !current);
      setChannels(prev => prev.map(c => c.channel === channel ? { ...c, is_enabled: res.data.is_enabled } : c));
    } catch { setError("Failed to update channel."); }
    finally { setToggling(null); }
  };

  const card = isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200";

  if (loading) return <div className={`p-8 text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Loading…</div>;

  return (
    <div className="p-6 max-w-2xl">
      <h2 className={`text-xl font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Notification Management</h2>
      <p className={`text-sm mb-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Enable or disable delivery channels for workspace notifications.
      </p>

      {error && <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <div className={`border rounded-lg divide-y ${isDark ? "divide-gray-700 border-gray-700" : "divide-gray-200 border-gray-200"}`}>
        {channels.map(ch => (
          <div key={ch.channel} className={`flex items-center justify-between px-5 py-4 ${isDark ? "hover:bg-gray-750" : "hover:bg-gray-50"} transition-colors`}>
            <div className="flex items-center gap-3">
              <span className={ch.is_enabled ? "text-blue-500" : isDark ? "text-gray-500" : "text-gray-400"}>
                {CHANNEL_ICONS[ch.channel] || CHANNEL_ICONS.push}
              </span>
              <div>
                <div className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-800"}`}>{ch.label || ch.channel}</div>
                <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                  {ch.is_enabled ? "Active — delivering notifications" : "Disabled — notifications not sent"}
                </div>
              </div>
            </div>

            {/* Toggle */}
            <button
              onClick={() => toggle(ch.channel, ch.is_enabled)}
              disabled={toggling === ch.channel}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
                ${ch.is_enabled ? "bg-blue-600" : isDark ? "bg-gray-600" : "bg-gray-300"}
                ${toggling === ch.channel ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                ${ch.is_enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        ))}

        {channels.length === 0 && (
          <div className={`px-5 py-8 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            No notification channels found.
          </div>
        )}
      </div>

      <p className={`mt-4 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        * To configure provider credentials, go to Credentials &amp; Integrations.
      </p>
    </div>
  );
}
