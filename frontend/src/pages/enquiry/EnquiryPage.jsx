import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import PhoneInput from "../../components/ui/PhoneInput";
import Checkbox from "../../components/ui/Checkbox";
import ThemeToggle from "../../components/ui/ThemeToggle";

import { enquiriesApi } from "../../services/apiClient";
import {
  INTERESTED_MODULES,
  MESSAGE_MIN_LEN,
  MESSAGE_MAX_LEN,
  NAME_MIN_LEN,
  NAME_MAX_LEN,
  COMPANY_MIN_LEN,
  COMPANY_MAX_LEN,
  ENQUIRY_SUCCESS_MESSAGE,
  MARKETING_CONSENT_LABEL,
} from "../../constants/enquiry";
import {
  required,
  minLen,
  maxLen,
  isEmail,
  isPhone,
  isName,
  noXss,
  firstError,
} from "../../utils/validation";

const EMPTY = {
  full_name: "",
  work_email: "",
  company_name: "",
  interested_module: "",
  message: "",
};

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

function validateField(name, value) {
  switch (name) {
    case "full_name":
      return firstError(
        required(value, "Full name"),
        minLen(value, NAME_MIN_LEN, "Full name"),
        maxLen(value, NAME_MAX_LEN, "Full name"),
        isName(value, "Full name")
      );
    case "work_email":
      return firstError(required(value, "Work email"), isEmail(value, "Work email"));
    case "company_name":
      return firstError(
        required(value, "Company name"),
        minLen(value, COMPANY_MIN_LEN, "Company name"),
        maxLen(value, COMPANY_MAX_LEN, "Company name"),
        noXss(value, "Company name")
      );
    case "message":
      return firstError(
        required(value, "Message"),
        minLen(value, MESSAGE_MIN_LEN, "Message"),
        maxLen(value, MESSAGE_MAX_LEN, "Message"),
        noXss(value, "Message")
      );
    default:
      return "";
  }
}

