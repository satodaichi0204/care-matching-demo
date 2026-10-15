import type { Metadata } from "next";
import FacilitySearch from "@/components/FacilitySearch";

export const metadata: Metadata = { title: "施設を探す" };

export default function SearchPage() {
  return <FacilitySearch />;
}
