// Upload endpoint used by the mod: POST { schemaVersion, runs: Run[] } with
// "Authorization: Bearer sfi_...". Each run is validated on its own, so one bad run doesn't
// stop the rest of the batch from being saved.
import { type NextRequest, NextResponse } from "next/server";
import { authenticateBearer } from "@/lib/auth/tokens";
import { appUrl } from "@/lib/auth/steam";
import { upsertRun } from "@/lib/data";
import { parseRun, uploadSchema } from "@/lib/runSchema";

const MAX_BODY_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const userId = await authenticateBearer(request.headers.get("authorization"));
  if (!userId) {
    return NextResponse.json({ error: "invalid or revoked token" }, { status: 401 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "upload too large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const upload = uploadSchema.safeParse(body);
  if (!upload.success) {
    return NextResponse.json({ error: upload.error.issues[0]?.message ?? "bad upload" }, { status: 400 });
  }

  const accepted: { uid: string; url: string }[] = [];
  const rejected: { uid?: string; error: string }[] = [];
  for (const input of upload.data.runs) {
    const parsed = parseRun(input);
    if (!parsed.ok) {
      rejected.push({ uid: parsed.uid, error: parsed.error });
      continue;
    }
    const publicId = await upsertRun(userId, parsed.run, upload.data.schemaVersion);
    accepted.push({ uid: parsed.run.uid, url: `${appUrl()}/runs/${publicId}` });
  }
  return NextResponse.json({ accepted, rejected });
}
