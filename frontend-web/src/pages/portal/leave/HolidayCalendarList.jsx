import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalLeaveApi } from "../../../services/apiClient";

const HOLIDAY_TYPE_COLORS = {
  "National":       "bg-blue-100 text-blue-700",
  "Regional":       "bg-purple-100 text-purple-700",
  "Company Holiday":"bg-green-100 text-green-700",
};

function CalendarModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    calendar_name: "", country: "", state: "", description: "",
    year: new Date().getFullYear(),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try { await onSave(form); }
    catch (e) { setErr(e?.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>
          {initial ? "Edit Calendar" : "New Holiday Calendar"}
        </h2>
        {err && <div className="text-sm text-red-500 bg-red-50 rounded p-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Calendar Name *</label>
            <input required className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.calendar_name} onChange={e => set("calendar_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Country</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.country || ""} onChange={e => set("country", e.target.value)} placeholder="e.g. India" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>State</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.state || ""} onChange={e => set("state", e.target.value)} placeholder="e.g. Maharashtra" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Year</label>
            <input type="number" className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.year || ""} onChange={e => set("year", parseInt(e.target.value) || null)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Description</label>
            <textarea rows={2} className="w-full rounded-lg px-3 py-2 text-sm border resize-none"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.description || ""} onChange={e => set("description", e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm border"
              style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--c-accent)" }}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HolidayModal({ calendarId, onSave, onClose }) {
  const [form, setForm] = useState({
    holiday_name: "", holiday_date: "", holiday_type: "Company Holiday",
    description: "", is_recurring: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try { await onSave(form); }
    catch (e) { setErr(e?.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>Add Holiday</h2>
        {err && <div className="text-sm text-red-500 bg-red-50 rounded p-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Holiday Name *</label>
            <input required className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.holiday_name} onChange={e => set("holiday_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Date *</label>
              <input type="date" required className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.holiday_date} onChange={e => set("holiday_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Type</label>
              <select className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.holiday_type} onChange={e => set("holiday_type", e.target.value)}>
                {["National","Regional","Company Holiday"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_recurring}
              onChange={e => set("is_recurring", e.target.checked)} />
            <span className="text-sm" style={{ color: "var(--c-text)" }}>Recurring annually</span>
          </label>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm border"
              style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--c-accent)" }}>
              {saving ? "Adding…" : "Add Holiday"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HolidayCalendarList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [holidays, setHolidays] = useState({});
  const [modal, setModal] = useState(null);
  const [holidayModal, setHolidayModal] = useState(null);

  const load = () => {
    setLoading(true);
    portalLeaveApi.listCalendars(subdomain, token)
      .then(r => setCalendars(r.data?.data || r.data || []))
      .catch(() => setCalendars([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [subdomain, token]);

  async function loadHolidays(calId) {
    if (holidays[calId]) return;
    const r = await portalLeaveApi.listHolidays(subdomain, token, calId);
    setHolidays(h => ({ ...h, [calId]: r.data?.data || r.data || [] }));
  }

  function toggleExpand(calId) {
    const next = expanded === calId ? null : calId;
    setExpanded(next);
    if (next) loadHolidays(next);
  }

  async function handleCalSave(form) {
    if (modal === "new") await portalLeaveApi.createCalendar(subdomain, token, form);
    else await portalLeaveApi.updateCalendar(subdomain, token, modal.id, form);
    setModal(null); load();
  }

  async function handleHolidaySave(form) {
    await portalLeaveApi.addHoliday(subdomain, token, holidayModal, form);
    setHolidayModal(null);
    setHolidays(h => ({ ...h, [holidayModal]: undefined }));
    await loadHolidays(holidayModal);
    setHolidays(h => ({ ...h }));
  }

  async function deleteHoliday(calId, hId) {
    await portalLeaveApi.deleteHoliday(subdomain, token, calId, hId);
    setHolidays(h => ({ ...h, [calId]: (h[calId] || []).filter(x => x.id !== hId) }));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>Holiday Calendars</h1>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>Manage holiday schedules by company or region</p>
        </div>
        <button onClick={() => setModal("new")}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "var(--c-accent)" }}>
          + New Calendar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: "var(--c-muted)" }}>Loading…</div>
      ) : (
        <div className="space-y-3">
          {calendars.length === 0 && (
            <div className="rounded-xl p-10 text-center" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <p style={{ color: "var(--c-muted)" }}>No holiday calendars yet. Create one to get started.</p>
            </div>
          )}
          {calendars.map(cal => (
            <div key={cal.id} className="rounded-xl overflow-hidden"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-center justify-between px-5 py-4 cursor-pointer"
                onClick={() => toggleExpand(cal.id)}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">📅</span>
                  <div>
                    <div className="font-semibold" style={{ color: "var(--c-heading)" }}>{cal.calendar_name}</div>
                    <div className="text-xs" style={{ color: "var(--c-muted)" }}>
                      {[cal.country, cal.state, cal.year].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); setModal(cal); }}
                    className="text-xs px-3 py-1 rounded-lg border hover:opacity-70"
                    style={{ borderColor: "var(--c-border)", color: "var(--c-text)" }}>Edit</button>
                  <button onClick={e => { e.stopPropagation(); setHolidayModal(cal.id); }}
                    className="text-xs px-3 py-1 rounded-lg text-white hover:opacity-80"
                    style={{ background: "var(--c-accent)" }}>+ Holiday</button>
                  <span style={{ color: "var(--c-muted)" }}>{expanded === cal.id ? "▲" : "▼"}</span>
                </div>
              </div>
              {expanded === cal.id && (
                <div style={{ borderTop: "1px solid var(--c-border)" }}>
                  {!holidays[cal.id] ? (
                    <div className="px-5 py-4 text-sm" style={{ color: "var(--c-muted)" }}>Loading holidays…</div>
                  ) : holidays[cal.id].length === 0 ? (
                    <div className="px-5 py-4 text-sm" style={{ color: "var(--c-muted)" }}>
                      No holidays added. Click "+ Holiday" to add one.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: "var(--c-bg)" }}>
                          {["Name","Date","Type","Recurring",""].map(h => (
                            <th key={h} className="px-5 py-2 text-left text-xs font-semibold" style={{ color: "var(--c-muted)" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {holidays[cal.id].map(h => (
                          <tr key={h.id} style={{ borderTop: "1px solid var(--c-border)" }}>
                            <td className="px-5 py-3 font-medium" style={{ color: "var(--c-text)" }}>{h.holiday_name}</td>
                            <td className="px-5 py-3 text-xs" style={{ color: "var(--c-muted)" }}>
                              {new Date(h.holiday_date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${HOLIDAY_TYPE_COLORS[h.holiday_type] || "bg-gray-100 text-gray-600"}`}>
                                {h.holiday_type}
                              </span>
                            </td>
                            <td className="px-5 py-3">{h.is_recurring ? "🔄 Yes" : "—"}</td>
                            <td className="px-5 py-3">
                              <button onClick={() => deleteHoliday(cal.id, h.id)}
                                className="text-xs text-red-500 hover:underline">Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && <CalendarModal initial={modal === "new" ? null : modal} onSave={handleCalSave} onClose={() => setModal(null)} />}
      {holidayModal && <HolidayModal calendarId={holidayModal} onSave={handleHolidaySave} onClose={() => setHolidayModal(null)} />}
    </div>
  );
}
