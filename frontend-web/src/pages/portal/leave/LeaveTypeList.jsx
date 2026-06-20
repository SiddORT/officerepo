import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalLeaveApi } from "../../../services/apiClient";

const COLORS = ["#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6","#EC4899","#06B6D4","#6B7280","#14B8A6","#F97316"];

function TypeModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || {
    leave_code: "", leave_name: "", description: "", color_code: "#3B82F6",
    is_paid: true, requires_approval: true, requires_documents: false,
    allow_half_day: true, allow_negative_balance: false,
    encashment_allowed: false, carry_forward_allowed: false, is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = k => setForm(f => ({ ...f, [k]: !f[k] }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr("");
    try { await onSave(form); }
    catch (e) { setErr(e?.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  }

  const togRow = (key, label) => (
    <label key={key} className="flex items-center justify-between py-2 cursor-pointer"
      style={{ borderBottom: "1px solid var(--c-border)" }}>
      <span className="text-sm" style={{ color: "var(--c-text)" }}>{label}</span>
      <div onClick={() => toggle(key)}
        className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form[key] ? "justify-end" : "justify-start"}`}
        style={{ background: form[key] ? "var(--c-accent)" : "var(--c-border)" }}>
        <div className="w-4 h-4 rounded-full bg-white" />
      </div>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
        style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--c-heading)" }}>
          {initial ? "Edit Leave Type" : "New Leave Type"}
        </h2>
        {err && <div className="text-sm text-red-500 bg-red-50 rounded-lg p-3">{err}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Leave Code *</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none focus:ring-2"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.leave_code} onChange={e => set("leave_code", e.target.value.toUpperCase())}
                required maxLength={10} placeholder="CL" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Leave Name *</label>
              <input className="w-full rounded-lg px-3 py-2 text-sm border focus:outline-none"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                value={form.leave_name} onChange={e => set("leave_name", e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Description</label>
            <textarea rows={2} className="w-full rounded-lg px-3 py-2 text-sm border resize-none focus:outline-none"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
              value={form.description || ""} onChange={e => set("description", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--c-muted)" }}>Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button type="button" key={c}
                  onClick={() => set("color_code", c)}
                  className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                  style={{ background: c, borderColor: form.color_code === c ? "white" : "transparent",
                    boxShadow: form.color_code === c ? `0 0 0 2px ${c}` : "none" }} />
              ))}
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "var(--c-bg)" }}>
            {togRow("is_paid", "Paid Leave")}
            {togRow("requires_approval", "Requires Approval")}
            {togRow("requires_documents", "Requires Documents")}
            {togRow("allow_half_day", "Allow Half Day")}
            {togRow("allow_negative_balance", "Allow Negative Balance")}
            {togRow("encashment_allowed", "Encashment Allowed")}
            {togRow("carry_forward_allowed", "Carry Forward Allowed")}
            {togRow("is_active", "Active")}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-medium border"
              style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>
              Cancel
            </button>
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

export default function LeaveTypeList() {
  const { subdomain } = useParams();
  const { token } = usePortalAuth();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | "new" | {type obj}
  const [delId, setDelId] = useState(null);

  const load = () => {
    setLoading(true);
    portalLeaveApi.listLeaveTypes(subdomain, token)
      .then(r => setTypes(r.data?.data || r.data || []))
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [subdomain, token]);

  async function handleSave(form) {
    if (modal === "new") {
      await portalLeaveApi.createLeaveType(subdomain, token, form);
    } else {
      await portalLeaveApi.updateLeaveType(subdomain, token, modal.id, form);
    }
    setModal(null);
    load();
  }

  async function handleDelete() {
    await portalLeaveApi.deleteLeaveType(subdomain, token, delId);
    setDelId(null);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--c-heading)" }}>Leave Types</h1>
          <p className="text-sm" style={{ color: "var(--c-muted)" }}>Configure leave type definitions</p>
        </div>
        <button onClick={() => setModal("new")}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: "var(--c-accent)" }}>
          + New Type
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10" style={{ color: "var(--c-muted)" }}>Loading…</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--c-surface)", borderBottom: "1px solid var(--c-border)" }}>
                {["Code","Name","Paid","Approval","Half Day","Carry Fwd","Encash","Status",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold"
                    style={{ color: "var(--c-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {types.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-center" style={{ color: "var(--c-muted)" }}>
                  No leave types yet. Click "+ New Type" to create one.
                </td></tr>
              )}
              {types.map(t => (
                <tr key={t.id} style={{ borderBottom: "1px solid var(--c-border)" }}
                  className="hover:opacity-80 transition-opacity">
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ background: t.color_code || "#3B82F6" }}>
                      {t.leave_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--c-text)" }}>{t.leave_name}</td>
                  <td className="px-4 py-3">{t.is_paid ? "✅" : "❌"}</td>
                  <td className="px-4 py-3">{t.requires_approval ? "✅" : "❌"}</td>
                  <td className="px-4 py-3">{t.allow_half_day ? "✅" : "❌"}</td>
                  <td className="px-4 py-3">{t.carry_forward_allowed ? "✅" : "❌"}</td>
                  <td className="px-4 py-3">{t.encashment_allowed ? "✅" : "❌"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {t.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setModal(t)}
                        className="text-xs px-3 py-1 rounded-lg border hover:opacity-70"
                        style={{ borderColor: "var(--c-border)", color: "var(--c-text)" }}>Edit</button>
                      <button onClick={() => setDelId(t.id)}
                        className="text-xs px-3 py-1 rounded-lg border hover:opacity-70 text-red-500"
                        style={{ borderColor: "#FCA5A5" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <TypeModal
          initial={modal === "new" ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)} />
      )}

      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl p-6 max-w-sm w-full space-y-4"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <h3 className="font-bold" style={{ color: "var(--c-heading)" }}>Delete Leave Type?</h3>
            <p className="text-sm" style={{ color: "var(--c-muted)" }}>
              This action cannot be undone. Existing requests using this type will not be affected.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)}
                className="flex-1 py-2 rounded-xl text-sm border"
                style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>Cancel</button>
              <button onClick={handleDelete}
                className="flex-1 py-2 rounded-xl text-sm text-white bg-red-500">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
