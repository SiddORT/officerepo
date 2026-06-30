import React, { useEffect, useState, useCallback } from "react";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi } from "../../../services/apiClient";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

const Field = ({ label, required, children, hint }) => (
  <div>
    <label className="block text-sm font-medium t-muted mb-1">
      {label}{required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs t-muted mt-0.5">{hint}</p>}
  </div>
);

const defaultForm = () => ({
  policy_name: "", scope: "", scope_id: "", scope_name: "",
  grace_period_mins: 15, min_working_hours: 8.0, half_day_hours: 4.0,
  late_mark_after_mins: 30, ot_threshold_hours: 9.0,
  allow_regularization: true, max_regularization_per_month: 3,
  work_days: "Mon,Tue,Wed,Thu,Fri",
  wfh_allowed: true, max_wfh_days_per_month: 10,
  require_wfh_approval: false, allow_hybrid_override: true,
  description: "",
});

export default function PolicyList() {
  const { subdomain, token } = usePortalAuth();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState(defaultForm());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const load = useCallback(() => {
    setLoading(true);
    portalAttendanceApi.listPolicies(subdomain, token)
      .then(r => setPolicies(r.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm(defaultForm()); setEditItem(null); setShowForm(true); setError(""); };
  const openEdit = p => {
    setForm({
      policy_name:              p.policy_name || "",
      scope:                    p.scope || "",
      scope_id:                 p.scope_id || "",
      scope_name:               p.scope_name || "",
      grace_period_mins:        p.grace_period_mins ?? 15,
      min_working_hours:        p.min_working_hours ?? 8.0,
      half_day_hours:           p.half_day_hours ?? 4.0,
      late_mark_after_mins:     p.late_mark_after_mins ?? 30,
      ot_threshold_hours:       p.ot_threshold_hours ?? 9.0,
      allow_regularization:     p.allow_regularization ?? true,
      max_regularization_per_month: p.max_regularization_per_month ?? 3,
      work_days:                p.work_days || "Mon,Tue,Wed,Thu,Fri",
      wfh_allowed:              p.wfh_allowed ?? true,
      max_wfh_days_per_month:   p.max_wfh_days_per_month ?? 10,
      require_wfh_approval:     p.require_wfh_approval ?? false,
      allow_hybrid_override:    p.allow_hybrid_override ?? true,
      description:              p.description || "",
    });
    setEditItem(p); setShowForm(true); setError("");
  };

  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      await portalAttendanceApi.deletePolicy(subdomain, token, id);
      load();
    } catch (e) { setError(e.response?.data?.detail || "Delete failed."); }
  };

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (editItem) await portalAttendanceApi.updatePolicy(subdomain, token, editItem.id, form);
      else          await portalAttendanceApi.createPolicy(subdomain, token, form);
      setShowForm(false); load();
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed.");
    } finally { setSaving(false); }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold t-heading">Attendance Policies</h1>
        <button onClick={openNew} className="btn-primary text-sm px-4 py-2">+ New Policy</button>
      </div>

      {error && <div className="bg-red-500/15 text-red-400 rounded-lg p-3 text-sm">{error}</div>}

      {/* Inline Form */}
      {showForm && (
        <div className="card p-6">
          <h2 className="font-semibold t-heading mb-5">{editItem ? "Edit Policy" : "New Policy"}</h2>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Basic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Policy Name" required>
                <input required className="input w-full" value={form.policy_name}
                  onChange={e => set("policy_name", e.target.value)} />
              </Field>
              <Field label="Work Days">
                <input className="input w-full" value={form.work_days}
                  onChange={e => set("work_days", e.target.value)} placeholder="Mon,Tue,Wed,Thu,Fri" />
              </Field>
              <Field label="Grace Period (mins)">
                <input type="number" min="0" className="input w-full" value={form.grace_period_mins}
                  onChange={e => set("grace_period_mins", parseInt(e.target.value))} />
              </Field>
              <Field label="Min Working Hours">
                <input type="number" step="0.5" className="input w-full" value={form.min_working_hours}
                  onChange={e => set("min_working_hours", parseFloat(e.target.value))} />
              </Field>
              <Field label="Half-Day Hours">
                <input type="number" step="0.5" className="input w-full" value={form.half_day_hours}
                  onChange={e => set("half_day_hours", parseFloat(e.target.value))} />
              </Field>
              <Field label="Late Mark After (mins)">
                <input type="number" min="0" className="input w-full" value={form.late_mark_after_mins}
                  onChange={e => set("late_mark_after_mins", parseInt(e.target.value))} />
              </Field>
              <Field label="OT Threshold (hours)">
                <input type="number" step="0.5" className="input w-full" value={form.ot_threshold_hours}
                  onChange={e => set("ot_threshold_hours", parseFloat(e.target.value))} />
              </Field>
              <Field label="Max Regularizations/Month">
                <input type="number" min="0" className="input w-full" value={form.max_regularization_per_month}
                  onChange={e => set("max_regularization_per_month", parseInt(e.target.value))} />
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="allow_reg" checked={form.allow_regularization}
                onChange={e => set("allow_regularization", e.target.checked)} className="w-4 h-4" />
              <label htmlFor="allow_reg" className="text-sm t-muted">Allow attendance regularization</label>
            </div>

            {/* WFH Settings */}
            <div className="border-t border-white/10 pt-5">
              <h3 className="text-sm font-semibold t-heading mb-4 flex items-center gap-2">
                🏠 Work From Home Settings
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="wfh_allowed" checked={form.wfh_allowed}
                    onChange={e => set("wfh_allowed", e.target.checked)} className="w-4 h-4" />
                  <label htmlFor="wfh_allowed" className="text-sm t-muted">Allow WFH for employees under this policy</label>
                </div>

                {form.wfh_allowed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-6">
                    <Field label="Max WFH Days / Month" hint="0 = unlimited">
                      <input type="number" min="0" max="31" className="input w-full"
                        value={form.max_wfh_days_per_month}
                        onChange={e => set("max_wfh_days_per_month", parseInt(e.target.value))} />
                    </Field>
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="req_wfh_approval" checked={form.require_wfh_approval}
                          onChange={e => set("require_wfh_approval", e.target.checked)} className="w-4 h-4" />
                        <label htmlFor="req_wfh_approval" className="text-sm t-muted">Require manager approval for WFH</label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="hybrid_override" checked={form.allow_hybrid_override}
                          onChange={e => set("allow_hybrid_override", e.target.checked)} className="w-4 h-4" />
                        <label htmlFor="hybrid_override" className="text-sm t-muted">Allow hybrid employees to override daily location</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Field label="Description">
              <textarea rows={2} className="input w-full" value={form.description}
                onChange={e => set("description", e.target.value)} />
            </Field>

            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2 disabled:opacity-50">
                {saving ? "Saving…" : editItem ? "Save Changes" : "Create Policy"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-5 py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center t-muted">Loading policies…</div>
        ) : policies.length === 0 ? (
          <div className="p-8 text-center t-muted">No policies defined yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Policy","Min Hours","Grace","Work Days","WFH","Regularization","Status",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left t-muted font-medium text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policies.map(p => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 t-heading font-medium">{p.policy_name}</td>
                  <td className="px-4 py-3 t-muted">{p.min_working_hours}h</td>
                  <td className="px-4 py-3 t-muted">{p.grace_period_mins}m</td>
                  <td className="px-4 py-3 t-muted text-xs">{p.work_days}</td>
                  <td className="px-4 py-3">
                    {p.wfh_allowed ? (
                      <span className="text-green-400 text-xs font-medium">
                        ✓{p.max_wfh_days_per_month ? ` ${p.max_wfh_days_per_month}d/mo` : " Unlimited"}
                      </span>
                    ) : (
                      <span className="text-red-400 text-xs">✗ Not allowed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 t-muted text-xs">
                    {p.allow_regularization ? `Yes (max ${p.max_regularization_per_month}/mo)` : "No"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.is_active ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <EditIconBtn onClick={() => openEdit(p)} title="Edit policy" />
                      <DeleteIconBtn onClick={() => setConfirmDelete({ id: p.id, name: p.policy_name })} title="Delete policy" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Policy"
        message={`Delete "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
