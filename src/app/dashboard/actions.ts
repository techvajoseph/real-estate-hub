"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/data";
import type { DashboardData } from "@/lib/dashboard/types";

const text = (max: number) => z.string().trim().min(1).max(max);
const money = z.coerce.number().finite().min(0).max(10_000_000_000);
const id = z.string().uuid();
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("role"),
    role: z.enum(["buyer", "seller", "landlord"]),
  }),
  z.object({
    action: z.literal("listing"),
    id: id.optional(),
    title: text(120),
    address: text(240),
    city: text(120),
    kind: z.enum(["sale", "rent"]),
    price: money,
    beds: z.coerce.number().int().min(0).max(100),
    baths: z.coerce.number().min(0).max(100),
    sqft: z.coerce.number().int().min(0).max(100_000_000),
    status: z.enum([
      "draft",
      "active",
      "under_offer",
      "sold",
      "rented",
      "archived",
    ]),
    photo: z
      .string()
      .max(2000)
      .refine(
        (value) => !value || /^https:\/\//i.test(value),
        "Use an HTTPS image URL.",
      ),
  }),
  z.object({
    action: z.literal("deal"),
    title: text(120),
    contact: z.string().trim().max(120),
    amount: money,
    kind: z.enum(["sale", "rent"]),
    stage: z.enum([
      "lead",
      "viewing",
      "offer",
      "negotiating",
      "closed",
      "lost",
    ]),
  }),
  z.object({
    action: z.literal("stage"),
    id,
    stage: z.enum([
      "lead",
      "viewing",
      "offer",
      "negotiating",
      "closed",
      "lost",
    ]),
  }),
  z.object({
    action: z.literal("appointment"),
    title: text(120),
    location: z.string().trim().max(240),
    starts_at: z.iso.datetime(),
  }),
  z.object({ action: z.literal("task"), title: text(200) }),
  z.object({
    action: z.literal("complete"),
    id,
    table: z.enum(["workspace_tasks", "workspace_appointments"]),
    completed: z.boolean(),
  }),
  z.object({
    action: z.literal("remove_saved"),
    id,
    kind: z.enum(["home", "search"]),
  }),
]);
export async function updateWorkspace(
  input: unknown,
): Promise<{ error?: string; data?: DashboardData }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in again to save your changes." };
  const parsed = actionSchema.safeParse(input);
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message || "Check the details and try again.",
    };
  const db = await createClient();
  const data = parsed.data;
  let error: { message: string } | null = null;
  switch (data.action) {
    case "role": {
      ({ error } = await db
        .from("workspaces")
        .upsert({ user_id: user.id, role: data.role }));
      break;
    }
    case "listing": {
      const { data: workspace } = await db
        .from("workspaces")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (
        user.role === "member" &&
        workspace?.role !== "seller" &&
        workspace?.role !== "landlord"
      )
        return {
          error:
            "Switch to a Seller or Landlord workspace to manage your inventory.",
        };
      if (
        (data.status === "rented" && data.kind !== "rent") ||
        (["sold", "under_offer"].includes(data.status) && data.kind !== "sale")
      )
        return { error: "Choose a status that matches the listing type." };
      const { action: _action, id: listingId, ...values } = data;
      void _action;
      if (listingId) {
        const result = await db
          .from("portfolio_listings")
          .update(values)
          .eq("id", listingId)
          .eq("user_id", user.id)
          .select("id");
        error = result.error;
        if (!error && !result.data?.length)
          return { error: "This listing is no longer available to edit." };
      } else
        ({ error } = await db
          .from("portfolio_listings")
          .insert({ ...values, user_id: user.id }));
      break;
    }
    case "deal": {
      const { action: _action, ...values } = data;
      void _action;
      ({ error } = await db
        .from("workspace_deals")
        .insert({
          ...values,
          user_id: user.id,
          closed_at:
            values.stage === "closed" ? new Date().toISOString() : null,
        }));
      break;
    }
    case "stage": {
      const { data: previous, error: readError } = await db
        .from("workspace_deals")
        .select("stage,closed_at")
        .eq("id", data.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (readError || !previous)
        return { error: "This deal is no longer available to edit." };
      ({ error } = await db
        .from("workspace_deals")
        .update({
          stage: data.stage,
          closed_at:
            data.stage === "closed"
              ? previous.closed_at || new Date().toISOString()
              : null,
        })
        .eq("id", data.id)
        .eq("user_id", user.id));
      break;
    }
    case "appointment": {
      if (new Date(data.starts_at).getTime() <= Date.now())
        return { error: "Choose a date and time in the future." };
      ({ error } = await db
        .from("workspace_appointments")
        .insert({
          user_id: user.id,
          title: data.title,
          location: data.location,
          starts_at: data.starts_at,
        }));
      break;
    }
    case "task":
      ({ error } = await db
        .from("workspace_tasks")
        .insert({ user_id: user.id, title: data.title }));
      break;
    case "complete": {
      const result = await db
        .from(data.table)
        .update({ completed: data.completed })
        .eq("id", data.id)
        .eq("user_id", user.id)
        .select("id");
      error = result.error;
      if (!error && !result.data?.length)
        return { error: "This item is no longer available." };
      break;
    }
    case "remove_saved":
      if (data.kind === "home")
        ({ error } = await db
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", data.id));
      else
        ({ error } = await db
          .from("saved_searches")
          .delete()
          .eq("user_id", user.id)
          .eq("id", data.id));
      break;
  }
  if (error)
    return { error: "We couldn’t save that change. Please try again." };
  revalidatePath("/dashboard");
  return { data: await getDashboardData(user) };
}
