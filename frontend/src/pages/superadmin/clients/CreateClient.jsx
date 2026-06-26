import React from "react";
import { useNavigate } from "react-router-dom";
import { clientsApi } from "../../../services/apiClient";
import ClientForm from "./components/ClientForm";

export default function CreateClient() {
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    const res = await clientsApi.create(payload);
    const data = res.data?.data ?? res.data;
    navigate(`/superadmin/clients/${data.id}`);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="inline-block w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
          <h1 className="text-2xl font-bold t-heading">New Client</h1>
        </div>
        <p className="text-sm t-muted ml-3">Onboard a new tenant client.</p>
      </div>
      <ClientForm submitLabel="Create Client" onSubmit={handleSubmit} />
    </div>
  );
}
