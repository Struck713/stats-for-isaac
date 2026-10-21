import { connection } from "next/server";
import { steamLoginUrl } from "@/lib/auth/steam";

export async function GET() {
  await connection();
  return Response.redirect(steamLoginUrl(), 302);
}
