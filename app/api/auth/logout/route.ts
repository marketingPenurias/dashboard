import { NextRequest, NextResponse } from "next/server";
import { ANALYTICS_COOKIE } from "@/lib/analytics-jwt";

export async function POST(req: NextRequest) {
  const url = new URL("/login", req.url);
  const res = NextResponse.redirect(url);
  res.cookies.delete(ANALYTICS_COOKIE);
  return res;
}
