import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalLeaveApi, portalEmployeeApi } from "../../../services/apiClient";

const STATUS_COLORS = {
  "Pending":  "bg-yellow-100 text-yellow-700",
  "Approved": "bg-green-100 text-green-700",
  "Rejected": "bg-red-100 text-red-700",
  "Expired":  "bg-gray-100 text-gray-500",
};

function NewCompOffModal({ employees, onSave, onClose }) {
  const [form, setForm] = useState({
    employee_id: "", employee_name: "", employee_code: "",
    worked_date: "", source: "Weekend Work", reason: "",
    days_earned: "1", expiry_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function onEmpChange(id) {
    const e = employees.find(x => x.id === id);
    setForm(f => ({
      ...f, employee_id: id,
      employee_name: e ? `${e.first_name} ${e.last_name}`.trim() : "",
      employee_code: e?.employee_code || "",
    }));
  }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr("");
    try {
      await onSave({ ...form, days_earned: parseFloat(form.days_earned), expiry_date: form.expiry_date || null });
    } catch (e) { setErr(e?.response?.data?.detail || "Failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>Request Comp Off</h2>
        {err && <div className="text-sm text-red-500 bg-red-50 rounded p-2">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Employee *</label>
            <select required className="w-full rounded-lg px-3 py-2 text-sm border"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.employee_id} onChange={e => onEmpChange(e.target.value)}>
              <option value="">Select</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Worked Date *</label>
              <input type="date" required className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.worked_date} onChange={e => set("worked_date", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Source</label>
              <select className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.source} onChange={e => set("source", e.target.value)}>
                <option>Weekend Work</option>
                <option>Holiday Work</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Days Earned</label>
              <input type="number" step="0.5" min="0.5" className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.days_earned} onChange={e => set("days_earned", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Expiry Date</label>
              <input type="date" className="w-full rounded-lg px-3 py-2 text-sm border"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.expiry_date} onChange={e => set("expiry_date", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Reason</label>
            <textarea rows={2} className="w-full rounded-lg px-3 py-2 text-sm border resize-none"
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
              {saving ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CompOffList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [modal, setModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(1);

  const load = () => {
    setLoading(true);
    const p = { page, page_size: 20 };
    if (filterStatus) p.status = filterStatus;
    portalLeaveApi.listCompOffs(subdomain, token, p)
      .then(r => setData(r.data?.data || r.data || { items: [], total: 0 }))
      .catch(() => setData({ items: [], total: 0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    portalEmployeeApi.list(subdomain, token, { page: 1, page_size: 200 })
      .then(r => setEmployees((r.data?.data || r.data)?.items || []))
      .catch(() => {});
  }, [subdomain, token]);

  useEffect(load, [subdomain, token, filterStatus, page]);

  async function reviewCompOff(id, status) {
    await portalLeaveApi.reviewCompOff(subdomain, token, id, { status });
    load();
  }

  async function handleNew(form) {
    await portalLeaveApi.createCompOff(subdomain, token, form);
    setModal(false);
    load();
  }

  const STATUSES = ["", "Pending", "Approved", "Rejected", "Expired"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>Comp Off Management</h1>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>Manage compensatory offs for weekend / holiday work</p>
        </div>
        <button onClick={() => setModal(true)}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "var(--c-accent)" }}>
          + Request Comp Off
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUSES.map(s => (
          <button key={s || "all"}
            onClick={() => { setFilterStatus(s); setPage(1); }}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={{
              background: filterStatus === s ? "var(--c-accent)" : "transparent",
              border: `1px solid ${filterStatus === s ? "var(--c-accent)" : "var(--c-border)"}`,
              color: filterStatus === s ? "white" : "var(--c-muted)",
            }}>
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: "var(--c-muted)" }}>Loading…</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
                {["Employee","Worked Date","Source","Days Earned","Available","Expiry","Status",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--c-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data.items?.length && (
                <tr><td colSpan={8} className="px-4 py-10 text-center" style={{ color: "var(--c-muted)" }}>
                  No comp off records found
                </td></tr>
              )}
              {data.items?.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--c-border)" }}>
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: "var(--c-text)" }}>{c.employee_name}</div>
                    <div className="text-xs" style={{ color: "var(--c-muted)" }}>{c.employee_code}</div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--c-text)" }}>
                    {new Date(c.worked_date + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--c-muted)" }}>{c.source}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--c-text)" }}>{c.days_earned}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: c.available > 0 ? "#10B981" : "#6B7280" }}>
                    {c.available}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--c-muted)" }}>
                    {c.expiry_date || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.status === "Pending" && (
                      <div className="flex gap-1">
                        <button onClick={() => reviewCompOff(c.id, "Approved")}
                          className="text-xs px-2 py-1 rounded-lg font-medium text-white bg-green-600 hover:bg-green-700">
                          ✓
                        </button>
                        <button onClick={() => reviewCompOff(c.id, "Rejected")}
                          className="text-xs px-2 py-1 rounded-lg text-white bg-red-500 hover:bg-red-600">
                          ✕
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.total > 20 && (
        <div className="flex gap-2 justify-end">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40"
            style={{ borderColor: "var(--c-border)", color: "var(--c-text)" }}>Prev</button>
          <button disabled={page >= Math.ceil(data.total / 20)} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40"
            style={{ borderColor: "var(--c-border)", color: "var(--c-text)" }}>Next</button>
        </div>
      )}

      {modal && <NewCompOffModal employees={employees} onSave={handleNew} onClose={() => setModal(false)} />}
    </div>
  );
}
