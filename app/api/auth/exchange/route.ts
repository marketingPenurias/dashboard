import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/server";
import { signAnalyticsToken, ANALYTICS_COOKIE } from "@/lib/analytics-jwt";

// Cliente anon solo para verificar el token del usuario
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } },
);

// POST /api/auth/exchange
// Recibe el access_token de Supabase, verifica que el usuario es tenant_staff,
// y emite un analytics JWT de corta duración.
export async function POST(req: NextRequest) {
  const { access_token } = await req.json();

  if (!access_token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 400 });
  }

  // Verificar el token con el cliente anon (patrón correcto en Supabase)
  const { data: { user }, error: userError } = await supabaseAnon.auth.getUser(access_token);

  if (userError || !user) {
    return NextResponse.json({ error: "Token inválido", detail: userError?.message }, { status: 401 });
  }

  // Buscar al usuario en tenant_staff con service_role (bypassea RLS)
  const { data: staff, error: staffError } = await supabase
    .from("tenant_staff")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (staffError || !staff) {
    return NextResponse.json({ error: "Usuario no autorizado como staff", user_id: user.id, detail: staffError?.message }, { status: 403 });
  }

  // Emitir analytics JWT con scope mínimo
  const token = await signAnalyticsToken({
    tenant_id: staff.tenant_id,
    role: staff.role,
    scope: "analytics:read",
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ANALYTICS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hora
    path: "/",
  });
  return res;
}
