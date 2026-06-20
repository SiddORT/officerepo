import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi } from "../../../services/apiClient";

const SHIFT_TYPES = ["General", "Morning", "Evening", "Night", "Rotational", "Flexible"];

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium t-muted mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
  </div>
);

export default function ShiftForm({ editMode = false }) {
  const { subdomain, token } = usePortalAuth();
  const { shiftId } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    shift_name: "", shift_code: "", shift_type: "General",
    start_time: "09:00", end_time: "18:00",
    is_cross_day: false, break_duration_mins: 60,
    grace_period_mins: 15, min_working_hours: 8.0,
    description: "", is_active: true,
  });
  const [loading, setLoading] = useState(editMode);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const base = `/portal/${subdomain}/hrms/attendance`;

  useEffect(() => {
    if (!editMode || !shiftId) return;
    portalAttendanceApi.getShift(subdomain, token, shiftId)
      .then(r => {
        const d = r.data?.data;
        if (d) setForm({
          shift_name: d.shift_name || "", shift_code: d.shift_code || "",
          shift_type: d.shift_type || "General",
          start_time: d.start_time || "09:00", end_time: d.end_time || "18:00",
          is_cross_day: d.is_cross_day || false,
          break_duration_mins: d.break_duration_mins ?? 60,
          grace_period_mins: d.grace_period_mins ?? 15,
          min_working_hours: d.min_working_hours ?? 8.0,
          description: d.description || "",
          is_active: d.is_active ?? true,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [editMode, shiftId, subdomain, token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      if (editMode) {
        await portalAttendanceApi.updateShift(subdomain, token, shiftId, form);
      } else {
        await portalAttendanceApi.createShift(subdomain, token, form);
      }
      navigate(`${base}/shifts`);
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 t-muted">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(`${base}/shifts`)} className="t-muted hover:t-heading text-sm">← Back</button>
        <h1 className="text-2xl font-bold t-heading">{editMode ? "Edit Shift" : "New Shift"}</h1>
      </div>

      {error && <div className="bg-red-500/15 text-red-400 rounded-lg p-3 text-sm mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Shift Name" required>
            <input required className="input w-full" value={form.shift_name}
              onChange={e => set("shift_name", e.target.value)} placeholder="Morning General" />
          </Field>
          <Field label="Shift Code" required>
            <input required className="input w-full" value={form.shift_code}
              onChange={e => set("shift_code", e.target.value.toUpperCase())} placeholder="GEN-M" />
          </Field>
          <Field label="Shift Type" required>
            <select className="input w-full" value={form.shift_type} onChange={e => set("shift_type", e.target.value)}>
              {SHIFT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Min Working Hours">
            <input type="number" step="0.5" min="1" max="24" className="input w-full" value={form.min_working_hours}
              onChange={e => set("min_working_hours", parseFloat(e.target.value))} />
          </Field>
          <Field label="Start Time" required>
            <input type="time" required className="input w-full" value={form.start_time}
              onChange={e => set("start_time", e.target.value)} />
          </Field>
          <Field label="End Time" required>
            <input type="time" required className="input w-full" value={form.end_time}
              onChange={e => set("end_time", e.target.value)} />
          </Field>
          <Field label="Break Duration (mins)">
            <input type="number" min="0" className="input w-full" value={form.break_duration_mins}
              onChange={e => set("break_duration_mins", parseInt(e.target.value))} />
          </Field>
          <Field label="Grace Period (mins)">
            <input type="number" min="0" className="input w-full" value={form.grace_period_mins}
              onChange={e => set("grace_period_mins", parseInt(e.target.value))} />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="cross_day" checked={form.is_cross_day}
            onChange={e => set("is_cross_day", e.target.checked)} className="w-4 h-4" />
          <label htmlFor="cross_day" className="text-sm t-muted">Shift crosses midnight (end time is next day)</label>
        </div>

        {editMode && (
          <div className="flex items-center gap-3">
            <input type="checkbox" id="active" checked={form.is_active}
              onChange={e => set("is_active", e.target.checked)} className="w-4 h-4" />
            <label htmlFor="active" className="text-sm t-muted">Active</label>
          </div>
        )}

        <Field label="Description">
          <textarea rows={2} className="input w-full" value={form.description}
            onChange={e => set("description", e.target.value)} placeholder="Optional notes…" />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary px-5 py-2 disabled:opacity-50">
            {saving ? "Saving…" : editMode ? "Save Changes" : "Create Shift"}
          </button>
          <button type="button" onClick={() => navigate(`${base}/shifts`)} className="btn-secondary px-5 py-2">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
