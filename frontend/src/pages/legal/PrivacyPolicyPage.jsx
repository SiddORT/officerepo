import React from "react";
import { Link } from "react-router-dom";

import ThemeToggle from "../../components/ui/ThemeToggle";
import {
  PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_EFFECTIVE_DATE,
} from "../../constants/enquiry";

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold t-heading mb-2">{title}</h2>
      <div className="t-body space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen layout-root flex flex-col">
      <header className="layout-topbar">
        <div className="max-w-5xl mx-auto w-full px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold t-heading">Office Repo</span>
            <span className="text-xs t-muted hidden sm:inline">
              Unified Workplace Management
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/contact" className="btn-secondary hidden sm:inline-flex">
              Contact us
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-10 sm:py-14">
        <div className="card">
          <h1 className="text-2xl sm:text-3xl font-bold t-heading">Privacy Policy</h1>
          <p className="t-muted text-xs mt-2">
            Version {PRIVACY_POLICY_VERSION} · Effective {PRIVACY_POLICY_EFFECTIVE_DATE}
          </p>

          <p className="t-body text-sm mt-5 leading-relaxed">
            This Privacy Policy explains how Office Repo collects, uses, stores and
            protects the personal information you provide through our website
            enquiry form, and the rights you have over that information.
          </p>

          <Section title="1. Information We Collect">
            <p>
              When you submit an enquiry we collect your name, work email, phone
              number, company name, your message, and any module you express
              interest in. We also record technical metadata (IP address, browser
              user agent and referring URL) to protect the form against spam and
              abuse.
            </p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>
              We use your information solely to respond to your enquiry and, where
              you have separately opted in, to send you product updates and
              marketing communications. Marketing consent is tracked independently
              and you may withdraw it at any time.
            </p>
          </Section>

          <Section title="3. Lawful Basis & Consent">
            <p>
              We process your enquiry on the basis of the consent you provide when
              submitting the form. The version of this policy in force at the time
              of your consent is recorded alongside your submission for
              accountability.
            </p>
          </Section>

          <Section title="4. Data Security">
            <p>
              Sensitive personal data — your email, phone number and message — is
              encrypted at rest. Access is restricted to authorised personnel, and
              our audit logs never record your raw contact details.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              We retain enquiry data only for as long as necessary to handle your
              request and meet our legal obligations, after which it is scheduled
              for deletion in line with our retention policy.
            </p>
          </Section>

          <Section title="6. Your Rights">
            <p>
              You have the right to access, correct, export or request deletion of
              your personal data (the “right to be forgotten”), and to withdraw
              consent at any time. To exercise any of these rights, contact us via
              the enquiry form.
            </p>
          </Section>

          <Section title="7. Contact">
            <p>
              For any privacy-related questions or requests, please{" "}
              <Link to="/contact" className="text-cyan-500 hover:underline">
                get in touch
              </Link>
              .
            </p>
          </Section>

          <div className="mt-10">
            <Link to="/contact" className="btn-primary">
              Back to enquiry form
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
