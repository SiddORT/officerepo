import React, { useState, useEffect } from "react";
import { tenantsApi, featureFlagsApi, subscriptionsApi, rotationStatusApi } from "../../services/apiClient";

const MODULES = ["hrms", "assets", "billing", "attendance", "leave", "payroll"];

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [tenantFlags, setTenantFlags] = useState([]);
  const [form, setForm] = useState({ name: "", slug: "", db_url: "" });
  const [submitting, setSubmitting] = useState(false);
  const [plans, setPlans] = useState([]);
  const [rotationStatus, setRotationStatus] = useState(null);

  useEffect(() => {
    fetchTenants();
    subscriptionsApi.plans().then((r) => setPlans(r.data)).catch(() => {});
    rotationStatusApi.get().then((r) => setRotationStatus(r.data)).catch(() => {});
  }, []);

  const fetchTenants = async (q = "") => {
    setLoading(true);
    try {
      const res = await tenantsApi.list({ search: q || undefined });
      setTenants(res.data);
    } catch {
      setError("Failed to load tenants.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchTenants(e.target.value);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await tenantsApi.create(form);
      setShowCreate(false);
      setForm({ name: "", slug: "", db_url: "" });
      fetchTenants(search);
    } catch (e) {
      alert(e.response?.data?.detail || "Failed to create tenant.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivate = async (id) => { await tenantsApi.activate(id); fetchTenants(search); };
  const handleSuspend  = async (id) => { await tenantsApi.suspend(id);  fetchTenants(search); };

  const openFlags = async (tenant) => {
    setSelectedTenant(tenant);
    try {
      const res = await featureFlagsApi.getForTenant(tenant.id);
      setTenantFlags(res.data);
    } catch { setTenantFlags([]); }
  };

  const toggleFlag = async (module) => {
    const current = tenantFlags.find((f) => f.module === module);
    const newVal = current ? !current.is_enabled : true;
    await featureFlagsApi.toggle(selectedTenant.id, module, newVal);
    const res = await featureFlagsApi.getForTenant(selectedTenant.id);
    setTenantFlags(res.data);
  };

  const isModuleEnabled = (module) =>
    tenantFlags.find((f) => f.module === module)?.is_enabled ?? false;

  const showRotationWarning =
    rotationStatus &&
    rotationStatus.grace_active &&
    rotationStatus.fallback_requests_last_hour > 0;

  return (
    <div className="p-8">
      {showRotationWarning && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-5 py-4">
          <span className="mt-0.5 text-amber-400 text-lg leading-none">&#9888;</span>
          <div className="flex-1">
            <p className="font-semibold text-amber-300 text-sm">
              Old-key tokens still in active use &mdash; rotation is not yet safe to complete
            </p>
            <p className="text-amber-400/80 text-xs mt-1">
              <strong>{rotationStatus.fallback_requests_last_hour}</strong> request
              {rotationStatus.fallback_requests_last_hour !== 1 ? "s" : ""} in the last hour
              were verified using the previous signing key
              {rotationStatus.previous_kid ? (
                <> (<code className="font-mono bg-amber-900/40 px-1 rounded">{rotationStatus.previous_kid}</code>)</>
              ) : null}.
              {rotationStatus.grace_expires_at ? (
                <> Grace period expires&nbsp;
                  <strong>{new Date(rotationStatus.grace_expires_at).toLocaleString()}</strong>.
                </>
              ) : null}
              &nbsp;Wait until this count reaches zero before removing <code className="font-mono bg-amber-900/40 px-1 rounded">PREVIOUS_JWT_SECRET</code>.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold t-heading">Tenant Management</h2>
          <p className="t-muted mt-1">Create and manage all tenants on the platform.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          + New Tenant
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search tenants..."
          value={search}
          onChange={handleSearch}
          className="input-field max-w-sm"
        />
      </div>

      {/* Plans */}
      {plans.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {plans.map((plan) => (
            <div key={plan.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold t-heading">{plan.name}</h4>
                  <p className="text-sm t-muted">Up to {plan.max_users} users</p>
                </div>
                <span className="t-accent font-bold">${plan.price_monthly}/mo</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tenants table */}
      {loading ? (
        <p className="t-muted">Loading tenants...</p>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="t-table-header">
              <tr>
                {["Sr. No", "ID", "Name", "Slug", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold t-muted uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center t-muted">
                    No tenants yet. Create your first one.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant, index) => (
                  <tr key={tenant.id} className="t-table-row t-table-divider border-t transition-colors">
                    <td className="px-5 py-3.5 t-muted text-xs tabular-nums">{index + 1}</td>
                    <td className="px-5 py-3.5 t-muted">#{tenant.id}</td>
                    <td className="px-5 py-3.5 font-medium t-heading">{tenant.name}</td>
                    <td className="px-5 py-3.5 t-body font-mono text-xs">{tenant.slug}</td>
                    <td className="px-5 py-3.5">
                      {tenant.is_suspended ? (
                        <span className="badge-danger">Suspended</span>
                      ) : tenant.is_active ? (
                        <span className="badge-active">Active</span>
                      ) : (
                        <span className="badge-inactive">Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {!tenant.is_active || tenant.is_suspended ? (
                          <button onClick={() => handleActivate(tenant.id)}
                            className="text-xs text-emerald-500 hover:text-emerald-400 font-medium transition-colors">
                            Activate
                          </button>
                        ) : (
                          <button onClick={() => handleSuspend(tenant.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
                            Suspend
                          </button>
                        )}
                        <button onClick={() => openFlags(tenant)}
                          className="text-xs t-accent font-medium transition-colors hover:underline">
                          Modules
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Tenant Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold t-heading mb-4">Create New Tenant</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { label: "Company Name", key: "name", placeholder: "Acme Corp", hint: "" },
                { label: "Tenant Slug", key: "slug", placeholder: "acme-corp", hint: "Used for X-Tenant-ID header and subdomains" },
                { label: "Database URL", key: "db_url", placeholder: "postgresql://user:pass@host/db", hint: "Leave blank to configure later" },
              ].map(({ label, key, placeholder, hint }) => (
                <div key={key}>
                  <label className="block text-sm t-body mb-1">{label}</label>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm({
                      ...form,
                      [key]: key === "slug"
                        ? e.target.value.toLowerCase().replace(/\s+/g, "-")
                        : e.target.value
                    })}
                    className="input-field"
                    placeholder={placeholder}
                    required={key !== "db_url"}
                  />
                  {hint && <p className="text-xs t-muted mt-1">{hint}</p>}
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? "Creating..." : "Create Tenant"}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feature Flags Panel */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-sm shadow-2xl">
            <h3 className="text-lg font-bold t-heading mb-1">Module Flags</h3>
            <p className="text-sm t-muted mb-5">{selectedTenant.name} ({selectedTenant.slug})</p>
            <div className="space-y-3">
              {MODULES.map((mod) => {
                const enabled = isModuleEnabled(mod);
                return (
                  <div key={mod} className="flex items-center justify-between py-2">
                    <span className="capitalize text-sm font-medium t-body">{mod}</span>
                    <button
                      onClick={() => toggleFlag(mod)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        enabled ? "bg-[#00aeec]" : "bg-gray-700"
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? "translate-x-6" : "translate-x-1"
                      }`} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setSelectedTenant(null)} className="mt-6 w-full btn-secondary">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
