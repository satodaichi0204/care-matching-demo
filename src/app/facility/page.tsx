import type { Metadata } from "next";
import { Suspense } from "react";
import FacilityDashboard from "@/components/FacilityDashboard";
import RoleGate from "@/components/RoleGate";

export const metadata: Metadata = { title: "施設担当者のページ" };

export default function FacilityPage() {
  return (
    <Suspense>
      <RoleGate role="facility">
        <FacilityDashboard />
      </RoleGate>
    </Suspense>
  );
}
