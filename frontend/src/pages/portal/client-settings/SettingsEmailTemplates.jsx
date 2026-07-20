import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";

export default function SettingsEmailTemplates() {
  const { isDark } = useTheme();
  return (
    <div className="p-6 max-w-2xl">
      <h2 className={`text-xl font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Email Templates</h2>
      <p className={`text-sm mb-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Customise transactional email templates for onboarding, payroll, leave approvals, and notifications.
      </p>
      <div className={`border-2 border-dashed rounded-xl p-12 text-center
        ${isDark ? "border-gray-700 bg-gray-800/40" : "border-gray-200 bg-gray-50"}`}>
        <svg className="mx-auto mb-4 opacity-40" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <p className={`text-base font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Email Templates</p>
        <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Rich email template builder with variable substitution and preview — coming soon.
        </p>
      </div>
    </div>
  );
}
