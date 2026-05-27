import { NextRequest, NextResponse } from "next/server";
import { verifyAnalyticsToken, ANALYTICS_COOKIE } from "@/lib/analytics-jwt";

export async function proxy(req: NextRequest) {
  const token = req.cookies.get(ANALYTICS_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const payload = await verifyAnalyticsToken(token);

    // Pasa el tenant_id a las páginas vía header de request interno
    const res = NextResponse.next();
    res.headers.set("x-tenant-id", payload.tenant_id);
    return res;
  } catch {
    // Token expirado o inválido → volver al login
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(ANALYTICS_COOKIE);
    return res;
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
