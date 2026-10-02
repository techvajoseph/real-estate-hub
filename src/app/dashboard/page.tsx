import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard/data";
import { Dashboard } from "@/components/dashboard/dashboard";
import { LandlordDashboard } from "@/components/landlord/landlord-dashboard";
import { getLandlordData } from "@/lib/landlord/data";

export const metadata: Metadata = { title: "Your workspace" };
export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData(user);
  if (data.role === "landlord")
    return <LandlordDashboard initialData={await getLandlordData(user)} />;
  return <Dashboard initialData={data} />;
}
