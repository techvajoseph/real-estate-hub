"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getLandlordData, rentalFromMarketplace } from "@/lib/landlord/data";
import { landlordActionSchema } from "@/lib/landlord/schema";
import type { LandlordData } from "@/lib/landlord/types";

export async function manageRental(
  input: unknown,
): Promise<{ error?: string; data?: LandlordData }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to manage your rental portfolio." };
  const parsed = landlordActionSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: parsed.error.issues[0]?.message || "Please check the form.",
    };
  const db = await createClient();
  const { data: workspace, error: workspaceError } = await db
    .from("workspaces")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (workspaceError || workspace?.role !== "landlord")
    return { error: "Select the Landlord workspace to manage rentals." };
  const action = parsed.data;
  let result: { error: { message: string } | null; data: unknown[] | null };
  if (action.action === "save_rental") {
    const { id, ...values } = action.values;
    result = id
      ? await db
          .from("portfolio_listings")
          .update(values)
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("kind", "rent")
          .select("id")
      : await db
          .from("portfolio_listings")
          .insert({ ...values, kind: "rent", user_id: user.id })
          .select("id");
  } else if (action.action === "delete_rental") {
    result = await db
      .from("portfolio_listings")
      .delete()
      .eq("id", action.id)
      .eq("user_id", user.id)
      .eq("kind", "rent")
      .select("id");
  } else if (action.action === "import_rental") {
    const source = await rentalFromMarketplace(action.sourceId);
    if (!source) return { error: "This source rental is no longer available." };
    const { data: existing, error: checkError } = await db
      .from("portfolio_listings")
      .select("id")
      .eq("user_id", user.id)
      .eq("source_property_id", action.sourceId)
      .limit(1);
    if (checkError)
      return { error: "Rental management is temporarily unavailable." };
    if (existing?.length)
      return { error: "This rental is already in your portfolio." };
    const { id: _id, ...values } = source;
    void _id;
    result = await db
      .from("portfolio_listings")
      .insert({ ...values, user_id: user.id })
      .select("id");
  } else if (action.action === "save_transaction") {
    const { id, ...values } = action.values;
    if (
      values.status === "paid" &&
      values.occurred_on > new Date().toISOString().slice(0, 10)
    )
      return {
        error: "A received payment or paid expense cannot have a future date.",
      };
    const { data: property } = await db
      .from("portfolio_listings")
      .select("id")
      .eq("id", values.property_id)
      .eq("user_id", user.id)
      .eq("kind", "rent")
      .maybeSingle();
    if (!property) return { error: "Choose a rental in your own portfolio." };
    result = id
      ? await db
          .from("rental_transactions")
          .update(values)
          .eq("id", id)
          .eq("user_id", user.id)
          .select("id")
      : await db
          .from("rental_transactions")
          .insert({ ...values, user_id: user.id })
          .select("id");
  } else if (action.action === "mark_paid") {
    result = await db
      .from("rental_transactions")
      .update({
        status: "paid",
        occurred_on: new Date().toISOString().slice(0, 10),
      })
      .eq("id", action.id)
      .eq("user_id", user.id)
      .select("id");
  } else {
    result = await db
      .from("rental_transactions")
      .delete()
      .eq("id", action.id)
      .eq("user_id", user.id)
      .select("id");
  }
  if (result.error)
    return { error: "We couldn’t save that change. Please try again." };
  if (!result.data?.length)
    return { error: "This record is no longer available in your account." };
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/landlord");
  return { data: await getLandlordData(user) };
}
