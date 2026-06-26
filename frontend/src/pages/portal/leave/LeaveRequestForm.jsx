import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalLeaveApi, portalEmployeeApi } from "../../../services/apiClient";

export default function LeaveRequestForm() {
  const { subdomain } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { token, user } = usePortalAuth();

  const [form, setForm] = useState({
    employee_id: search.get("employee_id") || user?.employee_id || "",
    employee_name: "",
    employee_code: "",
    department_id: "",
    department_name: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    is_half_day: false,
    half_day_option: "First Half",
    reason: "",
  });
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [calculatedDays, setCalculatedDays] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    portalLeaveApi.metaOptions(subdomain, token)
      .then(r => setLeaveTypes((r.data?.data || r.data)?.leave_types || []))
      .catch(() => {});
    portalEmployeeApi.list(subdomain, token, { page: 1, page_size: 100 })
      .then(r => setEmployees((r.data?.data || r.data)?.items || []))
      .catch(() => {});
  }, [subdomain, token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Calculate leave days preview
  useEffect(() => {
    if (!form.start_date || !form.end_date) { setCalculatedDays(null); return; }
    if (form.is_half_day) { setCalculatedDays(0.5); return; }
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    if (end < start) { setCalculatedDays(0); return; }
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) days++;
      cur.setDate(cur.getDate() + 1);
    }
    setCalculatedDays(days);
  }, [form.start_date, form.end_date, form.is_half_day]);

  function onEmployeeChange(empId) {
    const emp = employees.find(e => e.id === empId);
    setForm(f => ({
      ...f,
      employee_id: empId,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}`.trim() : "",
      employee_code: emp?.employee_code || "",
      department_id: emp?.department_id || "",
      department_name: emp?.department_name || "",
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.employee_id) return setError("Please select an employee");
    if (!form.leave_type_id) return setError("Please select a leave type");
    if (!form.start_date || !form.end_date) return setError("Please select dates");
    if (form.end_date < form.start_date) return setError("End date must be on or after start date");
    setSaving(true); setError("");
    try {
      await portalLeaveApi.applyLeave(subdomain, token, {
        ...form,
        start_date: form.start_date,
        end_date: form.end_date,
      });
      navigate(`/portal/${subdomain}/hrms/leave/requests`);
    } catch (e) {
      setError(e?.response?.data?.detail || "Failed to submit leave request");
    } finally {
      setSaving(false);
    }
  }

  const selectedType = leaveTypes.find(t => t.id === form.leave_type_id);

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>Apply Leave</h1>
        <p className="text-sm" style={{ color: "var(--c-muted)" }}>Submit a new leave request</p>
      </div>

      {error && <div className="text-sm text-red-500 bg-red-50 rounded-xl p-3">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl p-6"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>

        {/* Employee */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Employee *</label>
          <select className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
            style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            value={form.employee_id} onChange={e => onEmployeeChange(e.target.value)} required>
            <option value="">Select Employee</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
            ))}
          </select>
        </div>

        {/* Leave Type */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Leave Type *</label>
          <select className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
            style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            value={form.leave_type_id} onChange={e => set("leave_type_id", e.target.value)} required>
            <option value="">Select Leave Type</option>
            {leaveTypes.map(t => (
              <option key={t.id} value={t.id}>{t.leave_name} ({t.leave_code})</option>
            ))}
          </select>
          {selectedType && (
            <div className="mt-1 flex gap-3 text-xs" style={{ color: "var(--c-muted)" }}>
              {selectedType.is_paid && <span className="text-green-600">✓ Paid</span>}
              {selectedType.allow_half_day && <span className="text-blue-600">✓ Half Day Allowed</span>}
              {selectedType.carry_forward_allowed && <span className="text-purple-600">✓ Carry Forward</span>}
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Start Date *</label>
            <input type="date" className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.start_date} onChange={e => {
                set("start_date", e.target.value);
                if (!form.end_date || form.end_date < e.target.value) set("end_date", e.target.value);
              }} required />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>End Date *</label>
            <input type="date" className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.end_date} min={form.start_date} onChange={e => set("end_date", e.target.value)} required />
          </div>
        </div>

        {/* Leave days preview */}
        {calculatedDays !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: "var(--c-accent)11", border: "1px solid var(--c-accent)44" }}>
            <span className="text-sm font-medium" style={{ color: "var(--c-accent)" }}>
              {calculatedDays} working day{calculatedDays !== 1 ? "s" : ""} (approx., excluding weekends)
            </span>
          </div>
        )}

        {/* Half Day */}
        {selectedType?.allow_half_day && form.start_date === form.end_date && form.start_date && (
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_half_day}
                onChange={e => set("is_half_day", e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm" style={{ color: "var(--c-text)" }}>Half Day Leave</span>
            </label>
            {form.is_half_day && (
              <select className="rounded-lg px-3 py-1.5 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.half_day_option} onChange={e => set("half_day_option", e.target.value)}>
                <option>First Half</option>
                <option>Second Half</option>
              </select>
            )}
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Reason</label>
          <textarea rows={3} className="w-full rounded-lg px-3 py-2 text-sm border resize-none focus:outline-none"
            style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            value={form.reason} onChange={e => set("reason", e.target.value)}
            placeholder="Briefly describe the reason for leave…" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
            style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "var(--c-accent)" }}>
            {saving ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}
