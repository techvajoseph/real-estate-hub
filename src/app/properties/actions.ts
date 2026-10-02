"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { propertyFiltersSchema } from "@/lib/properties";
import { createClient } from "@/lib/supabase/server";

export async function toggleFavorite(formData: FormData) {
  const propertyId = z.string().uuid().parse(formData.get("propertyId"));
  const user = await requireUser(`/properties/${propertyId}`);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("user_id", user.id)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("property_id", propertyId);
  } else {
    await supabase.from("favorites").insert({ user_id: user.id, property_id: propertyId });
  }

  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/dashboard");
}

export type SaveSearchState =
  | { status: "idle" }
  | { status: "saved"; name: string }
  | { status: "error"; message: string };

const saveSearchSchema = z.object({
  name: z.string().trim().min(1, "Give your search a name.").max(100, "Keep the name under 100 characters."),
  filters: z.string().max(2000),
});

export async function saveSearch(_prev: SaveSearchState, formData: FormData): Promise<SaveSearchState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Please sign in to save searches." };

  const parsed = saveSearchSchema.safeParse({ name: formData.get("name"), filters: formData.get("filters") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  let filters;
  try {
    // Strip undefined/empty values so the saved URL stays clean.
    filters = Object.fromEntries(
      Object.entries(propertyFiltersSchema.omit({ page: true }).parse(JSON.parse(parsed.data.filters))).filter(
        ([, v]) => v !== undefined && v !== "",
      ),
    );
  } catch {
    return { status: "error", message: "These filters couldn't be saved. Try searching again." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("saved_searches")
    .insert({ user_id: user.id, name: parsed.data.name, filters });
  if (error) {
    console.error("[saveSearch]", error);
    return { status: "error", message: "We couldn't save this search. Please try again." };
  }

  revalidatePath("/dashboard");
  return { status: "saved", name: parsed.data.name };
}

export async function deleteSavedSearch(formData: FormData) {
  const user = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("saved_searches").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
}
