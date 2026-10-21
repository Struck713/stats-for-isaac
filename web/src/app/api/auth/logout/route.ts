import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, deleteSession } from "@/lib/auth/session";
import { appUrl } from "@/lib/auth/steam";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  // 303 so the browser follows the form POST with a GET.
  const response = NextResponse.redirect(`${appUrl()}/`, 303);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
