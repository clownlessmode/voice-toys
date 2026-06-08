import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getWbSyncCronSecret } from "@/lib/wb/config";
import { runWbProductSync } from "@/lib/wb/sync-products";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function bearerFromAuthorizationHeader(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.trim()) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(auth.trim());
  return m?.[1] ?? null;
}

/** `x-wb-sync-secret` / `X-WB-Sync-Secret` — header names are case-insensitive. */
function secretFromWbSyncHeader(request: NextRequest): string | null {
  const v = request.headers.get("x-wb-sync-secret")?.trim();
  return v || null;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

async function handleCronWbSync(
  request: NextRequest
): Promise<NextResponse> {
  const expected = getWbSyncCronSecret();
  if (!expected) {
    return NextResponse.json(
      { error: "Cron sync is not configured" },
      { status: 503 }
    );
  }

  const bearer = bearerFromAuthorizationHeader(request);
  const headerSecret = secretFromWbSyncHeader(request);
  const ok =
    (bearer != null && timingSafeStringEqual(bearer, expected)) ||
    (headerSecret != null && timingSafeStringEqual(headerSecret, expected));
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runWbProductSync({ mode: "incremental" });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCronWbSync(request);
}

export async function POST(request: NextRequest) {
  return handleCronWbSync(request);
}
