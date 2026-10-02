"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { runBuyerSearch } from "@/lib/buyer/data";
import type { BuyerSearchResult } from "@/lib/buyer/types";
import { propertyFiltersSchema } from "@/lib/properties";
import { createClient } from "@/lib/supabase/server";

/** Dashboard search: same filters and queries as the public Buy page. */
export async function buyerSearch(raw: unknown): Promise<{ data?: BuyerSearchResult; error?: string }> {
  const parsed = propertyFiltersSchema.safeParse(raw);
  if (!parsed.success) return { error: "Those filters couldn't be applied." };
  try {
    return { data: await runBuyerSearch(parsed.data) };
  } catch (e) {
    console.error("[buyerSearch]", e);
    return { error: "We couldn't load homes right now. Please try again." };
  }
}

/** Save or un-save a marketplace home for the signed-in buyer. */
export async function setSavedHome(propertyId: string, saved: boolean): Promise<{ error?: string }> {
  const id = z.string().uuid().safeParse(propertyId);
  if (!id.success) return { error: "That home is no longer available." };
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in to save homes." };

  const db = await createClient();
  const { error } = saved
    ? await db.from("favorites").upsert({ user_id: user.id, property_id: id.data }, { ignoreDuplicates: true })
    : await db.from("favorites").delete().eq("user_id", user.id).eq("property_id", id.data);
  if (error) {
    console.error("[setSavedHome]", error);
    return { error: "We couldn't update your saved homes. Please try again." };
  }
  revalidatePath("/dashboard");
  return {};
}
