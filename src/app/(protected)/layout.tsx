import React from "react";

import { RefineRoot } from "@/components/refine/RefineRoot";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <RefineRoot>{children}</RefineRoot>;
}


