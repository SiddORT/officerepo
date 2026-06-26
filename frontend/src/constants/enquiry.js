/**
 * Centralized constants for the public enquiry form.
 * Keep INTERESTED_MODULES in sync with the backend constants.
 */

export const INTERESTED_MODULES = [
  { value: "employee", label: "Employee Management" },
  { value: "hrms", label: "HRMS" },
  { value: "assets", label: "Asset Management" },
  { value: "billing", label: "Billing & Subscriptions" },
  { value: "workflow", label: "Workflow Automation" },
  { value: "reports", label: "Reports & Analytics" },
];

export const MESSAGE_MIN_LEN = 20;
export const MESSAGE_MAX_LEN = 1000;
export const NAME_MIN_LEN = 2;
export const NAME_MAX_LEN = 100;
export const COMPANY_MIN_LEN = 2;
export const COMPANY_MAX_LEN = 150;

export const ENQUIRY_SUCCESS_MESSAGE =
  "Thank you for contacting Office Repo. Our team will reach out shortly.";

// Version of the published privacy policy (kept in sync with the backend
// PRIVACY_POLICY_VERSION setting). Shown on the Privacy Policy page.
export const PRIVACY_POLICY_VERSION = "1.0";
export const PRIVACY_POLICY_EFFECTIVE_DATE = "30 May 2026";

export const PRIVACY_CONSENT_LABEL =
  "I agree to Office Repo storing and processing my personal information for the purpose of responding to my enquiry.";
export const MARKETING_CONSENT_LABEL =
  "I would like to receive product updates, newsletters and marketing communications.";
