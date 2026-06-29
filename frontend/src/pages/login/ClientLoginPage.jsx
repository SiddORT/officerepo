import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import { portalLookupApi } from "../../services/apiClient";

const ACCENT = "#00aeec";
const EASE_CINEMA = [0.16, 1, 0.3, 1];

const ORBS = [
  { color: "rgba(0,174,236,0.45)", size: 500, top: "-14%", left: "-10%", dur: 18, move: [0, 60, -30, 0], moveY: [0, -40, 30, 0] },
  { color: "rgba(0,100,180,0.35)", size: 420, bottom: "-18%", right: "-12%", dur: 22, move: [0, -50, 40, 0], moveY: [0, 40, -30, 0] },
  { color: "rgba(0,174,236,0.25)", size: 280, top: "50%", right: "20%", dur: 15, move: [0, 40, -40, 0], moveY: [0, -30, 30, 0] },
];

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } };
const fadeSlide = {
  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_CINEMA } },
};

function AnimatedBackground({ reduced }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          aria-hidden="true"
          animate={reduced ? {} : { x: o.move, y: o.moveY, scale: [1, 1.1, 0.96, 1] }}
          transition={reduced ? {} : { duration: o.dur, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: o.top, left: o.left, right: o.right, bottom: o.bottom,
            width: o.size, height: o.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
            filter: "blur(50px)",
          }}
        />
      ))}
    </div>
  );
}

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

  const cardRef = useRef(null);
  const mvX = useMotionValue(0);
  const mvY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mvY, [-0.5, 0.5], [6, -6]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(mvX, [-0.5, 0.5], [-6, 6]), { stiffness: 150, damping: 18 });

  function handleMouseMove(e) {
    if (reduced) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mvX.set((e.clientX - rect.left) / rect.width - 0.5);
    mvY.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleMouseLeave() { mvX.set(0); mvY.set(0); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await portalLookupApi.lookupWorkspace(email.trim());
      const { subdomain } = res.data.data;
      navigate(`/portal/${subdomain}/login?email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      const msg = err?.response?.data?.detail;
      if (err?.response?.status === 404) {
        setError("No workspace found for this email address. Check the email or contact your admin.");
      } else {
        setError(msg || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: focused ? "rgba(0,174,236,0.06)" : "rgba(255,255,255,0.04)",
    border: `1.5px solid ${focused ? ACCENT : "rgba(255,255,255,0.12)"}`,
    borderRadius: 10, color: "#fff", fontSize: 15, outline: "none",
    padding: "13px 16px 13px 46px",
    transition: "border-color 0.2s, background 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #050c18 0%, #091525 50%, #050c18 100%)",
      position: "relative", overflow: "hidden",
    }}>
      <AnimatedBackground reduced={reduced} />

      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          position: "relative", zIndex: 10,
          width: "100%", maxWidth: 400, margin: "0 16px",
          rotateX: reduced ? 0 : rotateX,
          rotateY: reduced ? 0 : rotateY,
          transformStyle: "preserve-3d", perspective: 800,
        }}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: EASE_CINEMA }}
      >
        <div style={{
          background: "rgba(8,20,40,0.75)",
          border: "1px solid rgba(0,174,236,0.15)",
          borderRadius: 20, padding: "36px 32px 32px",
          backdropFilter: "blur(24px)",
          boxShadow: "0 8px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          <motion.div variants={stagger} initial="hidden" animate="show">
            {/* Back */}
            <motion.button
              variants={fadeSlide}
              onClick={() => navigate("/")}
              style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.45)",
                fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 24,
                display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.02em",
              }}
              whileHover={{ color: "#fff" }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to home
            </motion.button>

            {/* Logo / title */}
            <motion.div variants={fadeSlide} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
                Sign in to Office Repo
              </div>
            </motion.div>
            <motion.div variants={fadeSlide} style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 28 }}>
              Enter your work email and we'll find your workspace.
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <motion.div variants={fadeSlide} style={{ marginBottom: 20 }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                    color: focused ? ACCENT : "rgba(255,255,255,0.35)",
                    transition: "color 0.2s", pointerEvents: "none",
                  }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                    style={inputStyle}
                  />
                </div>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 8, padding: "10px 14px", fontSize: 13,
                    color: "#fca5a5", marginBottom: 16,
                  }}
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                variants={fadeSlide}
                type="submit"
                disabled={loading}
                whileHover={loading ? {} : { scale: 1.02, boxShadow: "0 0 40px rgba(0,174,236,0.5)" }}
                whileTap={loading ? {} : { scale: 0.98 }}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                  background: loading ? "rgba(0,174,236,0.4)" : "linear-gradient(135deg, #00aeec, #0090c8)",
                  color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "-0.01em", transition: "background 0.2s",
                  boxShadow: "0 0 24px rgba(0,174,236,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%" }}
                    />
                    Finding workspace…
                  </>
                ) : (
                  <>
                    Continue
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </motion.button>
            </form>

            {/* Footer */}
            <motion.div variants={fadeSlide} style={{
              marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.07)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                Admin access?{" "}
                <a
                  href="/admin"
                  style={{ color: "rgba(0,174,236,0.7)", textDecoration: "none" }}
                  onMouseEnter={e => e.target.style.color = ACCENT}
                  onMouseLeave={e => e.target.style.color = "rgba(0,174,236,0.7)"}
                >
                  Sign in here
                </a>
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>by ort_</span>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
