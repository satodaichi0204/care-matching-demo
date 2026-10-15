import type { Metadata } from "next";
import ApplicantDashboard from "@/components/ApplicantDashboard";
import RoleGate from "@/components/RoleGate";

export const metadata: Metadata = { title: "入居希望者のページ" };

export default function ApplicantPage() {
  return (
    <RoleGate role="applicant">
      <ApplicantDashboard />
    </RoleGate>
  );
}
