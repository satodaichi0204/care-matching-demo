import { Suspense } from "react";
import FacilityDetail from "@/components/FacilityDetail";
import { Skeleton } from "@/components/ui";

export default function FacilityPage() {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-56" />}>
      <FacilityDetail />
    </Suspense>
  );
}
