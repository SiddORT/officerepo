import React from "react";
import { useNavigate } from "react-router-dom";
import { leadsApi } from "../../../services/apiClient";
import LeadForm from "./components/LeadForm";

export default function CreateLead() {
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    const res = await leadsApi.create(payload);
    const data = res.data?.data ?? res.data;
    navigate(`/superadmin/leads/${data.id}`);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="inline-block w-1 h-5 rounded-full" style={{ background: "linear-gradient(to bottom, #00aeec, #ff7a1a)" }} />
          <h1 className="text-2xl font-bold t-heading">New Lead</h1>
        </div>
        <p className="text-sm t-muted ml-3">Capture a new sales lead into the pipeline.</p>
      </div>
      <LeadForm submitLabel="Create Lead" onSubmit={handleSubmit} />
    </div>
  );
}
