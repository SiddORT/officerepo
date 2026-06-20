import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { portalEmpDocApi, portalEmployeeApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";
import PageHeader from "../shared/PageHeader";

export default function EmployeeDocForm() {
  const { subdomain, docId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const editMode = Boolean(docId);
  const fileRef = useRef();

  const [form, setForm] = useState({ employee_id: "", document_type_id: "", document_number: "", issue_date: "", expiry_date: "", issuing_authority: "", remarks: "" });
  const [employees, setEmployees] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    portalEmpDocApi.listTypes(subdomain, token, { active_only: true }).then(r => setDocTypes(r.data?.data?.items || [])).catch(() => {});
    portalEmployeeApi.list(subdomain, token, { page_size: 500 }).then(r => setEmployees(r.data?.data?.items || [])).catch(() => {});
    if (editMode && docId) {
      portalEmpDocApi.get(subdomain, token, docId).then(r => {
        const d = r.data?.data || {};
        setForm({
          employee_id: d.employee_id || "",
          document_type_id: d.document_type_id || "",
          document_number: d.document_number || "",
          issue_date: d.issue_date || "",
          expiry_date: d.expiry_date || "",
          issuing_authority: d.issuing_authority || "",
          remarks: d.remarks || "",
        });
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (form.document_type_id) {
      const t = docTypes.find(x => x.id === form.document_type_id);
      setSelectedType(t || null);
    } else {
      setSelectedType(null);
    }
  }, [form.document_type_id, docTypes]);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleFile = (f) => {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png", "docx"].includes(ext)) { setError("Allowed: PDF, JPG, PNG, DOCX"); return; }
    if (f.size > 20 * 1024 * 1024) { setError("File too large. Max 20 MB."); return; }
    setFile(f); setError("");
  };

  const submit = async () => {
    if (!form.employee_id) { setError("Employee is required."); return; }
    if (!form.document_type_id) { setError("Document type is required."); return; }
    setSaving(true); setError("");
    try {
      if (editMode) {
        await portalEmpDocApi.update(subdomain, token, docId, {
          document_number: form.document_number || null,
          issue_date: form.issue_date || null,
          expiry_date: form.expiry_date || null,
          issuing_authority: form.issuing_authority || null,
          remarks: form.remarks || null,
        });
        navigate(`/portal/${subdomain}/employee-documents/${docId}`);
      } else {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
        const emp = employees.find(e => e.id === form.employee_id);
        if (emp) {
          fd.append("employee_code", emp.employee_code || "");
          fd.append("employee_name", [emp.first_name, emp.last_name].filter(Boolean).join(" "));
        }
        if (file) fd.append("file", file);
        const r = await portalEmpDocApi.upload(subdomain, token, fd);
        const newId = r.data?.data?.id;
        navigate(newId ? `/portal/${subdomain}/employee-documents/${newId}` : `/portal/${subdomain}/employee-documents`);
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save.");
    } finally { setSaving(false); }
  };

  const grouped = docTypes.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <PortalLayout title={editMode ? "Edit Document" : "Upload Document"}>
      <PageHeader
        title={editMode ? "Edit Document" : "Upload Document"}
        subtitle={editMode ? "Update document details" : "Upload a new document for an employee"}
        breadcrumbs={[
          { label: "Employee Documents", path: `/portal/${subdomain}/employee-documents` },
          { label: editMode ? "Edit" : "New" }
        ]}
      />

      {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="portal-form-card">
          <div className="portal-form-title">Document Information</div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label portal-form-label-req">Employee</label>
              <select value={form.employee_id} onChange={f("employee_id")} className="input-field" disabled={editMode}>
                <option value="">Select Employee</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(" ")} {e.employee_code ? `(${e.employee_code})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="portal-form-label portal-form-label-req">Document Type</label>
              <select value={form.document_type_id} onChange={f("document_type_id")} className="input-field" disabled={editMode}>
                <option value="">Select Type</option>
                {Object.entries(grouped).map(([cat, types]) => (
                  <optgroup key={cat} label={cat}>
                    {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </optgroup>
                ))}
              </select>
              {selectedType && (
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {selectedType.expiry_tracking && <span className="badge-warning" style={{fontSize:10}}>Expiry Tracked</span>}
                  {selectedType.verification_required && <span className="badge-info" style={{fontSize:10}}>Verification Required</span>}
                  {selectedType.mandatory_onboarding && <span className="badge-active" style={{fontSize:10}}>Mandatory</span>}
                </div>
              )}
            </div>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Document Number</label>
              <input value={form.document_number} onChange={f("document_number")} placeholder="e.g. A1234567" className="input-field" />
            </div>
            <div>
              <label className="portal-form-label">Issuing Authority</label>
              <input value={form.issuing_authority} onChange={f("issuing_authority")} placeholder="e.g. Government of India" className="input-field" />
            </div>
          </div>
          <div className="portal-form-row">
            <div>
              <label className="portal-form-label">Issue Date</label>
              <input type="date" value={form.issue_date} onChange={f("issue_date")} className="input-field" />
            </div>
            <div>
              <label className={`portal-form-label ${selectedType?.expiry_tracking ? "portal-form-label-req" : ""}`}>Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={f("expiry_date")} className="input-field" />
            </div>
          </div>
          <div>
            <label className="portal-form-label">Remarks</label>
            <textarea value={form.remarks} onChange={f("remarks")} rows={2} placeholder="Optional notes…" className="input-field" style={{ resize: "vertical" }} />
          </div>
        </div>

        {!editMode && (
          <div className="portal-form-card">
            <div className="portal-form-title">File Upload</div>
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{ border: `2px dashed ${dragOver ? "var(--c-accent)" : "var(--c-border)"}`, borderRadius: 10, padding: 30, textAlign: "center", cursor: "pointer", background: dragOver ? "rgba(99,102,241,0.05)" : "transparent", transition: "all 0.2s" }}>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.docx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }} className="t-heading">{file.name}</div>
                  <div style={{ fontSize: 11, marginTop: 2 }} className="t-muted">{(file.size / 1024).toFixed(1)} KB</div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); }} className="t-danger" style={{ marginTop: 8, fontSize: 11, background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }} className="t-heading">Drop file here or click to browse</div>
                  <div style={{ fontSize: 11, marginTop: 4 }} className="t-muted">PDF, JPG, PNG, DOCX — max 20 MB</div>
                </div>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 11 }} className="t-muted">You can also save without a file and upload later.</p>
          </div>
        )}

        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary">
            {saving ? "Saving…" : editMode ? "Save Changes" : "Upload Document"}
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}
