import React from "react";
import PortalLayout from "../PortalLayout";

export default function OrgLayout({ children, title }) {
  return (
    <PortalLayout title={title || "Organization"}>
      {children}
    </PortalLayout>
  );
}
