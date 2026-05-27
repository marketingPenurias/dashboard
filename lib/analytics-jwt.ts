import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.ANALYTICS_JWT_SECRET!);

export type AnalyticsPayload = {
  tenant_id: string;
  role: string;
  scope: "analytics:read";
};

export async function signAnalyticsToken(payload: AnalyticsPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
}

export async function verifyAnalyticsToken(token: string): Promise<AnalyticsPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as AnalyticsPayload;
}

export const ANALYTICS_COOKIE = "ng_analytics_token";
