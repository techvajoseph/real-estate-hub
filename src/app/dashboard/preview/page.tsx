import type { Metadata } from "next";
import { Dashboard } from "@/components/dashboard/dashboard";
import { demoDashboard } from "@/lib/dashboard/demo";
import { LandlordDashboard } from "@/components/landlord/landlord-dashboard";
import { landlordPreview } from "@/lib/landlord/demo";
import { BuyerDashboard } from "@/components/buyer/buyer-dashboard";
import { buyerPreview } from "@/lib/buyer/data";
import { getMarketRentals, rentalFromMarketplace } from "@/lib/landlord/data";

export const metadata: Metadata = {
  title: "Dashboard preview",
  robots: { index: false, follow: false },
};
export default async function DashboardPreview({
  searchParams,
}: PageProps<"/dashboard/preview">) {
  const { role } = await searchParams;
  if (role === "landlord")
    return (
      <LandlordDashboard
        initialData={landlordPreview(await rentalFromMarketplace(), await getMarketRentals())}
      />
    );
  if (role === "buyer")
    return <BuyerDashboard initialData={await buyerPreview()} />;
  return <Dashboard initialData={demoDashboard("seller")} />;
}
