import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAssetMaintenanceApi } from "../../../services/apiClient";
import AssetLayout from "./AssetLayout";

const PRIORITY_COLOR = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  High:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  Medium:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Low:      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const STATUS_COLOR = {
  Open:                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Assigned:            "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  "Under Inspection":  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Under Repair":      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Waiting For Parts": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Quality Check":     "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  Completed:           "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Closed:              "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  Cancelled:           "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
};

const WO_STATUS_COLOR = {
  Pending:     "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "In Progress":"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Completed:   "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Cancelled:   "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400",
};

const NEXT_STATUS_MAP = {
  Open:               ["Assigned", "Under Inspection", "Cancelled"],
  Assigned:           ["Under Inspection", "Waiting For Parts", "Cancelled"],
  "Under Inspection": ["Under Repair", "Waiting For Parts", "Quality Check", "Cancelled"],
  "Under Repair":     ["Quality Check", "Waiting For Parts", "Cancelled"],
  "Waiting For Parts":["Under Repair", "Under Inspection", "Cancelled"],
  "Quality Check":    ["Completed", "Under Repair"],
};

export default function MaintenanceRequestDetails() {
  const { subdomain, requestId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();

  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [meta, setMeta] = useState(null);

  // Modal states
  const [modal, setModal] = useState(null); // null | "status" | "complete" | "cancel" | "assign" | "workorder"
  const [modalData, setModalData] = useState({});
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    portalAssetMaintenanceApi.metaOptions(subdomain, token)
      .then(r => setMeta(r.data?.data || r.data)).catch(() => {});
  }, [subdomain, token]);

  const load = useCallback(() => {
    setLoading(true);
    portalAssetMaintenanceApi.get(subdomain, token, requestId)
      .then(r => setReq(r.data?.data || r.data))
      .catch(() => setError("Failed to load request."))
      .finally(() => setLoading(false));
  }, [subdomain, token, requestId]);

  useEffect(() => { load(); }, [load]);

  const openModal = (type, defaults = {}) => { setModal(type); setModalData(defaults); setActionError(""); };
  const closeModal = () => { setModal(null); setModalData({}); setActionError(""); };

  const doAction = async (apiFn, successMsg) => {
    setActing(true);
    setActionError("");
    try {
      await apiFn();
      closeModal();
      load();
    } catch (err) {
      setActionError(err.response?.data?.detail || err.response?.data?.message || "Action failed.");
    } finally {
      setActing(false);
    }
  };

  if (loading) return <AssetLayout><div className="p-10 text-center text-gray-500 dark:text-gray-400">Loading…</div></AssetLayout>;
  if (error || !req) return <AssetLayout><div className="p-10 text-center text-red-500">{error || "Not found."}</div></AssetLayout>;

  const canTransition = !!NEXT_STATUS_MAP[req.status];
  const nextStatuses  = NEXT_STATUS_MAP[req.status] || [];
  const isTerminal    = ["Completed","Closed","Cancelled"].includes(req.status);

  const LABEL = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider";
  const VALUE = "text-sm text-gray-900 dark:text-white mt-0.5";
  const Field = ({ label, value }) => (
    <div>
      <div className={LABEL}>{label}</div>
      <div className={VALUE}>{value || "—"}</div>
    </div>
  );

  const INPUT = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500";
  const MD = (k, v) => setModalData(d => ({ ...d, [k]: v }));

  return (
    <AssetLayout title={req.request_number}>
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("..")} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">←</button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{req.request_number}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[req.status]}`}>{req.status}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOR[req.priority]}`}>{req.priority}</span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {req.asset_name} · {req.maintenance_type}
            </div>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {req.status === "Open" && (
            <button onClick={() => openModal("assign")}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Assign
            </button>
          )}
          {!req.work_order_id && !isTerminal && (
            <button onClick={() => openModal("workorder")}
              className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700">
              + Work Order
            </button>
          )}
          {canTransition && nextStatuses.filter(s => s !== "Cancelled").length > 0 && (
            <button onClick={() => openModal("status", { status: nextStatuses.filter(s => s !== "Cancelled")[0] })}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Update Status
            </button>
          )}
          {["Quality Check","Under Repair","Assigned","Under Inspection"].includes(req.status) && (
            <button onClick={() => openModal("complete")}
              className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700">
              Mark Complete
            </button>
          )}
          {req.status === "Completed" && (
            <button onClick={() => doAction(() => portalAssetMaintenanceApi.close(subdomain, token, req.id), "Closed.")}
              className="px-3 py-1.5 text-xs font-medium bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              Close
            </button>
          )}
          {!isTerminal && (
            <button onClick={() => openModal("cancel")}
              className="px-3 py-1.5 text-xs font-medium border border-red-300 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1">
          {["overview","work order","activities"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                tab === t
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Request Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Asset" value={req.asset_name} />
              <Field label="Asset Number" value={req.asset_number} />
              <Field label="Category" value={req.category_name} />
              <Field label="Maintenance Type" value={req.maintenance_type} />
              <Field label="Issue Category" value={req.issue_category} />
              <Field label="Priority" value={req.priority} />
              <Field label="Reported By" value={req.reported_by_name} />
              <Field label="Reported Date" value={req.reported_date} />
              <Field label="Est. Downtime" value={req.estimated_downtime_hours ? `${req.estimated_downtime_hours}h` : null} />
              <Field label="Next Service Date" value={req.next_service_date} />
            </div>
            {req.issue_description && (
              <div>
                <div className={LABEL}>Issue Description</div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">{req.issue_description}</p>
              </div>
            )}
            {req.resolution_notes && (
              <div>
                <div className={LABEL}>Resolution Notes</div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">{req.resolution_notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Downtime card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Downtime Tracking</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Downtime Start" value={req.downtime_start?.replace("T"," ")?.slice(0,19)} />
                <Field label="Downtime End" value={req.downtime_end?.replace("T"," ")?.slice(0,19)} />
                <Field label="Total Downtime" value={req.total_downtime_hours != null ? `${req.total_downtime_hours}h` : req.downtime_start ? "In progress…" : null} />
              </div>
            </div>

            {/* Vendor card */}
            {(req.vendor_name || req.assigned_technician_name) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">Vendor / Technician</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Vendor / Technician" value={req.vendor_name || req.assigned_technician_name} />
                  <Field label="Contact" value={req.vendor_contact} />
                  <Field label="Support Contract" value={req.vendor_support_contract} />
                </div>
              </div>
            )}

            {/* Timeline dates */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Timeline</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Created" value={req.created_at?.replace("T"," ")?.slice(0,16)} />
                <Field label="Completed" value={req.completed_at?.replace("T"," ")?.slice(0,16)} />
                <Field label="Closed" value={req.closed_at?.replace("T"," ")?.slice(0,16)} />
                {req.cancelled_at && <Field label="Cancelled" value={req.cancelled_at?.replace("T"," ")?.slice(0,16)} />}
                {req.cancel_reason && <div className="col-span-2"><Field label="Cancel Reason" value={req.cancel_reason} /></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Work Order tab */}
      {tab === "work order" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {req.work_order ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{req.work_order.work_order_number}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${WO_STATUS_COLOR[req.work_order.status]}`}>
                    {req.work_order.status}
                  </span>
                </div>
                {req.work_order.status !== "Completed" && req.work_order.status !== "Cancelled" && (
                  <button onClick={() => openModal("wo_update")}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Update Work Order
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Vendor" value={req.work_order.vendor_name} />
                <Field label="Technician" value={req.work_order.assigned_technician_name} />
                <Field label="Service SLA" value={req.work_order.service_sla} />
                <Field label="Planned Start" value={req.work_order.planned_start_date} />
                <Field label="Planned End" value={req.work_order.planned_end_date} />
                <Field label="Actual Start" value={req.work_order.actual_start_date} />
                <Field label="Actual End" value={req.work_order.actual_end_date} />
                <Field label="Labor Hours" value={req.work_order.labor_hours} />
                <Field label="Currency" value={req.work_order.currency} />
              </div>
              {/* Costs */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Cost Breakdown</p>
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Labor Cost" value={req.work_order.labor_cost != null ? `₹${req.work_order.labor_cost}` : null} />
                  <Field label="Parts Cost" value={req.work_order.parts_cost != null ? `₹${req.work_order.parts_cost}` : null} />
                  <Field label="Vendor Charges" value={req.work_order.vendor_charges != null ? `₹${req.work_order.vendor_charges}` : null} />
                  <Field label="Transport Cost" value={req.work_order.transport_cost != null ? `₹${req.work_order.transport_cost}` : null} />
                  <Field label="Misc Cost" value={req.work_order.misc_cost != null ? `₹${req.work_order.misc_cost}` : null} />
                  <div>
                    <div className={LABEL}>Total Cost</div>
                    <div className="text-base font-bold text-gray-900 dark:text-white mt-0.5">
                      {req.work_order.total_cost != null ? `₹${req.work_order.total_cost}` : "—"}
                    </div>
                  </div>
                </div>
              </div>
              {req.work_order.parts_used && (
                <div>
                  <div className={LABEL}>Parts Used</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{req.work_order.parts_used}</p>
                </div>
              )}
              {req.work_order.resolution_notes && (
                <div>
                  <div className={LABEL}>Resolution Notes</div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-line">{req.work_order.resolution_notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">No work order yet.</p>
              {!isTerminal && (
                <button onClick={() => openModal("workorder")}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                  Create Work Order
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activities tab */}
      {tab === "activities" && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          {!req.activities?.length ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">No activity recorded.</div>
          ) : (
            <div className="space-y-3">
              {req.activities.map(a => (
                <div key={a.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm text-gray-800 dark:text-gray-200">{a.description || a.event}</div>
                    {(a.old_value || a.new_value) && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {a.old_value && <span className="line-through mr-1">{a.old_value}</span>}
                        {a.new_value && <span className="text-green-600 dark:text-green-400">{a.new_value}</span>}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {a.actor_name} · {a.created_at?.replace("T"," ")?.slice(0,16)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-md">

            {/* Update Status */}
            {modal === "status" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Update Status</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
                    <select value={modalData.status || ""} onChange={e => MD("status", e.target.value)} className={INPUT}>
                      {nextStatuses.filter(s => s !== "Cancelled").map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (optional)</label>
                    <textarea rows={2} value={modalData.notes || ""} onChange={e => MD("notes", e.target.value)} className={INPUT} />
                  </div>
                </div>
                {actionError && <p className="text-red-500 text-sm mt-2">{actionError}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button disabled={acting} onClick={() => doAction(() => portalAssetMaintenanceApi.updateStatus(subdomain, token, req.id, { status: modalData.status, notes: modalData.notes }))}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {acting ? "Saving…" : "Update"}
                  </button>
                </div>
              </>
            )}

            {/* Assign */}
            {modal === "assign" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assign Request</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Technician Name</label>
                    <input type="text" value={modalData.assigned_technician_name || ""} onChange={e => MD("assigned_technician_name", e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor Name</label>
                    <input type="text" value={modalData.vendor_name || ""} onChange={e => MD("vendor_name", e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor Contact</label>
                    <input type="text" value={modalData.vendor_contact || ""} onChange={e => MD("vendor_contact", e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support Contract</label>
                    <input type="text" value={modalData.vendor_support_contract || ""} onChange={e => MD("vendor_support_contract", e.target.value)} className={INPUT} />
                  </div>
                </div>
                {actionError && <p className="text-red-500 text-sm mt-2">{actionError}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button disabled={acting} onClick={() => doAction(() => portalAssetMaintenanceApi.assign(subdomain, token, req.id, modalData))}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
                    {acting ? "Assigning…" : "Assign"}
                  </button>
                </div>
              </>
            )}

            {/* Complete */}
            {modal === "complete" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Mark as Completed</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution Notes</label>
                    <textarea rows={3} value={modalData.resolution_notes || ""} onChange={e => MD("resolution_notes", e.target.value)} placeholder="Describe what was done…" className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Next Service Date (optional)</label>
                    <input type="date" value={modalData.next_service_date || ""} onChange={e => MD("next_service_date", e.target.value)} className={INPUT} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Completing will update the asset status back to Available/Assigned and record actual downtime.</p>
                {actionError && <p className="text-red-500 text-sm mt-2">{actionError}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button disabled={acting} onClick={() => doAction(() => portalAssetMaintenanceApi.complete(subdomain, token, req.id, modalData))}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                    {acting ? "Completing…" : "Complete"}
                  </button>
                </div>
              </>
            )}

            {/* Cancel */}
            {modal === "cancel" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cancel Request</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason <span className="text-red-500">*</span></label>
                  <textarea rows={3} value={modalData.reason || ""} onChange={e => MD("reason", e.target.value)} placeholder="Reason for cancellation…" className={INPUT} />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Asset will be restored to its previous status.</p>
                {actionError && <p className="text-red-500 text-sm mt-2">{actionError}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Back</button>
                  <button disabled={acting || !modalData.reason} onClick={() => doAction(() => portalAssetMaintenanceApi.cancel(subdomain, token, req.id, { reason: modalData.reason }))}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                    {acting ? "Cancelling…" : "Cancel Request"}
                  </button>
                </div>
              </>
            )}

            {/* Create Work Order */}
            {modal === "workorder" && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Work Order</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {[
                    ["vendor_name","Vendor Name","text"],
                    ["vendor_contact","Vendor Contact","text"],
                    ["vendor_support_contract","Support Contract","text"],
                    ["service_sla","Service SLA","text"],
                    ["assigned_technician_name","Technician Name","text"],
                    ["planned_start_date","Planned Start","date"],
                    ["planned_end_date","Planned End","date"],
                    ["actual_start_date","Actual Start","date"],
                    ["actual_end_date","Actual End","date"],
                    ["labor_hours","Labor Hours","number"],
                    ["labor_cost","Labor Cost","number"],
                    ["parts_cost","Parts Cost","number"],
                    ["vendor_charges","Vendor Charges","number"],
                    ["transport_cost","Transport Cost","number"],
                    ["misc_cost","Misc Cost","number"],
                  ].map(([key, label, type]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{label}</label>
                      <input type={type} value={modalData[key] || ""} onChange={e => MD(key, e.target.value)}
                        min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined}
                        className={INPUT} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Parts Used</label>
                    <textarea rows={2} value={modalData.parts_used || ""} onChange={e => MD("parts_used", e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Resolution Notes</label>
                    <textarea rows={2} value={modalData.resolution_notes || ""} onChange={e => MD("resolution_notes", e.target.value)} className={INPUT} />
                  </div>
                </div>
                {actionError && <p className="text-red-500 text-sm mt-2">{actionError}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button disabled={acting} onClick={() => doAction(() => portalAssetMaintenanceApi.createWorkOrder(subdomain, token, req.id, modalData))}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50">
                    {acting ? "Creating…" : "Create"}
                  </button>
                </div>
              </>
            )}

            {/* Update Work Order */}
            {modal === "wo_update" && req.work_order && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Update Work Order</h3>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {[
                    ["actual_start_date","Actual Start","date"],
                    ["actual_end_date","Actual End","date"],
                    ["labor_hours","Labor Hours","number"],
                    ["labor_cost","Labor Cost","number"],
                    ["parts_cost","Parts Cost","number"],
                    ["vendor_charges","Vendor Charges","number"],
                    ["transport_cost","Transport Cost","number"],
                    ["misc_cost","Misc Cost","number"],
                  ].map(([key, label, type]) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{label}</label>
                      <input type={type} value={modalData[key] ?? req.work_order[key] ?? ""}
                        onChange={e => MD(key, e.target.value)}
                        min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined}
                        className={INPUT} />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Status</label>
                    <select value={modalData.status || req.work_order.status} onChange={e => MD("status", e.target.value)} className={INPUT}>
                      {["Pending","In Progress","Completed","Cancelled"].map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Parts Used</label>
                    <textarea rows={2} value={modalData.parts_used ?? req.work_order.parts_used ?? ""} onChange={e => MD("parts_used", e.target.value)} className={INPUT} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">Resolution Notes</label>
                    <textarea rows={2} value={modalData.resolution_notes ?? req.work_order.resolution_notes ?? ""} onChange={e => MD("resolution_notes", e.target.value)} className={INPUT} />
                  </div>
                </div>
                {actionError && <p className="text-red-500 text-sm mt-2">{actionError}</p>}
                <div className="flex gap-3 mt-4">
                  <button onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                  <button disabled={acting} onClick={() => doAction(() => portalAssetMaintenanceApi.updateWorkOrder(subdomain, token, req.work_order.id, { ...req.work_order, ...modalData }))}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                    {acting ? "Saving…" : "Save"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    </AssetLayout>
  );
}
