import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLandlordData } from "@/lib/landlord/data";
import { LandlordDashboard } from "@/components/landlord/landlord-dashboard";

export default async function LandlordPage() {
  const user = await requireUser("/dashboard/landlord");
  const data = await getLandlordData(user);
  if (data.role !== "landlord") redirect("/dashboard");
  return <LandlordDashboard initialData={data} />;
}
