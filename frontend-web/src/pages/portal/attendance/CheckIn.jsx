import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi, portalEmployeeApi } from "../../../services/apiClient";

const WORK_MODES = ["Onsite", "Work From Home", "Hybrid", "Remote"];

export default function CheckIn() {
  const { subdomain, token } = usePortalAuth();
  const navigate = useNavigate();

  const [shifts, setShifts]         = useState([]);
  const [employees, setEmployees]   = useState([]);
  const [empSearch, setEmpSearch]   = useState("");
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);  // today's check-in
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  const [ciForm, setCiForm] = useState({ shift_id: "", work_mode: "Onsite", notes: "" });

  const base = `/portal/${subdomain}/hrms/attendance`;

  useEffect(() => {
    portalAttendanceApi.listShifts(subdomain, token, true)
      .then(r => setShifts(r.data?.data || []))
      .catch(console.error);
  }, [subdomain, token]);

  // Employee search debounce
  useEffect(() => {
    if (empSearch.length < 2) { setEmployees([]); return; }
    const t = setTimeout(() => {
      portalEmployeeApi.listEmployees(subdomain, token, { search: empSearch, page_size: 10 })
        .then(r => setEmployees(r.data?.data?.items || []))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [empSearch, subdomain, token]);

  const selectEmployee = emp => {
    setSelectedEmp(emp);
    setEmpSearch(emp.full_name || emp.employee_code || "");
    setEmployees([]);
    // Check if already checked in today
    const today = new Date().toISOString().slice(0, 10);
    portalAttendanceApi.listRecords(subdomain, token, {
      employee_id: emp.id, from_date: today, to_date: today, page_size: 1,
    }).then(r => {
      const rec = r.data?.data?.items?.[0];
      setActiveRecord(rec && rec.check_in_time ? rec : null);
    }).catch(() => setActiveRecord(null));
  };

  const handleCheckIn = async e => {
    e.preventDefault();
    if (!selectedEmp) { setError("Select an employee first."); return; }
    setCheckingIn(true); setError(""); setSuccess("");
    try {
      await portalAttendanceApi.checkIn(subdomain, token, {
        employee_id:   selectedEmp.id,
        employee_name: selectedEmp.full_name,
        employee_code: selectedEmp.employee_code,
        shift_id:      ciForm.shift_id || undefined,
        work_mode:     ciForm.work_mode || undefined,
        notes:         ciForm.notes || undefined,
        source:        "Web Check-In",
      });
      setSuccess(`✓ ${selectedEmp.full_name} checked in successfully.`);
      setActiveRecord({ check_in_time: new Date().toISOString() });
    } catch (err) {
      setError(err.response?.data?.detail || "Check-in failed.");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEmp) { setError("Select an employee first."); return; }
    setCheckingOut(true); setError(""); setSuccess("");
    try {
      await portalAttendanceApi.checkOut(subdomain, token, {
        employee_id: selectedEmp.id,
        source:      "Web Check-In",
      });
      setSuccess(`✓ ${selectedEmp.full_name} checked out successfully.`);
      setActiveRecord(prev => ({ ...prev, check_out_time: new Date().toISOString() }));
    } catch (err) {
      setError(err.response?.data?.detail || "Check-out failed.");
    } finally {
      setCheckingOut(false);
    }
  };

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="p-6 max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => navigate(`${base}`)} className="t-muted hover:t-heading text-sm">← Back</button>
        <h1 className="text-2xl font-bold t-heading">Check-In / Check-Out</h1>
      </div>
      <p className="t-muted text-sm">{today}</p>

      {error   && <div className="bg-red-500/15 text-red-400 rounded-lg p-3 text-sm">{error}</div>}
      {success && <div className="bg-green-500/15 text-green-400 rounded-lg p-3 text-sm">{success}</div>}

      {/* Employee selector */}
      <div className="card p-5 space-y-3">
        <label className="block text-sm font-medium t-muted">Employee</label>
        <div className="relative">
          <input className="input w-full" value={empSearch} onChange={e => { setEmpSearch(e.target.value); setSelectedEmp(null); }}
            placeholder="Search by name or code…" />
          {employees.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 card border border-white/10 shadow-xl max-h-48 overflow-y-auto">
              {employees.map(e => (
                <button key={e.id} onClick={() => selectEmployee(e)}
                  className="w-full text-left px-4 py-2.5 hover:bg-white/10 transition-colors">
                  <span className="t-heading font-medium">{e.full_name}</span>
                  <span className="t-muted text-xs ml-2">{e.employee_code}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedEmp && (
          <div className="p-3 rounded-lg bg-white/5 text-sm">
            <p className="t-heading font-medium">{selectedEmp.full_name}</p>
            <p className="t-muted">{selectedEmp.employee_code} · {selectedEmp.department_name || selectedEmp.designation || ""}</p>
          </div>
        )}
      </div>

      {/* Check-In Form */}
      {selectedEmp && !activeRecord && (
        <form onSubmit={handleCheckIn} className="card p-5 space-y-4">
          <h2 className="font-semibold t-heading">Check-In Details</h2>
          <div>
            <label className="block text-sm t-muted mb-1">Shift (optional)</label>
            <select className="input w-full" value={ciForm.shift_id}
              onChange={e => setCiForm(f => ({ ...f, shift_id: e.target.value }))}>
              <option value="">Auto-detect from assignment</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.shift_name} ({s.start_time}–{s.end_time})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm t-muted mb-1">Work Mode</label>
            <select className="input w-full" value={ciForm.work_mode}
              onChange={e => setCiForm(f => ({ ...f, work_mode: e.target.value }))}>
              {WORK_MODES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm t-muted mb-1">Notes</label>
            <input className="input w-full" value={ciForm.notes}
              onChange={e => setCiForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
          </div>
          <button type="submit" disabled={checkingIn} className="btn-primary w-full py-2.5 disabled:opacity-50">
            {checkingIn ? "Checking In…" : "✓ Check In"}
          </button>
        </form>
      )}

      {/* Check-Out Panel */}
      {selectedEmp && activeRecord && activeRecord.check_in_time && !activeRecord.check_out_time && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold t-heading">Currently Checked In</h2>
          <p className="t-muted text-sm">
            Checked in at {new Date(activeRecord.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <button onClick={handleCheckOut} disabled={checkingOut} className="btn-primary w-full py-2.5 disabled:opacity-50">
            {checkingOut ? "Checking Out…" : "✓ Check Out"}
          </button>
        </div>
      )}

      {selectedEmp && activeRecord && activeRecord.check_out_time && (
        <div className="card p-5">
          <p className="t-heading font-medium">Already checked out today.</p>
          <p className="t-muted text-sm mt-1">
            In: {new Date(activeRecord.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·
            Out: {new Date(activeRecord.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <button onClick={() => navigate(`${base}/regularizations/new`)}
            className="mt-3 text-sm t-accent hover:underline">Request correction →</button>
        </div>
      )}
    </div>
  );
}
