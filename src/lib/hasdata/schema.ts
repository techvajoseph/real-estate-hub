import { z } from "zod";

const filterValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.union([z.string(), z.number()])),
]);

export const importRequestSchema = z.object({
  provider: z.enum(["zillow", "redfin"]),
  keyword: z.string().trim().min(2).max(200),
  listingType: z.enum(["for_sale", "for_rent", "sold"]).default("for_sale"),
  /** HasData bracket-style filters, e.g. { "price[min]": 300000 } */
  filters: z.record(z.string(), filterValue).default({}),
  maxPages: z.coerce.number().int().min(1).max(20).default(1),
  /** Also fetch full property details for listings in this run (10 credits each). */
  withDetails: z.boolean().default(false),
});

export type ImportRequestInput = z.infer<typeof importRequestSchema>;
