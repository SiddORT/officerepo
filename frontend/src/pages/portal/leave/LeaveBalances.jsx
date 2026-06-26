import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalLeaveApi, portalEmployeeApi } from "../../../services/apiClient";

export default function LeaveBalances() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [searchParams] = useSearchParams();

  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(searchParams.get("employee_id") || "");
  const [year, setYear] = useState(new Date().getFullYear());
  const [balances, setBalances] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adjustModal, setAdjustModal] = useState(null);
  const [initModal, setInitModal] = useState(false);

  useEffect(() => {
    portalEmployeeApi.list(subdomain, token, { page: 1, page_size: 200 })
      .then(r => setEmployees((r.data?.data || r.data)?.items || []))
      .catch(() => {});
    portalLeaveApi.metaOptions(subdomain, token)
      .then(r => setLeaveTypes((r.data?.data || r.data)?.leave_types || []))
      .catch(() => {});
  }, [subdomain, token]);

  useEffect(() => {
    if (!selectedEmp) return;
    setLoading(true);
    portalLeaveApi.getBalances(subdomain, token, selectedEmp, year)
      .then(r => setBalances(r.data?.data || r.data || []))
      .catch(() => setBalances([]))
      .finally(() => setLoading(false));
  }, [subdomain, token, selectedEmp, year]);

  async function handleAdjust(form) {
    await portalLeaveApi.adjustBalance(subdomain, token, {
      employee_id: selectedEmp, year,
      leave_type_id: form.leave_type_id,
      adjustment: parseFloat(form.adjustment),
      reason: form.reason,
    });
    setAdjustModal(null);
    // Reload
    const r = await portalLeaveApi.getBalances(subdomain, token, selectedEmp, year);
    setBalances(r.data?.data || r.data || []);
  }

  async function handleInit(form) {
    await portalLeaveApi.initializeBalance(subdomain, token, {
      employee_id: selectedEmp,
      leave_type_id: form.leave_type_id,
      year, opening_balance: parseFloat(form.opening_balance || 0),
    });
    setInitModal(false);
    const r = await portalLeaveApi.getBalances(subdomain, token, selectedEmp, year);
    setBalances(r.data?.data || r.data || []);
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const selectedEmpObj = employees.find(e => e.id === selectedEmp);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>Leave Balances</h1>
        <p className="text-sm" style={{ color: "var(--c-muted)" }}>View and adjust employee leave balances</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Employee</label>
          <select className="w-full rounded-xl px-3 py-2 text-sm border"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
            <option value="">Select Employee</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Year</label>
          <select className="rounded-xl px-3 py-2 text-sm border"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
            value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {yearOptions.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        {selectedEmp && (
          <>
            <button onClick={() => setInitModal(true)}
              className="px-3 py-2 rounded-xl text-sm border font-medium"
              style={{ borderColor: "var(--c-border)", color: "var(--c-text)" }}>
              Initialize Balance
            </button>
            <button onClick={() => setAdjustModal({})}
              className="px-3 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--c-accent)" }}>
              Adjust Balance
            </button>
          </>
        )}
      </div>

      {selectedEmp && selectedEmpObj && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: "var(--c-accent)" }}>
            {(selectedEmpObj.first_name?.[0] || "") + (selectedEmpObj.last_name?.[0] || "")}
          </div>
          <div>
            <div className="font-semibold" style={{ color: "var(--c-heading)" }}>
              {selectedEmpObj.first_name} {selectedEmpObj.last_name}
            </div>
            <div className="text-xs" style={{ color: "var(--c-muted)" }}>
              {selectedEmpObj.employee_code} · {selectedEmpObj.department_name || ""}
            </div>
          </div>
          <div className="ml-auto text-sm font-medium" style={{ color: "var(--c-muted)" }}>{year}</div>
        </div>
      )}

      {!selectedEmp ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <p className="text-4xl mb-3">📊</p>
          <p style={{ color: "var(--c-muted)" }}>Select an employee to view their leave balances</p>
        </div>
      ) : loading ? (
        <div className="text-center py-10" style={{ color: "var(--c-muted)" }}>Loading…</div>
      ) : balances.length === 0 ? (
        <div className="rounded-xl p-10 text-center" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          <p style={{ color: "var(--c-muted)" }}>No balances found for {year}. Use "Initialize Balance" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {balances.map(b => {
            const lt = leaveTypes.find(t => t.id === b.leave_type_id);
            const pct = b.available_balance > 0
              ? Math.min(100, (b.used / (b.opening_balance + b.earned + b.carried_forward + b.adjusted)) * 100)
              : 100;
            return (
              <div key={b.id} className="rounded-xl p-5 space-y-3"
                style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ background: lt?.color_code || "#6B7280" }}>
                      {b.leave_type_code}
                    </span>
                    <span className="font-semibold text-sm" style={{ color: "var(--c-heading)" }}>
                      {b.leave_type_name}
                    </span>
                  </div>
                  <span className="text-2xl font-bold" style={{ color: "var(--c-accent)" }}>
                    {b.available_balance}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--c-border)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: lt?.color_code || "var(--c-accent)" }} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Opening", b.opening_balance],
                    ["Earned",  b.earned],
                    ["Used",    b.used],
                    ["Encashed",b.encashed],
                    ["Carry Fwd",b.carried_forward],
                    ["Adjusted",b.adjusted],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between">
                      <span style={{ color: "var(--c-muted)" }}>{label}</span>
                      <span className="font-medium" style={{ color: "var(--c-text)" }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-1 flex justify-between items-center text-xs">
                  <span style={{ color: "var(--c-muted)" }}>Available</span>
                  <span className="font-bold" style={{ color: b.available_balance > 0 ? "#10B981" : "#EF4444" }}>
                    {b.available_balance} days
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Adjust Modal */}
      {adjustModal && (
        <AdjustModal
          leaveTypes={leaveTypes}
          onSave={handleAdjust}
          onClose={() => setAdjustModal(null)} />
      )}

      {/* Initialize Modal */}
      {initModal && (
        <InitModal
          leaveTypes={leaveTypes}
          onSave={handleInit}
          onClose={() => setInitModal(false)} />
      )}
    </div>
  );
}

