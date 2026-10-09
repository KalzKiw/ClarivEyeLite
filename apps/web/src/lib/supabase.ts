import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anon);

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url!, anon!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (null as unknown as SupabaseClient);

export type DbProfile = {
  id: string;
  business_id: string;
  email: string;
  name: string;
  role: "owner" | "operario";
  created_at: string;
};

export type DbBusiness = {
  id: string;
  name: string;
  created_at: string;
};

export type DbOrder = {
  id: string;
  business_id: string;
  doc_number: string;
  doc_date: string | null;
  status: string;
  notes: string | null;
  delivery_notes: string | null;
  lines: unknown;
  created_at: string;
  delivered_at: string | null;
};
