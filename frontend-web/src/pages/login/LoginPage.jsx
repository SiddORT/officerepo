import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../services/apiClient";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("superadmin"); // superadmin | tenant
  const [form, setForm] = useState({ email: "", password: "", tenantId: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (mode === "superadmin") {
        res = await authApi.superAdminLogin(form.email, form.password);
      } else {
        if (!form.tenantId) {
          setError("Tenant ID is required for tenant login.");
          setLoading(false);
          return;
        }
        res = await authApi.tenantLogin(form.email, form.password, form.tenantId);
      }
      const data = res.data;
      login(
        { email: form.email, role: data.role, tenant_id: data.tenant_id, user_id: data.user_id },
        { access_token: data.access_token, refresh_token: data.refresh_token }
      );
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Office Repo</h1>
          <p className="text-gray-500 mt-1 text-sm">Multi-tenant SaaS Platform</p>
        </div>

        <div className="card">
          {/* Mode toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            {["superadmin", "tenant"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                  mode === m ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {m === "superadmin" ? "Super Admin" : "Tenant Login"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "tenant" && (
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Tenant ID</label>
                <input
                  type="text"
                  placeholder="your-company-slug"
                  value={form.tenantId}
                  onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="input-field"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {mode === "superadmin" && (
            <p className="text-xs text-gray-600 text-center mt-4">
              Default: admin@officerepo.io / admin123
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
