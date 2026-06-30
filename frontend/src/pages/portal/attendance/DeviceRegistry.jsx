import React, { useEffect, useState, useCallback } from "react";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi } from "../../../services/apiClient";
import { EditIconBtn, DeleteIconBtn } from "../../../components/ui/ActionIcons";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

const VENDORS = ["eSSL", "ZKTeco", "Matrix", "Suprema", "FingerTec", "Other"];
const SYNC_METHODS = ["REST API", "Device SDK", "Webhook", "File Import", "Scheduled Sync"];

const STATUS_COLORS = {
  Active:   "bg-green-500/15 text-green-400",
  Inactive: "bg-gray-500/15 text-gray-400",
  Error:    "bg-red-500/15 text-red-400",
};

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium t-muted mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
    {children}
  </div>
);

export default function DeviceRegistry() {
  const { subdomain, token } = usePortalAuth();
  const [devices, setDevices]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]         = useState({ device_name: "", vendor: "ZKTeco", device_identifier: "", branch_name: "", ip_address: "", sync_method: "REST API", sync_frequency_mins: 60, notes: "" });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [syncMsg, setSyncMsg]   = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    portalAttendanceApi.listDevices(subdomain, token)
      .then(r => setDevices(r.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  useEffect(() => { load(); }, [load]);

  const openNew  = () => { setForm({ device_name: "", vendor: "ZKTeco", device_identifier: "", branch_name: "", ip_address: "", sync_method: "REST API", sync_frequency_mins: 60, notes: "" }); setEditItem(null); setShowForm(true); setError(""); };
  const openEdit = d => { setForm({ device_name: d.device_name, vendor: d.vendor, device_identifier: d.device_identifier || "", branch_name: d.branch_name || "", ip_address: d.ip_address || "", sync_method: d.sync_method || "REST API", sync_frequency_mins: d.sync_frequency_mins || 60, notes: d.notes || "" }); setEditItem(d); setShowForm(true); setError(""); };

  const handleSubmit = async e => {
    e.preventDefault(); setSaving(true); setError("");
    try {
      if (editItem) await portalAttendanceApi.updateDevice(subdomain, token, editItem.id, form);
      else          await portalAttendanceApi.createDevice(subdomain, token, form);
      setShowForm(false); load();
    } catch (err) { setError(err.response?.data?.detail || "Save failed."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try { await portalAttendanceApi.deleteDevice(subdomain, token, id); load(); }
    catch (e) { setError(e.response?.data?.detail || "Delete failed."); }
  };

  const handleSync = async id => {
    setSyncMsg(m => ({ ...m, [id]: "triggering…" }));
    try {
      await portalAttendanceApi.triggerSync(subdomain, token, id);
    } catch (e) {
      const msg = e.response?.status === 501 ? "Coming Soon" : (e.response?.data?.detail || "Failed");
      setSyncMsg(m => ({ ...m, [id]: msg }));
      setTimeout(() => setSyncMsg(m => { const n = { ...m }; delete n[id]; return n; }), 3000);
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold t-heading">Biometric Device Registry</h1>
          <p className="t-muted text-sm mt-0.5">Register devices now — sync integration coming soon.</p>
        </div>
        <button onClick={openNew} className="btn-primary text-sm px-4 py-2">+ Register Device</button>
      </div>

      {/* Coming Soon banner */}
      <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 flex items-start gap-3">
        <div className="text-2xl">🔬</div>
        <div>
          <p className="font-semibold text-cyan-400 text-sm">Biometric Sync — Coming Soon</p>
          <p className="t-muted text-xs mt-1">
            Real-time sync with eSSL, ZKTeco, Matrix, and other biometric devices is under development.
            You can register your devices now to be ready when it launches.
          </p>
        </div>
      </div>

      {error && <div className="bg-red-500/15 text-red-400 rounded-lg p-3 text-sm">{error}</div>}

      {/* Form */}
      {showForm && (
        <div className="card p-6">
          <h2 className="font-semibold t-heading mb-4">{editItem ? "Edit Device" : "Register Device"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Device Name" required>
                <input required className="input w-full" value={form.device_name} onChange={e => set("device_name", e.target.value)} />
              </Field>
              <Field label="Vendor" required>
                <select className="input w-full" value={form.vendor} onChange={e => set("vendor", e.target.value)}>
                  {VENDORS.map(v => <option key={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="Device Identifier / Serial">
                <input className="input w-full" value={form.device_identifier} onChange={e => set("device_identifier", e.target.value)} placeholder="SN12345" />
              </Field>
              <Field label="Branch / Location">
                <input className="input w-full" value={form.branch_name} onChange={e => set("branch_name", e.target.value)} placeholder="Head Office" />
              </Field>
              <Field label="IP Address">
                <input className="input w-full" value={form.ip_address} onChange={e => set("ip_address", e.target.value)} placeholder="192.168.1.100" />
              </Field>
              <Field label="Sync Method">
                <select className="input w-full" value={form.sync_method} onChange={e => set("sync_method", e.target.value)}>
                  {SYNC_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </Field>
              <Field label="Sync Frequency (mins)">
                <input type="number" min="5" className="input w-full" value={form.sync_frequency_mins}
                  onChange={e => set("sync_frequency_mins", parseInt(e.target.value))} />
              </Field>
            </div>
            <Field label="Notes">
              <input className="input w-full" value={form.notes} onChange={e => set("notes", e.target.value)} />
            </Field>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2 disabled:opacity-50">
                {saving ? "Saving…" : editItem ? "Save Changes" : "Register"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary px-5 py-2">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Remove Device"
        message={`Remove device "${confirmDelete?.name}"? This cannot be undone.`}
        confirmLabel="Remove"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Device list */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center t-muted">Loading devices…</div>
        ) : devices.length === 0 ? (
          <div className="p-8 text-center t-muted">No devices registered yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Device","Vendor","Location","IP","Sync Method","Status",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left t-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <p className="t-heading font-medium">{d.device_name}</p>
                    <p className="t-muted text-xs">{d.device_identifier}</p>
                  </td>
                  <td className="px-4 py-3 t-muted">{d.vendor}</td>
                  <td className="px-4 py-3 t-muted">{d.branch_name || "—"}</td>
                  <td className="px-4 py-3 t-muted font-mono text-xs">{d.ip_address || "—"}</td>
                  <td className="px-4 py-3 t-muted">{d.sync_method || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[d.status] || "bg-gray-500/15 text-gray-400"}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <EditIconBtn onClick={() => openEdit(d)} title="Edit device" />
                      <button onClick={() => handleSync(d.id)}
                        title="Biometric sync coming soon"
                        className="text-xs text-yellow-400 hover:underline">
                        {syncMsg[d.id] || "Sync"}
                      </button>
                      <DeleteIconBtn onClick={() => setConfirmDelete({ id: d.id, name: d.device_name })} title="Remove device" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
