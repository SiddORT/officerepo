import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../services/apiClient";

const ShieldIcon = () => (
  <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <defs>
      <linearGradient id="adminShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f472b6" stopOpacity="0.9" />
        <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.8" />
      </linearGradient>
      <filter id="adminGlow">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path
      d="M50 5 L90 22 L90 55 C90 78 72 97 50 105 C28 97 10 78 10 55 L10 22 Z"
      stroke="url(#adminShieldGrad)"
      strokeWidth="2.5"
      fill="rgba(167,139,250,0.06)"
      filter="url(#adminGlow)"
    />
    <path
      d="M50 15 L82 29 L82 55 C82 73 68 89 50 97 C32 89 18 73 18 55 L18 29 Z"
      stroke="url(#adminShieldGrad)"
      strokeWidth="1.5"
      fill="rgba(99,102,241,0.04)"
      strokeDasharray="4 2"
      opacity="0.6"
    />
    {/* Key icon inside shield */}
    <circle cx="50" cy="51" r="9" stroke="#a78bfa" strokeWidth="2.5" fill="none" filter="url(#adminGlow)" />
    <line x1="59" y1="51" x2="70" y2="51" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" filter="url(#adminGlow)" />
    <line x1="67" y1="51" x2="67" y2="57" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="63" y1="51" x2="63" y2="55" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="50" cy="57" r="18" stroke="rgba(167,139,250,0.2)" strokeWidth="1" fill="none" />
    <circle cx="50" cy="57" r="12" stroke="rgba(167,139,250,0.15)" strokeWidth="1" fill="none" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const EyeIcon = ({ open }) =>
  open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );

const OfficeLogo = () => (
  <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="8" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)" strokeWidth="1" />
    <rect x="8" y="10" width="16" height="14" rx="1.5" stroke="#a78bfa" strokeWidth="1.5" fill="none" />
    <rect x="13" y="10" width="6" height="4" rx="1" fill="rgba(167,139,250,0.2)" stroke="#a78bfa" strokeWidth="1.2" />
    <line x1="11" y1="15" x2="11" y2="24" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="16" y1="15" x2="16" y2="24" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="21" y1="15" x2="21" y2="24" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.5" />
    <line x1="8" y1="18" x2="24" y2="18" stroke="#a78bfa" strokeWidth="0.8" strokeOpacity="0.4" />
    <line x1="8" y1="21" x2="24" y2="21" stroke="#a78bfa" strokeWidth="0.8" strokeOpacity="0.4" />
  </svg>
);

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authApi.superAdminLogin(form.email, form.password);
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
          "radial-gradient(ellipse at 15% 85%, rgba(80,0,120,0.5) 0%, transparent 45%)," +
          "radial-gradient(ellipse at 85% 15%, rgba(40,0,100,0.4) 0%, transparent 45%)," +
          "radial-gradient(ellipse at 60% 60%, rgba(20,0,80,0.6) 0%, transparent 50%)," +
          "radial-gradient(ellipse at 40% 20%, rgba(0,10,60,0.5) 0%, transparent 40%)," +
          "#04040f",
      }}
    >
      {/* Bokeh ambient dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { x: "10%", y: "70%", size: 6, color: "rgba(167,139,250,0.2)" },
          { x: "25%", y: "80%", size: 4, color: "rgba(99,102,241,0.3)" },
          { x: "70%", y: "75%", size: 8, color: "rgba(167,139,250,0.15)" },
          { x: "80%", y: "85%", size: 5, color: "rgba(244,114,182,0.2)" },
          { x: "90%", y: "65%", size: 4, color: "rgba(167,139,250,0.18)" },
          { x: "5%",  y: "50%", size: 3, color: "rgba(99,102,241,0.2)" },
          { x: "55%", y: "88%", size: 7, color: "rgba(167,139,250,0.12)" },
          { x: "40%", y: "82%", size: 3, color: "rgba(244,114,182,0.15)" },
        ].map((dot, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: dot.x, top: dot.y,
              width: dot.size * 4, height: dot.size * 4,
              background: dot.color,
              filter: `blur(${dot.size * 2}px)`,
            }}
          />
        ))}
        <div className="absolute rounded-full" style={{ left: "5%", top: "55%", width: 300, height: 200, background: "rgba(80,0,140,0.2)", filter: "blur(60px)" }} />
        <div className="absolute rounded-full" style={{ right: "5%", top: "50%", width: 250, height: 180, background: "rgba(40,0,100,0.2)", filter: "blur(60px)" }} />
        <div className="absolute" style={{ left: "35%", top: "-10%", width: 400, height: 300, background: "rgba(99,102,241,0.07)", filter: "blur(80px)", borderRadius: "50%" }} />
      </div>

      {/* Holographic scan lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(167,139,250,0.012) 3px, rgba(167,139,250,0.012) 4px)",
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
                background: "linear-gradient(135deg, #e2e8f0 0%, #a78bfa 60%, #67e8f9 100%)",
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
            <div className="absolute rounded-full" style={{ width: 220, height: 220, background: "radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)", filter: "blur(20px)" }} />
            <div className="relative" style={{ width: 160, height: 190, filter: "drop-shadow(0 0 20px rgba(167,139,250,0.5)) drop-shadow(0 0 8px rgba(244,114,182,0.3))" }}>
              <ShieldIcon />
            </div>
            <div className="absolute rounded-full border" style={{ width: 200, height: 200, borderColor: "rgba(167,139,250,0.1)", animation: "spin 20s linear infinite" }} />
            <div className="absolute rounded-full border" style={{ width: 240, height: 240, borderColor: "rgba(99,102,241,0.07)", animation: "spin 30s linear infinite reverse" }} />
          </div>

          {/* Login card */}
          <div className="flex-1 w-full">
            <div
              className="rounded-2xl p-7 border relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(28px) saturate(180%)",
                borderColor: "rgba(255,255,255,0.1)",
                boxShadow:
                  "0 0 0 1px rgba(167,139,250,0.08) inset," +
                  "0 20px 80px rgba(0,0,0,0.5)," +
                  "0 0 60px rgba(167,139,250,0.06)," +
                  "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              {/* Corner glow */}
              <div className="absolute -top-10 -right-10 rounded-full pointer-events-none" style={{ width: 120, height: 120, background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)" }} />

              {/* Header */}
              <div className="mb-7">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #a78bfa, #f472b6)", boxShadow: "0 0 8px rgba(167,139,250,0.8)" }} />
                  <h1 className="text-xl font-bold text-white tracking-wide">Platform Admin</h1>
                </div>
                <p className="text-xs text-gray-500 ml-3">Restricted access — authorised personnel only</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email field */}
                <div className="relative group">
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                    style={{ boxShadow: "0 0 0 1px rgba(167,139,250,0.5), 0 0 12px rgba(167,139,250,0.15)" }}
                  />
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-violet-400/60 group-focus-within:text-violet-400 transition-colors" style={{ filter: "drop-shadow(0 0 4px rgba(167,139,250,0.4))" }}>
                      <UserIcon />
                    </span>
                    <input
                      type="email"
                      placeholder="Admin Email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 text-sm text-gray-100 placeholder-gray-500 rounded-lg border focus:outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password field */}
                <div className="relative group">
                  <div
                    className="absolute inset-0 rounded-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"
                    style={{ boxShadow: "0 0 0 1px rgba(167,139,250,0.5), 0 0 12px rgba(167,139,250,0.15)" }}
                  />
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-violet-400/60 group-focus-within:text-violet-400 transition-colors" style={{ filter: "drop-shadow(0 0 4px rgba(167,139,250,0.4))" }}>
                      <LockIcon />
                    </span>
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full pl-10 pr-10 py-3 text-sm text-gray-100 placeholder-gray-500 rounded-lg border focus:outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)" }}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 transition-colors"
                      style={{ color: "rgba(148,163,184,0.4)" }}
                      onMouseOver={(e) => (e.currentTarget.style.color = "rgba(167,139,250,0.8)")}
                      onMouseOut={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.4)")}
                    >
                      <EyeIcon open={showPass} />
                    </button>
                  </div>
                </div>

                {/* Remember me + Forgot */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group/check">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                      <div
                        className="w-4 h-4 rounded border flex items-center justify-center transition-all"
                        style={{
                          borderColor: remember ? "rgba(167,139,250,0.8)" : "rgba(255,255,255,0.2)",
                          background: remember ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.04)",
                          boxShadow: remember ? "0 0 8px rgba(167,139,250,0.3)" : "none",
                        }}
                      >
                        {remember && (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="rgba(167,139,250,0.9)" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 group-hover/check:text-gray-400 transition-colors">Remember me</span>
                  </label>
                  <button type="button" className="text-xs text-gray-500 hover:text-violet-400 transition-colors">
                    forgot password?
                  </button>
                </div>

                {error && (
                  <div
                    className="text-sm px-4 py-3 rounded-lg border"
                    style={{ background: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)", color: "rgba(252,165,165,0.9)" }}
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
                      ? "rgba(167,139,250,0.3)"
                      : "linear-gradient(135deg, rgba(167,139,250,0.9) 0%, rgba(99,102,241,0.9) 60%, rgba(244,114,182,0.7) 100%)",
                    color: "#fff",
                    boxShadow: loading ? "none" : "0 0 24px rgba(167,139,250,0.45), 0 0 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
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
                  onMouseOver={(e) => (e.currentTarget.style.color = "rgba(167,139,250,0.8)")}
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
