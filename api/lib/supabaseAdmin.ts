import type { SupabaseClient } from "@supabase/supabase-js"

let cached: SupabaseClient | null = null
let initPromise: Promise<SupabaseClient> | null = null

export const getSupabaseAdmin = async () => {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  if (cached) return cached

  if (!initPromise) {
    initPromise = import("@supabase/supabase-js").then(({ createClient }) => {
      const client = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
      cached = client
      return client
    })
  }

  return await initPromise
}
