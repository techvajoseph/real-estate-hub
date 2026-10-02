"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { enrichPending, enrichProperty, MAX_DETAILS_PER_RUN } from "@/lib/hasdata/ingest";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const sourceSchema = z.object({
  name: z.string().trim().min(1).max(100),
  provider: z.enum(["zillow", "redfin"]),
  keyword: z.string().trim().min(2).max(200),
  listingType: z.enum(["for_sale", "for_rent", "sold"]),
  maxPages: z.coerce.number().int().min(1).max(20),
});

// RLS on import_sources already restricts these to admins; requireAdmin gives a clean redirect.

export async function createImportSource(formData: FormData) {
  await requireAdmin();
  const s = sourceSchema.parse(Object.fromEntries(formData));
  const supabase = await createClient();
  const { error } = await supabase.from("import_sources").insert({
    name: s.name,
    provider: s.provider,
    keyword: s.keyword,
    listing_type: s.listingType,
    max_pages: s.maxPages,
  });
  if (error) throw error;
  revalidatePath("/admin/import");
}

export async function toggleImportSource(formData: FormData) {
  await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const isActive = formData.get("isActive") === "true";
  const supabase = await createClient();
  await supabase.from("import_sources").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/import");
}

export async function deleteImportSource(formData: FormData) {
  await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("import_sources").delete().eq("id", id);
  revalidatePath("/admin/import");
}

/** Fetch full details for the newest listings that don't have them yet. */
export async function enrichPendingListings(formData: FormData) {
  await requireAdmin();
  const limit = z.coerce.number().int().min(1).max(MAX_DETAILS_PER_RUN).parse(formData.get("limit"));
  await enrichPending({ limit });
  revalidatePath("/admin/import");
  revalidatePath("/properties");
}

/** (Re)fetch full details for one property — used on the property page. */
export async function refreshPropertyDetails(formData: FormData) {
  await requireAdmin();
  const id = z.string().uuid().parse(formData.get("propertyId"));
  const { data: property, error } = await createAdminClient()
    .from("properties")
    .select("id, provider, url")
    .eq("id", id)
    .single();
  if (error) throw error;
  await enrichProperty(property);
  revalidatePath(`/properties/${id}`);
}
