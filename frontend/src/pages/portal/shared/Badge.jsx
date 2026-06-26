import React from "react";

const STATUS_CLASS = {
  "Active":               "badge-active",
  "active":               "badge-active",
  "Verified":             "badge-active",
  "Approved":             "badge-active",
  "Open":                 "badge-active",
  "Joined":               "badge-active",
  "Selected":             "badge-active",
  "Won":                  "badge-active",
  "Available":            "badge-active",
  "Enabled":              "badge-active",
  "Accepted":             "badge-active",
  "Filled":               "badge-active",

  "Inactive":             "badge-inactive",
  "inactive":             "badge-inactive",
  "Closed":               "badge-inactive",
  "Withdrawn":            "badge-inactive",
  "Expired":              "badge-inactive",
  "expired":              "badge-danger",
  "Retired":              "badge-inactive",
  "Disabled":             "badge-inactive",
  "Cancelled":            "badge-inactive",

  "Draft":                "badge-neutral",
  "Applied":              "badge-neutral",
  "Not Started":          "badge-neutral",

  "Pending":              "badge-warning",
  "On Hold":              "badge-warning",
  "Screening":            "badge-warning",
  "Offered":              "badge-warning",
  "Maintenance":          "badge-warning",
  "In Review":            "badge-warning",

  "Submitted":            "badge-info",
  "Shortlisted":          "badge-info",
  "Sent":                 "badge-info",
  "In Use":               "badge-info",
  "Assigned":             "badge-info",
  "invited":              "badge-info",

  "Interview Scheduled":  "badge-purple",
  "In Progress":          "badge-purple",

  "Rejected":             "badge-danger",
  "Lost":                 "badge-danger",
  "Overdue":              "badge-danger",
};

export default function Badge({ status }) {
  const cls = STATUS_CLASS[status] || "badge-neutral";
  return <span className={cls}>{status}</span>;
}
