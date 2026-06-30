import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi } from "../../../services/apiClient";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";

export default function ShiftList() {
  const { subdomain, token } = usePortalAuth();
  const navigate = useNavigate();
  const [shifts, setShifts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [error, setError]     = useState("");

  // Confirm dialog
  const [confirmDlg, setConfirmDlg] = useState({ open: false, title: "", message: "", fn: null, loading: false });
  const askConfirm = (title, message, fn) => setConfirmDlg({ open: true, title, message, fn, loading: false });
  const closeConfirm = () => setConfirmDlg(d => ({ ...d, open: false, fn: null }));
  const runConfirm = async () => {
    if (!confirmDlg.fn) return;
    setConfirmDlg(d => ({ ...d, loading: true }));
    try { await confirmDlg.fn(); } finally { setConfirmDlg(d => ({ ...d, open: false, loading: false, fn: null })); }
  };

  const base = `/portal/${subdomain}/hrms/attendance`;

  const load = useCallback(() => {
    setLoading(true);
    portalAttendanceApi.listShifts(subdomain, token)
      .then(r => setShifts(r.data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subdomain, token]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (id, name) => {
    askConfirm("Delete Shift", `Delete shift "${name}"? This cannot be undone.`, async () => {
      setDeleting(id);
      try {
        await portalAttendanceApi.deleteShift(subdomain, token, id);
        setShifts(prev => prev.filter(s => s.id !== id));
      } catch (e) {
        setError(e.response?.data?.detail || "Delete failed.");
      } finally {
        setDeleting(null);
      }
    });
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold t-heading">Shifts</h1>
        <button onClick={() => navigate(`${base}/shifts/new`)} className="btn-primary text-sm px-4 py-2">
          + New Shift
        </button>
      </div>

      {error && <div className="bg-red-500/15 text-red-400 rounded-lg p-3 text-sm">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center t-muted">Loading shifts…</div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center t-muted">
            No shifts defined yet.
            <br />
            <button onClick={() => navigate(`${base}/shifts/new`)} className="mt-3 btn-primary text-sm px-4 py-2">
              Create First Shift
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {["Shift","Code","Type","Start","End","Hours","Status",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left t-muted font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 t-heading font-medium">{s.shift_name}</td>
                  <td className="px-4 py-3 t-muted font-mono text-xs">{s.shift_code}</td>
                  <td className="px-4 py-3 t-muted">{s.shift_type}</td>
                  <td className="px-4 py-3 t-muted">{s.start_time}</td>
                  <td className="px-4 py-3 t-muted">{s.end_time}{s.is_cross_day && <span className="ml-1 text-xs text-yellow-400">+1</span>}</td>
                  <td className="px-4 py-3 t-muted">{s.min_working_hours}h</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`${base}/shifts/${s.id}/edit`)}
                        className="text-xs t-accent hover:underline">Edit</button>
                      <button onClick={() => handleDelete(s.id, s.shift_name)}
                        disabled={deleting === s.id}
                        className="text-xs text-red-400 hover:underline disabled:opacity-40">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <ConfirmDialog
        open={confirmDlg.open}
        title={confirmDlg.title}
        message={confirmDlg.message}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={confirmDlg.loading}
        onConfirm={runConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
