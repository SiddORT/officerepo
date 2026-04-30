import React, { useState, useEffect } from "react";
import { tenantsApi, featureFlagsApi, subscriptionsApi } from "../../services/apiClient";

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

  useEffect(() => {
    fetchTenants();
    subscriptionsApi.plans().then((r) => setPlans(r.data)).catch(() => {});
  }, []);

  const fetchTenants = async (q = "") => {
    setLoading(true);
    try {
      const res = await tenantsApi.list({ search: q || undefined });
      setTenants(res.data);
    } catch (e) {
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

  const handleActivate = async (id) => {
    await tenantsApi.activate(id);
    fetchTenants(search);
  };

  const handleSuspend = async (id) => {
    await tenantsApi.suspend(id);
    fetchTenants(search);
  };

  const openFlags = async (tenant) => {
    setSelectedTenant(tenant);
    try {
      const res = await featureFlagsApi.getForTenant(tenant.id);
      setTenantFlags(res.data);
    } catch {
      setTenantFlags([]);
    }
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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Tenant Management</h2>
          <p className="text-gray-500 mt-1">Create and manage all tenants on the platform.</p>
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

      {/* Plans summary */}
      {plans.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {plans.map((plan) => (
            <div key={plan.id} className="card border border-indigo-700/30">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-white">{plan.name}</h4>
                  <p className="text-sm text-gray-500">Up to {plan.max_users} users</p>
                </div>
                <span className="text-indigo-400 font-bold">${plan.price_monthly}/mo</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tenants table */}
      {loading ? (
        <div className="text-gray-500">Loading tenants...</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/60 border-b border-gray-800">
              <tr>
                {["ID", "Name", "Slug", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-600">
                    No tenants yet. Create your first one.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-5 py-3.5 text-gray-500">#{tenant.id}</td>
                    <td className="px-5 py-3.5 font-medium text-white">{tenant.name}</td>
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{tenant.slug}</td>
                    <td className="px-5 py-3.5">
                      {tenant.is_suspended ? (
                        <span className="px-2 py-1 bg-red-900/40 text-red-400 rounded-full text-xs">Suspended</span>
                      ) : tenant.is_active ? (
                        <span className="px-2 py-1 bg-emerald-900/40 text-emerald-400 rounded-full text-xs">Active</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-700 text-gray-400 rounded-full text-xs">Inactive</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {!tenant.is_active || tenant.is_suspended ? (
                          <button
                            onClick={() => handleActivate(tenant.id)}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                          >
                            Activate
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSuspend(tenant.id)}
                            className="text-xs text-red-400 hover:text-red-300 font-medium"
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          onClick={() => openFlags(tenant)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                        >
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Create New Tenant</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tenant Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  className="input-field"
                  placeholder="acme-corp"
                  required
                />
                <p className="text-xs text-gray-600 mt-1">Used for X-Tenant-ID header and subdomains</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tenant Database URL (optional)</label>
                <input
                  value={form.db_url}
                  onChange={(e) => setForm({ ...form, db_url: e.target.value })}
                  className="input-field"
                  placeholder="postgresql://user:pass@host/db"
                />
                <p className="text-xs text-gray-600 mt-1">Leave blank to configure later</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? "Creating..." : "Create Tenant"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 px-4 border border-gray-700 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors text-sm font-medium"
                >
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-1">Module Flags</h3>
            <p className="text-sm text-gray-500 mb-5">{selectedTenant.name} ({selectedTenant.slug})</p>
            <div className="space-y-3">
              {MODULES.map((mod) => {
                const enabled = isModuleEnabled(mod);
                return (
                  <div key={mod} className="flex items-center justify-between py-2">
                    <span className="capitalize text-sm font-medium text-gray-200">{mod}</span>
                    <button
                      onClick={() => toggleFlag(mod)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        enabled ? "bg-indigo-600" : "bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setSelectedTenant(null)}
              className="mt-6 w-full py-2 border border-gray-700 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:border-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
