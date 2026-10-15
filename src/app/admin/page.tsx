import type { Metadata } from "next";
import AdminDashboard from "@/components/AdminDashboard";
import RoleGate from "@/components/RoleGate";

export const metadata: Metadata = { title: "管理者のページ" };

export default function AdminPage() {
  return (
    <RoleGate role="admin">
      <AdminDashboard />
    </RoleGate>
  );
}
