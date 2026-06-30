import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalLeaveApi } from "../../../services/apiClient";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

function PolicyModal({ initial, leaveTypes, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    policy_name: "", description: "", scope: "Global",
    scope_name: "", employee_category: "", effective_from: "",
    effective_to: "", approval_levels: 1,
  });
  const [rules, setRules] = useState(
    initial?.rules?.map(r => ({
      leave_type_id: r.leave_type_id,
      allocation_type: r.allocation_type || "Fixed",
      days_per_year: r.days_per_year ?? "",
      accrual_frequency: r.accrual_frequency || "Monthly",
      accrual_days: r.accrual_days ?? "",
      max_balance: r.max_balance ?? "",
      max_consecutive_days: r.max_consecutive_days ?? "",
      min_notice_period_days: r.min_notice_period_days ?? 0,
      carry_forward_max_days: r.carry_forward_max_days ?? "",
      probation_restricted: r.probation_restricted || false,
    })) || []
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addRule() {
    if (!leaveTypes.length) return;
    const existing = rules.map(r => r.leave_type_id);
    const avail = leaveTypes.find(t => !existing.includes(t.id));
    if (!avail) return;
    setRules(r => [...r, {
      leave_type_id: avail.id, allocation_type: "Fixed",
      days_per_year: "", accrual_frequency: "Monthly", accrual_days: "",
      max_balance: "", max_consecutive_days: "", min_notice_period_days: 0,
      carry_forward_max_days: "", probation_restricted: false,
    }]);
  }

  function setRule(idx, k, v) {
    setRules(rs => rs.map((r, i) => i === idx ? { ...r, [k]: v } : r));
  }

  const [confirmRemoveRuleIdx, setConfirmRemoveRuleIdx] = useState(null);
  function removeRule(idx) {
    setRules(rs => rs.filter((_, i) => i !== idx));
    setConfirmRemoveRuleIdx(null);
  }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      await onSave({
        ...form,
        approval_levels: parseInt(form.approval_levels) || 1,
        effective_from: form.effective_from || null,
        effective_to: form.effective_to || null,
        rules: rules.map(r => ({
          ...r,
          days_per_year: r.days_per_year !== "" ? parseFloat(r.days_per_year) : null,
          accrual_days: r.accrual_days !== "" ? parseFloat(r.accrual_days) : null,
          max_balance: r.max_balance !== "" ? parseFloat(r.max_balance) : null,
          max_consecutive_days: r.max_consecutive_days !== "" ? parseInt(r.max_consecutive_days) : null,
          carry_forward_max_days: r.carry_forward_max_days !== "" ? parseFloat(r.carry_forward_max_days) : null,
          min_notice_period_days: parseInt(r.min_notice_period_days) || 0,
        })),
      });
    } catch (e) { setErr(e?.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  }

  const SCOPES = ["Global", "Company", "Branch", "Department", "Employee Category"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>
          {initial ? "Edit Policy" : "New Leave Policy"}
        </h2>
        {err && <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{err}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Policy Name *</label>
            <input required className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.policy_name} onChange={e => set("policy_name", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Scope</label>
              <select className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.scope} onChange={e => set("scope", e.target.value)}>
                {SCOPES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Approval Levels</label>
              <input type="number" min={1} max={5} className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.approval_levels} onChange={e => set("approval_levels", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Effective From</label>
              <input type="date" className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.effective_from || ""} onChange={e => set("effective_from", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Effective To</label>
              <input type="date" className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.effective_to || ""} onChange={e => set("effective_to", e.target.value)} />
            </div>
          </div>

          {/* Leave Type Rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold" style={{ color: "var(--c-heading)" }}>Leave Type Rules</h3>
              <button type="button" onClick={addRule}
                className="text-xs px-3 py-1.5 rounded-lg text-white"
                style={{ background: "var(--c-accent)" }}>+ Add Rule</button>
            </div>
            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div key={idx} className="rounded-xl p-4 space-y-3"
                  style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                  <div className="flex items-center justify-between">
                    <select className="rounded-lg px-3 py-1.5 text-sm border"
                      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                      value={rule.leave_type_id} onChange={e => setRule(idx, "leave_type_id", e.target.value)}>
                      {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.leave_name}</option>)}
                    </select>
                    <DeleteIconBtn onClick={() => setConfirmRemoveRuleIdx(idx)} title="Remove rule" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label style={{ color: "var(--c-muted)" }}>Allocation Type</label>
                      <select className="mt-1 w-full rounded-lg px-2 py-1.5 border text-sm"
                        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                        value={rule.allocation_type} onChange={e => setRule(idx, "allocation_type", e.target.value)}>
                        {["Fixed","Accrual","Pro-Rated"].map(a => <option key={a}>{a}</option>)}
                      </select>
                    </div>
                    {rule.allocation_type === "Fixed" ? (
                      <div>
                        <label style={{ color: "var(--c-muted)" }}>Days / Year</label>
                        <input type="number" step="0.5" className="mt-1 w-full rounded-lg px-2 py-1.5 border text-sm"
                          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                          value={rule.days_per_year} onChange={e => setRule(idx, "days_per_year", e.target.value)}
                          placeholder="e.g. 12" />
                      </div>
                    ) : (
                      <div>
                        <label style={{ color: "var(--c-muted)" }}>Days / Period</label>
                        <input type="number" step="0.5" className="mt-1 w-full rounded-lg px-2 py-1.5 border text-sm"
                          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                          value={rule.accrual_days} onChange={e => setRule(idx, "accrual_days", e.target.value)}
                          placeholder="e.g. 1.5" />
                      </div>
                    )}
                    <div>
                      <label style={{ color: "var(--c-muted)" }}>Max Balance</label>
                      <input type="number" step="0.5" className="mt-1 w-full rounded-lg px-2 py-1.5 border text-sm"
                        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                        value={rule.max_balance} onChange={e => setRule(idx, "max_balance", e.target.value)}
                        placeholder="Optional" />
                    </div>
                    <div>
                      <label style={{ color: "var(--c-muted)" }}>Carry Fwd Max Days</label>
                      <input type="number" step="0.5" className="mt-1 w-full rounded-lg px-2 py-1.5 border text-sm"
                        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                        value={rule.carry_forward_max_days} onChange={e => setRule(idx, "carry_forward_max_days", e.target.value)}
                        placeholder="Optional" />
                    </div>
                  </div>
                </div>
              ))}
              {rules.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: "var(--c-muted)" }}>
                  No rules yet. Click "+ Add Rule" to configure leave allocations.
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm border"
              style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--c-accent)" }}>
              {saving ? "Saving…" : "Save Policy"}
            </button>
          </div>
        </form>
      </div>
      <ConfirmDialog
        open={confirmRemoveRuleIdx !== null}
        title="Remove Rule"
        message="Remove this leave rule from the policy?"
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={() => removeRule(confirmRemoveRuleIdx)}
        onCancel={() => setConfirmRemoveRuleIdx(null)}
      />
    </div>
  );
}

export default function LeavePolicyList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [policies, setPolicies] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      portalLeaveApi.listPolicies(subdomain, token),
      portalLeaveApi.metaOptions(subdomain, token),
    ]).then(([pr, mr]) => {
      setPolicies(pr.data?.data || pr.data || []);
      setLeaveTypes((mr.data?.data || mr.data)?.leave_types || []);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, [subdomain, token]);

  async function handleSave(form) {
    if (modal === "new") await portalLeaveApi.createPolicy(subdomain, token, form);
    else await portalLeaveApi.updatePolicy(subdomain, token, modal.id, form);
    setModal(null); load();
  }

  async function doDeletePolicy() {
    if (!confirmDelete) return;
    const id = confirmDelete;
    setConfirmDelete(null);
    await portalLeaveApi.deletePolicy(subdomain, token, id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>Leave Policies</h1>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>Configure leave allocation rules by scope</p>
        </div>
        <button onClick={() => setModal("new")}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "var(--c-accent)" }}>
          + New Policy
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: "var(--c-muted)" }}>Loading…</div>
      ) : (
        <div className="space-y-3">
          {policies.length === 0 && (
            <div className="rounded-xl p-10 text-center"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <p style={{ color: "var(--c-muted)" }}>No policies yet. Create one to define leave allocation rules.</p>
            </div>
          )}
          {policies.map(p => (
            <div key={p.id} className="rounded-xl p-5"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold" style={{ color: "var(--c-heading)" }}>{p.policy_name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700">{p.scope}</span>
                  </div>
                  <div className="text-xs mb-3" style={{ color: "var(--c-muted)" }}>
                    {p.employee_category && <span className="mr-2">Category: {p.employee_category}</span>}
                    {p.effective_from && <span className="mr-2">From: {p.effective_from}</span>}
                    {p.effective_to && <span>To: {p.effective_to}</span>}
                    <span>· {p.approval_levels} approval level{p.approval_levels !== 1 ? "s" : ""}</span>
                  </div>
                  {p.rules?.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {p.rules.map(r => {
                        const lt = leaveTypes.find(t => t.id === r.leave_type_id);
                        return lt ? (
                          <span key={r.id} className="px-2 py-1 rounded-lg text-xs text-white"
                            style={{ background: lt.color_code || "#6B7280" }}>
                            {lt.leave_name}: {r.days_per_year || r.accrual_days || "—"}d
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 ml-4 items-center">
                  <EditIconBtn onClick={() => setModal(p)} title="Edit policy" />
                  <DeleteIconBtn onClick={() => setConfirmDelete(p.id)} title="Delete policy" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <PolicyModal
          initial={modal === "new" ? null : modal}
          leaveTypes={leaveTypes}
          onSave={handleSave}
          onClose={() => setModal(null)} />
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Policy"
        message="Delete this leave policy? This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={doDeletePolicy}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
