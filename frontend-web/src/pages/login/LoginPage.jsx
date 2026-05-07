import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../services/apiClient";

const BuildingIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const OfficeLogo = () => (
  <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="rgba(56,189,248,0.12)" stroke="rgba(56,189,248,0.35)" strokeWidth="1" />
    <rect x="8" y="10" width="16" height="14" rx="1.5" stroke="#67e8f9" strokeWidth="1.5" fill="none" />
    <rect x="13" y="10" width="6" height="4" rx="1" fill="rgba(103,232,249,0.18)" stroke="#67e8f9" strokeWidth="1.2" />
    <line x1="11" y1="15" x2="11" y2="24" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="16" y1="15" x2="16" y2="24" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="21" y1="15" x2="21" y2="24" stroke="#67e8f9" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="8" y1="18" x2="24" y2="18" stroke="#67e8f9" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="8" y1="21" x2="24" y2="21" stroke="#67e8f9" strokeWidth="0.8" strokeOpacity="0.4" />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#818cf8" stopOpacity="0.8" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path
      d="M50 5 L90 22 L90 55 C90 78 72 97 50 105 C28 97 10 78 10 55 L10 22 Z"
      stroke="url(#shieldGrad)"
      strokeWidth="2.5"
      fill="rgba(56,189,248,0.06)"
      filter="url(#glow)"
    />
    <path
      d="M50 15 L82 29 L82 55 C82 73 68 89 50 97 C32 89 18 73 18 55 L18 29 Z"
      stroke="url(#shieldGrad)"
      strokeWidth="1.5"
      fill="rgba(99,102,241,0.04)"
      strokeDasharray="4 2"
      opacity="0.6"
    />
    <path
      d="M35 57 L45 67 L67 45"
      stroke="#67e8f9"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
      filter="url(#glow)"
    />
    <circle cx="50" cy="57" r="18" stroke="rgba(103,232,249,0.2)" strokeWidth="1" fill="none" />
    <circle cx="50" cy="57" r="12" stroke="rgba(103,232,249,0.15)" strokeWidth="1" fill="none" />
  </svg>
);

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", tenantId: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.tenantLogin(form.email, form.password, form.tenantId);
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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 15% 85%, rgba(0,50,120,0.55) 0%, transparent 45%)," +
          "radial-gradient(ellipse at 85% 15%, rgba(60,0,120,0.4) 0%, transparent 45%)," +
          "radial-gradient(ellipse at 60% 60%, rgba(0,20,80,0.6) 0%, transparent 50%)," +
          "radial-gradient(ellipse at 40% 20%, rgba(0,10,60,0.5) 0%, transparent 40%)," +
          "#04040f",
      }}
    >
      {/* Bokeh city-light dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { x: "10%", y: "70%", size: 6, color: "rgba(56,189,248,0.25)" },
          { x: "25%", y: "80%", size: 4, color: "rgba(99,102,241,0.3)" },
          { x: "70%", y: "75%", size: 8, color: "rgba(56,189,248,0.2)" },
          { x: "80%", y: "85%", size: 5, color: "rgba(167,139,250,0.25)" },
          { x: "90%", y: "65%", size: 4, color: "rgba(56,189,248,0.2)" },
          { x: "5%", y: "50%", size: 3, color: "rgba(99,102,241,0.2)" },
          { x: "55%", y: "88%", size: 7, color: "rgba(56,189,248,0.15)" },
          { x: "40%", y: "82%", size: 3, color: "rgba(167,139,250,0.2)" },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: dot.x,
              top: dot.y,
              width: dot.size * 4,
              height: dot.size * 4,
              background: dot.color,
              filter: `blur(${dot.size * 2}px)`,
            }}
          />
        ))}
        {/* Large ambient glow pools */}
        <div
          className="absolute rounded-full"
          style={{ left: "5%", top: "55%", width: 300, height: 200, background: "rgba(0,60,140,0.25)", filter: "blur(60px)" }}
        />
        <div
          className="absolute rounded-full"
          style={{ right: "5%", top: "50%", width: 250, height: 180, background: "rgba(40,0,100,0.2)", filter: "blur(60px)" }}
        />
        {/* Top glow flare */}
        <div
          className="absolute"
          style={{ left: "35%", top: "-10%", width: 400, height: 300, background: "rgba(99,102,241,0.08)", filter: "blur(80px)", borderRadius: "50%" }}
        />
      </div>

      {/* Holographic scan lines overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(56,189,248,0.015) 3px, rgba(56,189,248,0.015) 4px)",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl">

        {/* Office Repo branding — above card */}
        <div className="mb-8 flex flex-col items-center gap-1">
          <div className="flex items-center gap-2.5">
            <OfficeLogo />
            <span
              className="text-2xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(135deg, #e2e8f0 0%, #67e8f9 60%, #818cf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Office Repo
            </span>
          </div>
          <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(148,163,184,0.5)", letterSpacing: "0.18em" }}>
            Unified Workplace Management
          </p>
        </div>

        <div className="flex items-center gap-0 md:gap-8 w-full">

        {/* Shield — left decorative panel */}
        <div className="hidden md:flex flex-col items-center justify-center flex-shrink-0 relative">
          {/* Outer glow ring */}
          <div
            className="absolute rounded-full"
            style={{ width: 220, height: 220, background: "radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)", filter: "blur(20px)" }}
          />
          <div
            className="relative"
            style={{
              width: 160,
              height: 190,
              filter: "drop-shadow(0 0 20px rgba(56,189,248,0.5)) drop-shadow(0 0 8px rgba(99,102,241,0.4))",
            }}
          >
            <ShieldIcon />
          </div>
          {/* Rotating ring */}
          <div
            className="absolute rounded-full border border-cyan-400/10"
            style={{ width: 200, height: 200, animation: "spin 20s linear infinite" }}
          />
          <div
            className="absolute rounded-full border border-indigo-400/8"
            style={{ width: 240, height: 240, animation: "spin 30s linear infinite reverse" }}
          />
        </div>

        {/* Login panel */}
        <div className="flex-1 w-full">
          {/* Holographic floating card */}
          <div
            className="rounded-2xl p-7 border relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              backdropFilter: "blur(28px) saturate(180%)",
              borderColor: "rgba(255,255,255,0.1)",
              boxShadow:
                "0 0 0 1px rgba(56,189,248,0.08) inset," +
                "0 20px 80px rgba(0,0,0,0.5)," +
                "0 0 60px rgba(56,189,248,0.06)," +
                "inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Corner glow accent */}
            <div
              className="absolute -top-10 -right-10 rounded-full pointer-events-none"
              style={{ width: 120, height: 120, background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
            />

            {/* Header */}
            <div className="mb-7">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 8px rgba(34,211,238,0.8)" }} />
                <h1 className="text-xl font-bold text-white tracking-wide">Sign In</h1>
              </div>
              <p className="text-xs text-gray-500 ml-3">Access your workspace</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Workspace ID field */}
              <div className="relative group">
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: "0 0 0 1px rgba(56,189,248,0.5), 0 0 12px rgba(56,189,248,0.15)" }}
                />
                <div className="relative flex items-center">
                  <span
                    className="absolute left-3.5 text-cyan-400/60 group-focus-within:text-cyan-400 transition-colors"
                    style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.4))" }}
                  >
                    <BuildingIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Workspace ID"
                    value={form.tenantId}
                    onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 rounded-lg border focus:outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                    required
                    autoComplete="organization"
                  />
                </div>
              </div>

              {/* Email / Username field */}
              <div className="relative group">
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: "0 0 0 1px rgba(56,189,248,0.5), 0 0 12px rgba(56,189,248,0.15)" }}
                />
                <div className="relative flex items-center">
                  <span
                    className="absolute left-3.5 text-cyan-400/60 group-focus-within:text-cyan-400 transition-colors"
                    style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.4))" }}
                  >
                    <UserIcon />
                  </span>
                  <input
                    type="email"
                    placeholder="Username / Email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 rounded-lg border focus:outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="relative group">
                <div
                  className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                  style={{ boxShadow: "0 0 0 1px rgba(56,189,248,0.5), 0 0 12px rgba(56,189,248,0.15)" }}
                />
                <div className="relative flex items-center">
                  <span
                    className="absolute left-3.5 text-cyan-400/60 group-focus-within:text-cyan-400 transition-colors"
                    style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.4))" }}
                  >
                    <LockIcon />
                  </span>
                  <input
                    type="password"
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 rounded-lg border focus:outline-none transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                    required
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Remember me + Forgot */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group/check">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <div
                      className="w-4 h-4 rounded border flex items-center justify-center transition-all"
                      style={{
                        borderColor: remember ? "rgba(56,189,248,0.8)" : "rgba(255,255,255,0.2)",
                        background: remember ? "rgba(56,189,248,0.2)" : "rgba(255,255,255,0.04)",
                        boxShadow: remember ? "0 0 8px rgba(56,189,248,0.3)" : "none",
                      }}
                    >
                      {remember && (
                        <svg className="w-2.5 h-2.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 group-hover/check:text-gray-400 transition-colors">Remember me</span>
                </label>
                <button type="button" className="text-xs text-gray-500 hover:text-cyan-400 transition-colors">
                  forgot password?
                </button>
              </div>

              {error && (
                <div
                  className="text-sm px-4 py-3 rounded-lg border"
                  style={{
                    background: "rgba(239,68,68,0.08)",
                    borderColor: "rgba(239,68,68,0.2)",
                    color: "rgba(252,165,165,0.9)",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                style={{
                  background: loading
                    ? "rgba(56,189,248,0.3)"
                    : "linear-gradient(135deg, rgba(56,189,248,0.9) 0%, rgba(99,102,241,0.9) 100%)",
                  color: "#fff",
                  boxShadow: loading ? "none" : "0 0 24px rgba(56,189,248,0.45), 0 0 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
                  letterSpacing: "0.15em",
                }}
              >
                {!loading && (
                  <span
                    className="absolute inset-0 opacity-20"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                      animation: "shimmer 2.5s infinite",
                    }}
                  />
                )}
                <span className="relative">{loading ? "Authenticating..." : "Login"}</span>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <button
                onClick={() => navigate("/")}
                className="text-xs transition-colors"
                style={{ color: "rgba(148,163,184,0.5)" }}
                onMouseOver={(e) => (e.currentTarget.style.color = "rgba(56,189,248,0.8)")}
                onMouseOut={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.5)")}
              >
                ← Back to home
              </button>

              {/* ORT branding */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: "rgba(148,163,184,0.35)" }}>by</span>
                <img
                  src="/ort-logo-dark.png"
                  alt="ORT"
                  className="h-4"
                  style={{ mixBlendMode: "screen", opacity: 0.75 }}
                />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
