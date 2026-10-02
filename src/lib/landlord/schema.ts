import { z } from "zod";
const short = (length: number) => z.string().trim().min(1).max(length);
const date = z.union([z.iso.date(), z.literal("")]).transform((v) => v || null);
export const rentalSchema = z
  .object({
    id: z.string().uuid().optional(),
    title: short(120),
    address: short(240),
    city: short(120),
    price: z.coerce.number().finite().nonnegative().max(10_000_000_000),
    beds: z.coerce.number().int().min(0).max(100),
    baths: z.coerce.number().min(0).max(100),
    sqft: z.coerce.number().int().min(0).max(100_000_000),
    status: z.enum(["draft", "active", "rented", "archived"]),
    photo: z
      .string()
      .max(2000)
      .refine((v) => !v || /^https:\/\//i.test(v), "Use an HTTPS photo URL."),
    tenant_name: z.string().trim().max(120),
    tenant_email: z.union([z.email(), z.literal("")]),
    tenant_phone: z.string().trim().max(40),
    lease_start: date,
    lease_end: date,
    notes: z.string().trim().max(3000),
  })
  .refine(
    (v) => !v.lease_start || !v.lease_end || v.lease_end >= v.lease_start,
    {
      message: "Lease end must be on or after the start date.",
      path: ["lease_end"],
    },
  );
export const transactionSchema = z.object({
  id: z.string().uuid().optional(),
  property_id: z.string().uuid(),
  kind: z.enum(["rent", "expense"]),
  description: short(200),
  amount: z.coerce.number().finite().positive().max(10_000_000_000),
  status: z.enum(["paid", "pending"]),
  occurred_on: z.iso.date(),
});
export const landlordActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save_rental"), values: rentalSchema }),
  z.object({ action: z.literal("delete_rental"), id: z.string().uuid() }),
  z.object({ action: z.literal("import_rental"), sourceId: z.string().uuid() }),
  z.object({
    action: z.literal("save_transaction"),
    values: transactionSchema,
  }),
  z.object({ action: z.literal("delete_transaction"), id: z.string().uuid() }),
  z.object({ action: z.literal("mark_paid"), id: z.string().uuid() }),
]);
