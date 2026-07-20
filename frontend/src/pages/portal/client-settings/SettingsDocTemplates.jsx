import React from "react";
import { useTheme } from "../../../contexts/ThemeContext";

export default function SettingsDocTemplates() {
  const { isDark } = useTheme();
  return (
    <div className="p-6 max-w-2xl">
      <h2 className={`text-xl font-semibold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>Document Templates</h2>
      <p className={`text-sm mb-8 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
        Create and manage document templates for offer letters, appointment letters, NDAs, and more.
      </p>
      <div className={`border-2 border-dashed rounded-xl p-12 text-center
        ${isDark ? "border-gray-700 bg-gray-800/40" : "border-gray-200 bg-gray-50"}`}>
        <svg className="mx-auto mb-4 opacity-40" width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className={`text-base font-medium mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}>Document Templates</p>
        <p className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
          Template management — offer letters, appointment letters, NDAs, and HR documents — coming soon.
        </p>
      </div>
    </div>
  );
}
