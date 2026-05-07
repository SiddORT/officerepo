import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    title: "Multi-Tenant Architecture",
    desc: "Each organization gets a fully isolated environment. Data never bleeds between tenants — guaranteed at the database level.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: "Role-Based Access Control",
    desc: "Fine-grained permissions for superadmins, tenant admins, managers, and employees — all enforced at the API layer.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    title: "Per-Tenant Feature Flags",
    desc: "Enable or disable modules for individual organizations. Roll out features gradually without touching their core data.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: "Employee & HR Modules",
    desc: "Built-in employee management, department structure, and HR workflows — ready to extend with your own modules.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "JWT Auth & Secret Rotation",
    desc: "Access and refresh tokens with seamless secret rotation. Old tokens stay valid during the grace period — zero user disruption.",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    title: "Subscription & Plan Management",
    desc: "Starter, Growth, and Enterprise plans with per-tenant assignment. Extend billing logic without rearchitecting the platform.",
  },
];

const stats = [
  { value: "100%", label: "Tenant Isolation" },
  { value: "< 50ms", label: "Auth Response" },
  { value: "∞", label: "Tenants Supported" },
  { value: "0", label: "Config to Start" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#030311] text-white overflow-x-hidden">

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-indigo-700/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 -left-60 w-[500px] h-[500px] bg-violet-700/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-40 right-1/3 w-[400px] h-[400px] bg-cyan-700/10 rounded-full blur-[100px]" />
      </div>

      {/* Navbar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/5"
        style={{ background: "rgba(3, 3, 17, 0.7)", backdropFilter: "blur(20px)" }}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center"
              style={{ boxShadow: "0 0 12px rgba(99,102,241,0.6)" }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">Office Repo</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#stats" className="hover:text-white transition-colors">Platform</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                style={{ boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
                style={{ boxShadow: "0 0 16px rgba(99,102,241,0.4)" }}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium text-indigo-300 border border-indigo-500/30 mb-8"
            style={{ background: "rgba(99,102,241,0.1)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Production-Ready Multi-Tenant SaaS Foundation
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            The Operating System{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #818cf8, #a78bfa, #67e8f9)" }}
            >
              for Modern Teams
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A fully-isolated multi-tenant platform with JWT auth, role-based access,
            feature flags, and employee management — built to scale from day one.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-8 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all text-base"
                style={{ boxShadow: "0 0 30px rgba(99,102,241,0.5)" }}
              >
                Open Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="px-8 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all text-base"
                  style={{ boxShadow: "0 0 30px rgba(99,102,241,0.5)" }}
                >
                  Get Started
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="px-8 py-3.5 rounded-xl font-semibold text-gray-300 border border-white/10 hover:border-white/20 hover:text-white transition-all text-base"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hero glass card preview */}
        <div className="max-w-3xl mx-auto mt-20 relative">
          <div
            className="rounded-2xl border border-white/10 p-6 overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 0 60px rgba(99,102,241,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 mx-4 h-6 rounded-md bg-white/5 flex items-center px-3">
                <span className="text-xs text-gray-500">https://officerepo.app/dashboard</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["Tenants", "Active Plans", "Feature Flags"].map((label, i) => (
                <div
                  key={label}
                  className="rounded-xl p-4 border border-white/5"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-bold text-white">{["24", "3", "12"][i]}</p>
                  <p className="text-xs text-indigo-400 mt-1">↑ {["8%", "100%", "4 new"][i]}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-white/5 p-4" style={{ background: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-400">Recent Tenants</p>
                <span className="text-xs text-indigo-400 px-2 py-0.5 rounded-full bg-indigo-500/10">Live</span>
              </div>
              {["Acme Corp", "Globex Inc", "Initech Ltd"].map((name) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-gray-300">{name}</span>
                  <span className="text-xs text-green-400 px-2 py-0.5 rounded-full bg-green-500/10">Active</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: "0 0 80px rgba(99,102,241,0.08)" }} />
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/5"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            {stats.map(({ value, label }) => (
              <div
                key={label}
                className="p-8 text-center"
                style={{ background: "rgba(3,3,17,0.8)" }}
              >
                <p
                  className="text-4xl font-extrabold mb-2 bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, #818cf8, #67e8f9)" }}
                >
                  {value}
                </p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-indigo-400 mb-3 uppercase tracking-widest">Platform Capabilities</p>
            <h2 className="text-4xl font-bold text-white">Everything you need, nothing you don't</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto">
              Built on FastAPI and React with a PostgreSQL backbone — every layer is production-grade from day one.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl p-6 border border-white/5 hover:border-indigo-500/30 transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  backdropFilter: "blur(10px)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 text-indigo-400 border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors"
                  style={{ background: "rgba(99,102,241,0.1)" }}
                >
                  {icon}
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="rounded-3xl p-12 border border-white/5 relative overflow-hidden"
            style={{
              background: "rgba(99,102,241,0.06)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-600/20 rounded-full blur-3xl" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 relative">Ready to get started?</h2>
            <p className="text-gray-400 mb-8 relative">
              Sign in to your workspace and manage your organization with full platform controls.
            </p>
            {user ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-8 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all"
                style={{ boxShadow: "0 0 30px rgba(99,102,241,0.5)" }}
              >
                Open Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="px-8 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all relative"
                style={{ boxShadow: "0 0 30px rgba(99,102,241,0.5)" }}
              >
                Sign In to Your Workspace
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white">Office Repo</span>
          </div>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Office Repo. Multi-tenant SaaS platform.</p>
        </div>
      </footer>
    </div>
  );
}
