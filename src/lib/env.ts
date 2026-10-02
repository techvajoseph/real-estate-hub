import { z } from "zod";

// Public values are inlined at build time, so each must be referenced explicitly.
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  HASDATA_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(16),
});

let cachedServerEnv: z.infer<typeof serverSchema> | undefined;

/** Server-only secrets. Parsed lazily so client bundles never touch them. */
export function serverEnv() {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  cachedServerEnv ??= serverSchema.parse(process.env);
  return cachedServerEnv;
}
