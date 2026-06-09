import React from "react";
import PortalLayout from "../PortalLayout";

export default function UserManagementLayout({ children, title }) {
  return (
    <PortalLayout title={title || "User Management"}>
      {children}
    </PortalLayout>
  );
}
