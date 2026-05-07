import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { authApi } from "../../services/apiClient";

const WaveArt = () => (
  <svg
    viewBox="0 0 500 700"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0" />
        <stop offset="40%" stopColor="#38bdf8" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0" />
        <stop offset="50%" stopColor="#e2e8f0" stopOpacity="0.3" />
        <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="wave3" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0" />
        <stop offset="60%" stopColor="#7dd3fc" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0" />
      </linearGradient>
    </defs>

    {/* Flowing wave ribbons — multiple layers */}
    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => {
      const yBase = 50 + i * 50;
      const cp1x = 80 + i * 15;
      const cp1y = yBase - 60 + i * 8;
      const cp2x = 300 - i * 10;
      const cp2y = yBase + 80 - i * 6;
      const endX = 420 + i * 5;
      const endY = yBase + 30 + i * 4;
      const opacity = 0.08 + (i % 4) * 0.06;
      const stroke = i % 3 === 0 ? "#38bdf8" : i % 3 === 1 ? "#e2e8f0" : "#7dd3fc";
      return (
        <path
          key={i}
          d={`M -20 ${yBase} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${endX} ${endY}`}
          stroke={stroke}
          strokeWidth={i % 4 === 0 ? 1.5 : 0.8}
          strokeOpacity={opacity}
          fill="none"
        />
      );
    })}

    {/* Bright highlight wave — the glowing main ribbon */}
    <path
      d="M -20 340 C 60 240 180 320 280 260 C 360 210 420 280 520 240"
      stroke="url(#wave1)"
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M -20 360 C 70 260 190 335 285 275 C 365 225 425 295 525 258"
      stroke="url(#wave1)"
      strokeWidth="1"
      strokeOpacity="0.4"
      fill="none"
    />

    {/* Secondary bright ribbon */}
    <path
      d="M -20 420 C 80 340 160 400 260 370 C 340 345 400 390 520 350"
      stroke="url(#wave2)"
      strokeWidth="1.5"
      fill="none"
    />

    {/* Fine detail waves — upper cluster */}
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <path
        key={`upper-${i}`}
        d={`M -20 ${180 + i * 18} C ${60 + i * 8} ${120 + i * 10} ${200 - i * 5} ${200 + i * 12} ${420 + i * 10} ${170 + i * 15}`}
        stroke="#e2e8f0"
        strokeWidth="0.5"
        strokeOpacity={0.06 + i * 0.02}
        fill="none"
      />
    ))}

    {/* Fine detail waves — lower cluster */}
    {[0, 1, 2, 3, 4].map((i) => (
      <path
        key={`lower-${i}`}
        d={`M -20 ${480 + i * 20} C ${100 + i * 10} ${440 + i * 8} ${220 + i * 5} ${500 + i * 10} ${440 + i * 8} ${460 + i * 12}`}
        stroke="#7dd3fc"
        strokeWidth="0.5"
        strokeOpacity={0.05 + i * 0.02}
        fill="none"
      />
    ))}

    {/* Glow dot at brightest wave intersection */}
    <circle cx="200" cy="300" r="3" fill="#38bdf8" fillOpacity="0.5" />
    <circle cx="200" cy="300" r="8" fill="#38bdf8" fillOpacity="0.1" />
    <circle cx="200" cy="300" r="16" fill="#38bdf8" fillOpacity="0.04" />
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

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loginHover, setLoginHover] = useState(false);

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
      className="min-h-screen flex overflow-hidden relative"
      style={{ background: "#0b1929" }}
    >
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes glowRing {
          0%, 100% { box-shadow: 0 0 0 3px rgba(125,211,252,0.25), 0 0 24px rgba(125,211,252,0.2); }
          50%       { box-shadow: 0 0 0 6px rgba(125,211,252,0.15), 0 0 48px rgba(125,211,252,0.35); }
        }
        @keyframes underlineGlow {
          0%, 100% { box-shadow: 0 2px 8px rgba(125,211,252,0.3); }
          50%       { box-shadow: 0 2px 20px rgba(125,211,252,0.6); }
        }
        @keyframes fieldFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 25% 50%, rgba(14,42,71,0.8) 0%, transparent 60%)," +
              "radial-gradient(ellipse at 75% 50%, rgba(8,28,54,0.9) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Left — wave art panel */}
      <div className="relative w-1/2 flex-shrink-0 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <WaveArt />
        </div>
        <div
          className="absolute inset-y-0 right-0 w-32 pointer-events-none"
          style={{ background: "linear-gradient(to right, transparent, #0b1929)" }}
        />
      </div>

      {/* Right — login form */}
      <div className="relative flex-1 flex flex-col items-start justify-center px-16 py-12">

        {/* Register button — top right */}
        <div className="absolute top-8 right-8">
          <button
            type="button"
            className="px-6 py-2 text-xs font-semibold tracking-widest uppercase rounded-full border transition-all duration-300"
            style={{
              borderColor: "rgba(125,211,252,0.4)",
              color: "rgba(125,211,252,0.8)",
              background: "rgba(125,211,252,0.04)",
              letterSpacing: "0.12em",
              boxShadow: "none",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(125,211,252,0.08)";
              e.currentTarget.style.borderColor = "rgba(125,211,252,0.9)";
              e.currentTarget.style.boxShadow =
                "0 0 12px rgba(125,211,252,0.35), 0 0 30px rgba(125,211,252,0.15), inset 0 0 12px rgba(125,211,252,0.06)";
              e.currentTarget.style.color = "rgba(125,211,252,1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(125,211,252,0.04)";
              e.currentTarget.style.borderColor = "rgba(125,211,252,0.4)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.color = "rgba(125,211,252,0.8)";
            }}
          >
            Register
          </button>
        </div>

        {/* Form area + circular LOGIN button together */}
        <div className="w-full max-w-sm relative">

          <p
            className="text-xs font-medium tracking-widest uppercase mb-10"
            style={{ color: "rgba(125,211,252,0.4)", letterSpacing: "0.2em" }}
          >
            Platform Admin
          </p>

          <form onSubmit={handleSubmit}>
            <div className="flex items-center gap-6">

              {/* Fields */}
              <div className="flex-1 space-y-8">

                {/* Username / Email */}
                <div className="relative group/field">
                  <input
                    type="email"
                    placeholder="username"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pb-3 text-sm bg-transparent border-0 border-b focus:outline-none placeholder-gray-600 transition-all duration-300"
                    style={{
                      borderBottomColor: "rgba(148,163,184,0.2)",
                      color: "rgba(226,232,240,0.85)",
                    }}
                    onMouseOver={(e) => {
                      e.target.style.borderBottomColor = "rgba(125,211,252,0.4)";
                      e.target.style.filter = "drop-shadow(0 2px 6px rgba(125,211,252,0.2))";
                    }}
                    onMouseOut={(e) => {
                      if (document.activeElement !== e.target) {
                        e.target.style.borderBottomColor = "rgba(148,163,184,0.2)";
                        e.target.style.filter = "none";
                      }
                    }}
                    onFocus={(e) => {
                      e.target.style.borderBottomColor = "rgba(125,211,252,0.8)";
                      e.target.style.filter = "drop-shadow(0 3px 10px rgba(125,211,252,0.4))";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderBottomColor = "rgba(148,163,184,0.2)";
                      e.target.style.filter = "none";
                    }}
                    required
                    autoComplete="email"
                  />
                  {/* Animated underline glow bar */}
                  <div
                    className="absolute bottom-0 left-0 h-px w-0 transition-all duration-500 rounded-full group-focus-within/field:w-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(125,211,252,0.8), transparent)",
                      boxShadow: "0 0 8px rgba(125,211,252,0.6)",
                    }}
                  />
                </div>

                {/* Password */}
                <div className="relative group/field">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pb-3 pr-8 text-sm bg-transparent border-0 border-b focus:outline-none placeholder-gray-600 transition-all duration-300"
                    style={{
                      borderBottomColor: "rgba(148,163,184,0.2)",
                      color: "rgba(226,232,240,0.85)",
                    }}
                    onMouseOver={(e) => {
                      e.target.style.borderBottomColor = "rgba(125,211,252,0.4)";
                      e.target.style.filter = "drop-shadow(0 2px 6px rgba(125,211,252,0.2))";
                    }}
                    onMouseOut={(e) => {
                      if (document.activeElement !== e.target) {
                        e.target.style.borderBottomColor = "rgba(148,163,184,0.2)";
                        e.target.style.filter = "none";
                      }
                    }}
                    onFocus={(e) => {
                      e.target.style.borderBottomColor = "rgba(125,211,252,0.8)";
                      e.target.style.filter = "drop-shadow(0 3px 10px rgba(125,211,252,0.4))";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderBottomColor = "rgba(148,163,184,0.2)";
                      e.target.style.filter = "none";
                    }}
                    required
                    autoComplete="current-password"
                  />
                  {/* Animated underline glow bar */}
                  <div
                    className="absolute bottom-0 left-0 h-px w-0 transition-all duration-500 rounded-full group-focus-within/field:w-full"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(125,211,252,0.8), transparent)",
                      boxShadow: "0 0 8px rgba(125,211,252,0.6)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-0 bottom-3 transition-all duration-200"
                    style={{ color: "rgba(148,163,184,0.4)" }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.color = "rgba(125,211,252,0.9)";
                      e.currentTarget.style.filter = "drop-shadow(0 0 6px rgba(125,211,252,0.5))";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.color = "rgba(148,163,184,0.4)";
                      e.currentTarget.style.filter = "none";
                    }}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>

              {/* Circular LOGIN button */}
              <div className="flex-shrink-0 relative">
                {/* Outer pulsing ring — visible on hover */}
                {loginHover && !loading && (
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      margin: "-10px",
                      border: "1.5px solid rgba(125,211,252,0.3)",
                      animation: "glowRing 1.6s ease-in-out infinite",
                    }}
                  />
                )}
                {loginHover && !loading && (
                  <div
                    className="absolute inset-0 rounded-full pointer-events-none"
                    style={{
                      margin: "-20px",
                      border: "1px solid rgba(125,211,252,0.12)",
                      animation: "glowRing 1.6s ease-in-out infinite 0.4s",
                    }}
                  />
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-sm tracking-widest uppercase disabled:opacity-60 relative"
                  style={{
                    background: loading
                      ? "rgba(220,230,245,0.7)"
                      : "linear-gradient(145deg, #f0f4f8 0%, #d8e4f0 50%, #c8d8ec 100%)",
                    color: "#0b1929",
                    letterSpacing: "0.1em",
                    transition: "transform 0.25s ease, box-shadow 0.25s ease",
                    boxShadow: loginHover && !loading
                      ? "0 0 0 1px rgba(255,255,255,0.5), 0 12px 48px rgba(0,0,0,0.6), 0 0 50px rgba(125,211,252,0.5), 0 0 100px rgba(56,189,248,0.25)"
                      : "0 0 0 1px rgba(255,255,255,0.3), 0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(125,211,252,0.12)",
                    transform: loginHover && !loading ? "scale(1.07)" : "scale(1)",
                  }}
                  onMouseEnter={() => setLoginHover(true)}
                  onMouseLeave={() => setLoginHover(false)}
                >
                  {/* Shimmer overlay on hover */}
                  {loginHover && !loading && (
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none overflow-hidden"
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: 0, left: "-100%",
                          width: "60%", height: "100%",
                          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                          animation: "shimmer 1.2s ease infinite",
                        }}
                      />
                    </div>
                  )}
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <span className="relative z-10"
                      style={{
                        textShadow: loginHover ? "0 0 12px rgba(11,25,41,0.4)" : "none",
                      }}
                    >LOGIN</span>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                className="mt-6 text-xs px-3 py-2 rounded"
                style={{ color: "rgba(252,165,165,0.8)", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}
              >
                {error}
              </p>
            )}

            {/* Remember password */}
            <div className="mt-8 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRemember(!remember)}
                className="flex items-center gap-2 group/rem transition-all duration-200"
              >
                <div
                  className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all duration-200"
                  style={{
                    borderColor: remember ? "rgba(125,211,252,0.8)" : "rgba(148,163,184,0.3)",
                    background: remember ? "rgba(125,211,252,0.15)" : "transparent",
                    boxShadow: remember ? "0 0 8px rgba(125,211,252,0.4)" : "none",
                  }}
                >
                  {remember && (
                    <svg className="w-2 h-2" fill="none" stroke="rgba(125,211,252,0.9)" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-xs transition-colors duration-200 group-hover/rem:text-cyan-400"
                  style={{ color: "rgba(148,163,184,0.5)" }}
                >
                  Remember Password
                </span>
              </button>
            </div>
          </form>

          {/* Forget password button */}
          <div className="mt-16">
            <button
              type="button"
              className="px-5 py-1.5 text-xs font-medium tracking-wider rounded-full border transition-all duration-300"
              style={{
                borderColor: "rgba(125,211,252,0.3)",
                color: "rgba(125,211,252,0.6)",
                background: "transparent",
                letterSpacing: "0.08em",
                boxShadow: "none",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(125,211,252,0.06)";
                e.currentTarget.style.borderColor = "rgba(125,211,252,0.9)";
                e.currentTarget.style.color = "rgba(125,211,252,1)";
                e.currentTarget.style.boxShadow =
                  "0 0 12px rgba(125,211,252,0.35), 0 0 28px rgba(125,211,252,0.15), inset 0 0 10px rgba(125,211,252,0.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "rgba(125,211,252,0.3)";
                e.currentTarget.style.color = "rgba(125,211,252,0.6)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Forget password?
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}
