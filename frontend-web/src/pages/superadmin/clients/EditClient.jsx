import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clientsApi } from "../../../services/apiClient";
import ClientForm from "./components/ClientForm";

export default function EditClient() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    clientsApi.get(id)
      .then((res) => setClient(res.data?.data ?? res.data))
      .catch((e) => setError(e.response?.data?.detail || "Failed to load client."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload) => {
    await clientsApi.update(id, payload);
    navigate(`/superadmin/clients/${id}`);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="inline-block w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
          <h1 className="text-2xl font-bold t-heading">Edit Client</h1>
        </div>
        <p className="text-sm t-muted ml-3">{client ? `${client.company_name} · ${client.client_code}` : "Update client details."}</p>
      </div>

      {loading && <p className="text-sm t-muted">Loading…</p>}
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm text-red-400" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}
      {!loading && client && <ClientForm initial={client} isEdit submitLabel="Save Changes" onSubmit={handleSubmit} />}
    </div>
  );
}