function AdjustModal({ leaveTypes, onSave, onClose }) {
  const [form, setForm] = useState({ leave_type_id: "", adjustment: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try { await onSave(form); }
    catch (e) { setErr(e?.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h3 className="font-bold" style={{ color: "var(--c-heading)" }}>Adjust Balance</h3>
        {err && <div className="text-sm text-red-500">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Leave Type *</label>
            <select required className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.leave_type_id} onChange={e => set("leave_type_id", e.target.value)}>
              <option value="">Select</option>
              {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.leave_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Adjustment (+ or -) *</label>
            <input type="number" step="0.5" required className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.adjustment} onChange={e => set("adjustment", e.target.value)}
              placeholder="e.g. 2 or -1" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Reason</label>
            <input className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.reason} onChange={e => set("reason", e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm border"
              style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--c-accent)" }}>
              {saving ? "Saving…" : "Adjust"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InitModal({ leaveTypes, onSave, onClose }) {
  const [form, setForm] = useState({ leave_type_id: "", opening_balance: "0" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault(); setSaving(true);
    try { await onSave(form); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h3 className="font-bold" style={{ color: "var(--c-heading)" }}>Initialize Balance</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Leave Type *</label>
            <select required className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.leave_type_id} onChange={e => set("leave_type_id", e.target.value)}>
              <option value="">Select</option>
              {leaveTypes.map(t => <option key={t.id} value={t.id}>{t.leave_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Opening Balance</label>
            <input type="number" step="0.5" className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.opening_balance} onChange={e => set("opening_balance", e.target.value)} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm border"
              style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--c-accent)" }}>
              {saving ? "…" : "Initialize"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
