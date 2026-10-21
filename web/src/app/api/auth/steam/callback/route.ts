import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, createSession, sessionCookieOptions } from "@/lib/auth/session";
import { appUrl, verifySteamCallback } from "@/lib/auth/steam";
import { upsertUser } from "@/lib/data";
import { getSteamProfile } from "@/lib/steamApi";

export async function GET(request: NextRequest) {
  const steamId = await verifySteamCallback(request.nextUrl.searchParams);
  if (!steamId) {
    return NextResponse.redirect(`${appUrl()}/?error=signin`, 302);
  }
  const userId = await upsertUser(steamId, await getSteamProfile(steamId));
  const { token, expiresAt } = await createSession(userId);
  const response = NextResponse.redirect(`${appUrl()}/account`, 302);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return response;
}
