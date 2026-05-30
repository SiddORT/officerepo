import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { leadsApi } from "../../../services/apiClient";
import LeadForm from "./components/LeadForm";

export default function EditLead() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    leadsApi.get(id)
      .then((res) => setLead(res.data?.data ?? res.data))
      .catch((e) => setError(e.response?.data?.detail || "Failed to load lead."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload) => {
    await leadsApi.update(id, payload);
    navigate(`/superadmin/leads/${id}`);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="inline-block w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
          <h1 className="text-2xl font-bold t-heading">Edit Lead</h1>
        </div>
        <p className="text-sm t-muted ml-3">{lead ? `${lead.company_name} · ${lead.lead_number}` : "Update lead details."}</p>
      </div>

      {loading && <p className="text-sm t-muted">Loading…</p>}
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}
      {!loading && lead && <LeadForm initial={lead} submitLabel="Save Changes" onSubmit={handleSubmit} />}
    </div>
  );
}
