import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

export async function analyticsRpc<T>(
  fnName: string,
  params: Record<string, unknown>
): Promise<T[]> {
  const { data, error } = await supabase.rpc(fnName, params);
  if (error) throw new Error(error.message);
  return data ?? [];
}
