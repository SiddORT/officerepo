import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import { portalAttendanceApi, portalEmployeeApi } from "../../../services/apiClient";

const LOCATION_OPTIONS = [
  { value: "Office",          label: "Office",          icon: "🏢", desc: "Working from office premises" },
  { value: "Work From Home",  label: "Work From Home",  icon: "🏠", desc: "Working remotely from home" },
  { value: "Client Site",     label: "Client Site",     icon: "📍", desc: "Working at a client's location" },
  { value: "Remote",          label: "Remote",          icon: "🌐", desc: "Working from another remote location" },
];

const WORK_MODES = ["Onsite", "Work From Home", "Hybrid", "Remote"];

const DAYS_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const LOC_COLOR = {
  "Office":         "bg-blue-500/20 text-blue-400",
  "Work From Home": "bg-green-500/20 text-green-400",
  "Client Site":    "bg-purple-500/20 text-purple-400",
  "Remote":         "bg-orange-500/20 text-orange-400",
};

const LOC_CODE = {
  "Office":         "OFC",
  "Work From Home": "WFH",
  "Client Site":    "CS",
  "Remote":         "RMT",
};

export default function CheckIn() {
  const { subdomain, token } = usePortalAuth();
  const navigate = useNavigate();

  const [shifts, setShifts]             = useState([]);
  const [employees, setEmployees]       = useState([]);
  const [empSearch, setEmpSearch]       = useState("");
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);
  const [checkingIn, setCheckingIn]     = useState(false);
  const [checkingOut, setCheckingOut]   = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");

  const [locationType, setLocationType] = useState("Office");
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [scheduleWarn, setScheduleWarn] = useState("");
  const [ciForm, setCiForm] = useState({ shift_id: "", work_mode: "Onsite", notes: "" });

  const base = `/portal/${subdomain}/hrms/attendance`;

  useEffect(() => {
    portalAttendanceApi.listShifts(subdomain, token, true)
      .then(r => setShifts(r.data?.data || []))
      .catch(console.error);
  }, [subdomain, token]);

  useEffect(() => {
    if (empSearch.length < 2) { setEmployees([]); return; }
    if (selectedEmp && empSearch === (selectedEmp.full_name || "")) { setEmployees([]); return; }
    const t = setTimeout(() => {
      portalEmployeeApi.listEmployees(subdomain, token, { search: empSearch, page_size: 10 })
        .then(r => setEmployees(r.data?.data?.items || []))
        .catch(console.error);
    }, 300);
    return () => clearTimeout(t);
  }, [empSearch, subdomain, token, selectedEmp]);

  const loadEmployeeData = emp => {
    const today = new Date().toISOString().slice(0, 10);
    portalAttendanceApi.listRecords(subdomain, token, {
      employee_id: emp.id, from_date: today, to_date: today, page_size: 1,
    }).then(r => {
      const rec = r.data?.data?.items?.[0];
      setActiveRecord(rec && rec.check_in_time ? rec : null);
    }).catch(() => setActiveRecord(null));

    portalAttendanceApi.getEmployeeSchedule(subdomain, token, emp.id)
      .then(r => {
        const sched = r.data?.data?.schedule || [];
        setScheduleEntries(sched);
        const todayName = DAYS_FULL[new Date().getDay()];
        const entry = sched.find(e => e.weekday === todayName && e.expected_location_type);
        if (entry) {
          setLocationType(entry.expected_location_type);
        } else {
          setLocationType("Office");
        }
      })
      .catch(() => { setScheduleEntries([]); setLocationType("Office"); });
  };

  const selectEmployee = emp => {
    setSelectedEmp(emp);
    setEmpSearch(emp.full_name || emp.employee_code || "");
    setEmployees([]);
    setError(""); setSuccess("");
    loadEmployeeData(emp);
  };

  // Warn when overriding schedule
  useEffect(() => {
    if (!scheduleEntries.length || !selectedEmp) { setScheduleWarn(""); return; }
    const todayName = DAYS_FULL[new Date().getDay()];
    const entry = scheduleEntries.find(e => e.weekday === todayName && e.expected_location_type);
    if (entry && entry.expected_location_type !== locationType) {
      setScheduleWarn(`Your scheduled location for today is "${entry.expected_location_type}". You're overriding it.`);
    } else {
      setScheduleWarn("");
    }
  }, [locationType, scheduleEntries, selectedEmp]);

  const handleCheckIn = async e => {
    e.preventDefault();
    if (!selectedEmp) { setError("Select an employee first."); return; }
    setCheckingIn(true); setError(""); setSuccess("");
    try {
      const result = await portalAttendanceApi.checkIn(subdomain, token, {
        employee_id:        selectedEmp.id,
        employee_name:      selectedEmp.full_name,
        employee_code:      selectedEmp.employee_code,
        shift_id:           ciForm.shift_id || undefined,
        work_mode:          ciForm.work_mode || undefined,
        location_type:      locationType,
        work_mode_snapshot: selectedEmp.work_mode || ciForm.work_mode || null,
        source:             "Web Check-In",
        notes:              ciForm.notes || undefined,
        device_info:        JSON.stringify({
          user_agent: navigator.userAgent.slice(0, 200),
          platform:   navigator.platform || "web",
        }),
      });
      const rec = result.data?.data;
      setSuccess(`✓ ${selectedEmp.full_name} checked in — ${locationType}`);
      setActiveRecord(rec || { check_in_time: new Date().toISOString(), location_type: locationType });
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
        record_id:   activeRecord?.id,
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
        <button onClick={() => navigate(base)} className="t-muted hover:t-heading text-sm">← Back</button>
        <h1 className="text-2xl font-bold t-heading">Check-In / Check-Out</h1>
      </div>
      <p className="t-muted text-sm">{today}</p>

      {error   && <div className="bg-red-500/15 text-red-400 rounded-lg p-3 text-sm">{error}</div>}
      {success && <div className="bg-green-500/15 text-green-400 rounded-lg p-3 text-sm">{success}</div>}

      {/* Employee selector */}
      <div className="card p-5 space-y-3">
        <label className="block text-sm font-medium t-muted">Employee</label>
        <div className="relative">
          <input className="input w-full" value={empSearch}
            onChange={e => { setEmpSearch(e.target.value); setSelectedEmp(null); setActiveRecord(null); setScheduleEntries([]); }}
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
            <p className="t-muted">{selectedEmp.employee_code} · {selectedEmp.department_name || selectedEmp.designation_name || ""}</p>
          </div>
        )}
      </div>

      {/* Check-In Form */}
      {selectedEmp && !activeRecord && (
        <form onSubmit={handleCheckIn} className="card p-5 space-y-4">
          <h2 className="font-semibold t-heading">Check-In Details</h2>

          {/* Location type selector */}
          <div>
            <label className="block text-sm t-muted mb-2">Where are you working today?</label>
            <div className="grid grid-cols-2 gap-2.5">
              {LOCATION_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setLocationType(opt.value)}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all
                    ${locationType === opt.value
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-white/10 hover:border-white/20 hover:bg-white/5"
                    }`}>
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <p className={`text-xs font-semibold ${locationType === opt.value ? "text-cyan-400" : "t-heading"}`}>
                      {opt.label}
                    </p>
                    <p className="text-[10px] t-muted mt-0.5 leading-snug">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {scheduleWarn && (
              <div className="mt-2 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/25 rounded-lg p-2.5 text-[11px] text-yellow-400">
                <span>⚠️</span>
                <span>{scheduleWarn}</span>
              </div>
            )}
          </div>

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
          <button type="submit" disabled={checkingIn}
            className="btn-primary w-full py-2.5 disabled:opacity-50">
            {checkingIn ? "Checking In…" : `${LOCATION_OPTIONS.find(l => l.value === locationType)?.icon} Check In — ${locationType}`}
          </button>
        </form>
      )}

      {/* Currently checked in */}
      {selectedEmp && activeRecord && activeRecord.check_in_time && !activeRecord.check_out_time && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold t-heading">Currently Checked In</h2>
            {activeRecord.location_type && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LOC_COLOR[activeRecord.location_type] || "bg-white/10 t-muted"}`}>
                {LOCATION_OPTIONS.find(l => l.value === activeRecord.location_type)?.icon} {activeRecord.location_type}
              </span>
            )}
          </div>
          <p className="t-muted text-sm">
            Checked in at {new Date(activeRecord.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <button onClick={handleCheckOut} disabled={checkingOut}
            className="btn-primary w-full py-2.5 disabled:opacity-50">
            {checkingOut ? "Checking Out…" : "✓ Check Out"}
          </button>
        </div>
      )}

      {selectedEmp && activeRecord && activeRecord.check_out_time && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="t-heading font-medium">Shift complete for today</p>
            {activeRecord.location_type && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LOC_COLOR[activeRecord.location_type] || "bg-white/10 t-muted"}`}>
                {LOCATION_OPTIONS.find(l => l.value === activeRecord.location_type)?.icon} {activeRecord.location_type}
              </span>
            )}
          </div>
          <p className="t-muted text-sm">
            In: {new Date(activeRecord.check_in_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·
            Out: {new Date(activeRecord.check_out_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {activeRecord.productive_hours != null ? ` · ${activeRecord.productive_hours}h worked` : ""}
          </p>
          <button onClick={() => navigate(`${base}/regularizations/new`)}
            className="mt-3 text-sm t-accent hover:underline">Request correction →</button>
        </div>
      )}

      {/* Weekly schedule summary */}
      {selectedEmp && scheduleEntries.length > 0 && (
        <div className="card p-4">
          <p className="text-xs font-semibold t-muted uppercase tracking-wide mb-3">Weekly Schedule</p>
          <div className="grid grid-cols-7 gap-1">
            {DAYS_FULL.map((day, i) => {
              const entry = scheduleEntries.find(e => e.weekday === day);
              const isToday = new Date().getDay() === i;
              const loc = entry?.expected_location_type;
              return (
                <div key={day} className={`rounded-lg p-1.5 text-center ${isToday ? "ring-1 ring-cyan-500" : ""}`}>
                  <p className={`text-[10px] font-medium mb-1 ${isToday ? "text-cyan-400" : "t-muted"}`}>
                    {DAYS_SHORT[i]}
                  </p>
                  {loc ? (
                    <div className={`rounded text-[9px] font-bold px-0.5 py-0.5 ${LOC_COLOR[loc] || "bg-white/10 t-muted"}`}>
                      {LOC_CODE[loc] || "?"}
                    </div>
                  ) : (
                    <div className="rounded text-[9px] t-muted bg-white/5 py-0.5">—</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
