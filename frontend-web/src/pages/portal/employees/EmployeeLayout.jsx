import React from "react";
import PortalLayout from "../PortalLayout";

export default function EmployeeLayout({ children, title }) {
  return (
    <PortalLayout title={title || "Employees"}>
      {children}
    </PortalLayout>
  );
}
