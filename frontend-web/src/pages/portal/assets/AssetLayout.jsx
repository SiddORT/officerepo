import React from "react";
import PortalLayout from "../PortalLayout";

export default function AssetLayout({ children, title }) {
  return (
    <PortalLayout title={title || "Asset Management"}>
      {children}
    </PortalLayout>
  );
}
