import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Link } from "react-router-dom";

const QUICK_LINKS = [
  { label: "Enquiries", desc: "Triage website enquiries", link: "/superadmin/enquiries", accent: "#8b5cf6" },
  { label: "Leads", desc: "Manage your sales pipeline", link: "/superadmin/leads", accent: "#00aeec" },
  { label: "Calendar", desc: "Demos, follow-ups & next actions", link: "/superadmin/leads/calendar", accent: "#10b981" },
  { label: "Security", desc: "Secret rotation & status", link: "/superadmin/security", accent: "#f59e0b" },
  { label: "API Docs", desc: "Interactive Swagger UI", link: `${window.location.origin.replace(":5000", ":8000")}/docs`, external: true, accent: "#ff7a1a" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold t-heading">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
        </h2>
        <p className="t-muted mt-1">
          Lead Management & Sales Pipeline — everything in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_LINKS.map((card) => (
          <div
            key={card.label}
            className="card hover:scale-[1.01] transition-transform cursor-pointer"
            style={{ borderLeftWidth: 3, borderLeftColor: card.accent }}
          >
            <h3 className="font-semibold t-heading text-base">{card.label}</h3>
            <p className="text-sm t-muted mt-1 mb-4">{card.desc}</p>
            {card.external ? (
              <a href={card.link} target="_blank" rel="noreferrer"
                className="text-sm font-medium t-accent hover:underline">
                Open &rarr;
              </a>
            ) : (
              <Link to={card.link} className="text-sm font-medium t-accent hover:underline">
                Go &rarr;
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
