import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { portalEmpDocApi, portalEmployeeApi } from "../../../services/apiClient";
import { usePortalAuth } from "../../../contexts/PortalAuthContext";
import PortalLayout from "../PortalLayout";

const inp = { padding: "8px 10px", background: "var(--c-bg,var(--c-surface))", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 13, color: "var(--c-text)", width: "100%", boxSizing: "border-box" };
const Label = ({ children, req }) => (
  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--c-text2,var(--c-muted))", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
    {children}{req && <span style={{ color: "#f87171", marginLeft: 2 }}>*</span>}
  </label>
);
const Card = ({ title, children }) => (
  <div style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 10, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
    {title && <div style={{ fontSize: 13, fontWeight: 700, color: "var(--c-text)", marginBottom: 4, paddingBottom: 10, borderBottom: "1px solid var(--c-border)" }}>{title}</div>}
    {children}
  </div>
);
const Row = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>{children}</div>;

const BLANK = { employee_id: "", document_type_id: "", document_number: "", issue_date: "", expiry_date: "", issuing_authority: "", remarks: "" };

export default function EmployeeDocForm() {
  const { subdomain, docId } = useParams();
  const { token } = usePortalAuth();
  const navigate = useNavigate();
  const editMode = Boolean(docId);
  const fileRef = useRef();

  const [form, setForm] = useState(BLANK);
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

  const back = () => navigate(editMode ? `/portal/${subdomain}/employee-documents/${docId}` : `/portal/${subdomain}/employee-documents`);

  const grouped = docTypes.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <PortalLayout title={editMode ? "Edit Document" : "Upload Document"}>
      <div style={{ maxWidth: 800 }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, fontSize: 12, color: "var(--c-muted)" }}>
          <span onClick={() => navigate(`/portal/${subdomain}/employee-documents`)} style={{ cursor: "pointer", color: "var(--c-accent)" }}>Employee Documents</span>
          <span>/</span>
          <span>{editMode ? "Edit" : "Upload New"}</span>
        </div>

        {error && <div style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Document Information */}
          <Card title="Document Information">
            <Row>
              <div>
                <Label req>Employee</Label>
                <select value={form.employee_id} onChange={f("employee_id")} style={inp} disabled={editMode}>
                  <option value="">Select Employee</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{[e.first_name, e.last_name].filter(Boolean).join(" ")} {e.employee_code ? `(${e.employee_code})` : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label req>Document Type</Label>
                <select value={form.document_type_id} onChange={f("document_type_id")} style={inp} disabled={editMode}>
                  <option value="">Select Type</option>
                  {Object.entries(grouped).map(([cat, types]) => (
                    <optgroup key={cat} label={cat}>
                      {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                {selectedType && (
                  <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    {selectedType.expiry_tracking && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>Expiry Tracked</span>}
                    {selectedType.verification_required && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>Verification Required</span>}
                    {selectedType.mandatory_onboarding && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>Mandatory</span>}
                  </div>
                )}
              </div>
            </Row>
            <Row>
              <div>
                <Label>Document Number</Label>
                <input value={form.document_number} onChange={f("document_number")} placeholder="e.g. A1234567" style={inp} />
              </div>
              <div>
                <Label>Issuing Authority</Label>
                <input value={form.issuing_authority} onChange={f("issuing_authority")} placeholder="e.g. Government of India" style={inp} />
              </div>
            </Row>
            <Row>
              <div>
                <Label>Issue Date</Label>
                <input type="date" value={form.issue_date} onChange={f("issue_date")} style={inp} />
              </div>
              <div>
                <Label>{selectedType?.expiry_tracking ? "Expiry Date *" : "Expiry Date"}</Label>
                <input type="date" value={form.expiry_date} onChange={f("expiry_date")} style={inp} />
              </div>
            </Row>
            <div>
              <Label>Remarks</Label>
              <textarea value={form.remarks} onChange={f("remarks")} rows={2} placeholder="Optional notes…" style={{ ...inp, resize: "vertical" }} />
            </div>
          </Card>

          {/* File Upload (new only) */}
          {!editMode && (
            <Card title="File Upload">
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
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 2 }}>{(file.size / 1024).toFixed(1)} KB</div>
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} style={{ marginTop: 8, fontSize: 11, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>Remove</button>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--c-text)" }}>Drop file here or click to browse</div>
                    <div style={{ fontSize: 11, color: "var(--c-muted)", marginTop: 4 }}>PDF, JPG, PNG, DOCX — max 20 MB</div>
                  </div>
                )}
              </div>
              <p style={{ margin: 0, fontSize: 11, color: "var(--c-muted)" }}>You can also save without a file and upload later.</p>
            </Card>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button onClick={back} style={{ padding: "9px 20px", borderRadius: 7, border: "1px solid var(--c-border)", background: "none", color: "var(--c-text)", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{ padding: "9px 24px", borderRadius: 7, background: "var(--c-accent)", color: "#fff", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : editMode ? "Save Changes" : "Upload Document"}
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}