export default function EnquiryPage() {
  const [form, setForm] = useState(EMPTY);
  const [dialCode, setDialCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [consentError, setConsentError] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState(""); // honeypot — hidden anti-bot field
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState("");

  const fullPhone = useMemo(
    () => `${dialCode} ${phone}`.trim(),
    [dialCode, phone]
  );

  // Cloudflare Turnstile — render the widget explicitly when a site key is
  // configured, and bind callbacks so the token reaches React state. The whole
  // block is inert (and submissions work unguarded) when no key is set.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || submitted) return;

    let cancelled = false;
    const renderWidget = () => {
      if (cancelled || !window.turnstile || !turnstileRef.current) return;
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (token) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
    };

    const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    let script = null;
    if (window.turnstile) {
      renderWidget();
    } else {
      script = document.querySelector('script[data-turnstile="1"]');
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        script.dataset.turnstile = "1";
        document.head.appendChild(script);
      }
      script.addEventListener("load", renderWidget);
    }

    return () => {
      cancelled = true;
      if (script) script.removeEventListener("load", renderWidget);
      if (widgetIdRef.current !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
      }
      widgetIdRef.current = null;
    };
  }, [submitted]);

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (touched[name]) {
      setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
    }
  };

  const blurField = (name) => {
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((e) => ({ ...e, [name]: validateField(name, form[name]) }));
  };

  const validatePhone = () =>
    firstError(required(phone, "Phone number"), isPhone(fullPhone, "Phone number"));

  const validateAll = () => {
    const next = {
      full_name: validateField("full_name", form.full_name),
      work_email: validateField("work_email", form.work_email),
      phone_number: validatePhone(),
      company_name: validateField("company_name", form.company_name),
      message: validateField("message", form.message),
    };
    setErrors(next);
    setTouched({
      full_name: true,
      work_email: true,
      phone_number: true,
      company_name: true,
      message: true,
    });
    return Object.values(next).every((v) => !v);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    const formValid = validateAll();
    const consentValid = consentGiven;
    setConsentError(
      consentValid ? "" : "You must agree to the privacy terms before submitting."
    );
    if (!formValid || !consentValid) return;

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setServerError("Please complete the verification challenge before submitting.");
      return;
    }

    setSubmitting(true);
    try {
      await enquiriesApi.submit({
        full_name: form.full_name.trim(),
        work_email: form.work_email.trim(),
        phone_number: fullPhone,
        company_name: form.company_name.trim(),
        interested_module: form.interested_module || null,
        message: form.message.trim(),
        consent_given: consentGiven,
        marketing_consent: marketingConsent,
        website_url: websiteUrl,
        referrer_url: document.referrer || null,
        turnstile_token: turnstileToken || null,
      });
      setSubmitted(true);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.message || err?.response?.data?.detail;
      if (status === 429) {
        setServerError(
          typeof detail === "string"
            ? detail
            : "Too many enquiries from your network. Please try again later."
        );
      } else if (status === 409) {
        setServerError(
          typeof detail === "string"
            ? detail
            : "We've already received this enquiry. Our team will reach out shortly."
        );
      } else if (status === 400) {
        setServerError(
          typeof detail === "string"
            ? detail
            : "Verification failed. Please complete the challenge again."
        );
        // Token is single-use / may be stale — reset the widget so the user can retry.
        setTurnstileToken("");
        if (widgetIdRef.current !== null && window.turnstile) {
          try {
            window.turnstile.reset(widgetIdRef.current);
          } catch {
            /* no-op */
          }
        }
      } else {
        setServerError("Something went wrong. Please try again in a moment.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(EMPTY);
    setPhone("");
    setDialCode("+91");
    setConsentGiven(false);
    setMarketingConsent(false);
    setConsentError("");
    setWebsiteUrl("");
    setTurnstileToken("");
    if (widgetIdRef.current !== null && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        /* no-op */
      }
    }
    setErrors({});
    setTouched({});
    setServerError("");
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen layout-root flex flex-col">
      {/* Top bar */}
      <header className="layout-topbar">
        <div className="max-w-5xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold t-heading">Office Repo</span>
            <span className="text-xs t-muted hidden sm:inline">
              Unified Workplace Management
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-secondary hidden sm:inline-flex">
              Sign in
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 sm:py-14">
        {submitted ? (
          <div className="card text-center py-14 px-8">
            <div
              className="mx-auto mb-5 flex items-center justify-center rounded-full"
              style={{
                width: 64,
                height: 64,
                background: "rgba(16,185,129,0.12)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <svg
                className="w-8 h-8"
                style={{ color: "#10b981" }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold t-heading mb-2">Enquiry received</h2>
            <p className="t-body max-w-md mx-auto">{ENQUIRY_SUCCESS_MESSAGE}</p>
            <div className="mt-7 flex items-center justify-center gap-3">
              <Link to="/" className="btn-secondary">
                Back to home
              </Link>
              <button type="button" onClick={resetForm} className="btn-primary">
                Send another
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold t-heading">
                Get in touch
              </h1>
              <p className="t-body mt-2 max-w-xl">
                Tell us about your team and what you're looking for. Our team will
                reach out shortly.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="card">
              {serverError && (
                <div
                  className="mb-5 rounded-lg px-4 py-3 text-sm"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444",
                  }}
                >
                  {serverError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Input
                  label="Full Name"
                  required
                  name="full_name"
                  placeholder="Jane Doe"
                  value={form.full_name}
                  onChange={(e) => setField("full_name", e.target.value)}
                  onBlur={() => blurField("full_name")}
                  error={touched.full_name ? errors.full_name : ""}
                  autoComplete="name"
                />

                <Input
                  label="Work Email"
                  required
                  type="email"
                  name="work_email"
                  placeholder="jane@company.com"
                  value={form.work_email}
                  onChange={(e) => setField("work_email", e.target.value)}
                  onBlur={() => blurField("work_email")}
                  error={touched.work_email ? errors.work_email : ""}
                  autoComplete="email"
                />

                <PhoneInput
                  label="Phone Number"
                  required
                  dialCode={dialCode}
                  onDialCodeChange={setDialCode}
                  number={phone}
                  onNumberChange={(v) => {
                    setPhone(v);
                    if (touched.phone_number)
                      setErrors((er) => ({ ...er, phone_number: "" }));
                  }}
                  error={touched.phone_number ? errors.phone_number : ""}
                />

                <Input
                  label="Company Name"
                  required
                  name="company_name"
                  placeholder="Acme Corporation"
                  value={form.company_name}
                  onChange={(e) => setField("company_name", e.target.value)}
                  onBlur={() => blurField("company_name")}
                  error={touched.company_name ? errors.company_name : ""}
                  autoComplete="organization"
                />

                <Select
                  label="Interested Module"
                  className="sm:col-span-2"
                  name="interested_module"
                  placeholder="Select a module (optional)"
                  options={INTERESTED_MODULES}
                  value={form.interested_module}
                  onChange={(e) => setField("interested_module", e.target.value)}
                  hint="Optional — what would you like to explore first?"
                />

                <Textarea
                  label="Message"
                  required
                  className="sm:col-span-2"
                  name="message"
                  rows={5}
                  placeholder="Tell us a bit about your team size and what you'd like to achieve..."
                  value={form.message}
                  maxLength={MESSAGE_MAX_LEN}
                  showCount
                  onChange={(e) => setField("message", e.target.value)}
                  onBlur={() => blurField("message")}
                  error={touched.message ? errors.message : ""}
                  hint={`Minimum ${MESSAGE_MIN_LEN} characters.`}
                />
              </div>

              {/* Consent section */}
              <div className="mt-6 pt-6 space-y-4" style={{ borderTop: "1px solid var(--border)" }}>
                <Checkbox
                  required
                  name="consent_given"
                  checked={consentGiven}
                  onChange={(e) => {
                    setConsentGiven(e.target.checked);
                    if (e.target.checked) setConsentError("");
                  }}
                  error={consentError}
                >
                  I agree to Office Repo storing and processing my personal
                  information for the purpose of responding to my enquiry. You can
                  read how we handle your data in our{" "}
                  <Link
                    to="/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-500 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </Checkbox>

                <Checkbox
                  name="marketing_consent"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                >
                  {MARKETING_CONSENT_LABEL}
                </Checkbox>
              </div>

              {/* Honeypot — visually hidden, must remain empty (anti-bot) */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "-9999px",
                  width: 1,
                  height: 1,
                  overflow: "hidden",
                }}
              >
                <label>
                  Leave this field empty
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    name="website_url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                  />
                </label>
              </div>

              {/* Cloudflare Turnstile mount point — populated by the effect above
                  only when VITE_TURNSTILE_SITE_KEY is configured. */}
              {TURNSTILE_SITE_KEY && <div ref={turnstileRef} className="mt-5" />}

              <div className="mt-7 flex items-center justify-between gap-4">
                <p className="text-xs t-muted">
                  <span className="text-red-500">*</span> Required fields
                </p>
                <button
                  type="submit"
                  className="btn-primary px-6"
                  disabled={submitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                >
                  {submitting ? "Sending..." : "Request Demo"}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
