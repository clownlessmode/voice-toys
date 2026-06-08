import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-request";
import { runWbProductSync } from "@/lib/wb/sync-products";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type SyncMode = "incremental" | "full";

function parseMode(body: unknown): SyncMode {
  if (body == null || typeof body !== "object") {
    return "incremental";
  }
  const m = (body as { mode?: unknown }).mode;
  if (m === undefined) return "incremental";
  if (m === "incremental" || m === "full") return m;
  throw new Error("Invalid `mode` (expected 'incremental' or 'full')");
}

export async function POST(request: NextRequest) {
  const auth = assertAdmin(request);
  if (auth) return auth;

  let body: unknown;
  try {
    const text = await request.text();
    body = text ? (JSON.parse(text) as unknown) : {};
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  let mode: SyncMode;
  try {
    mode = parseMode(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid request body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const result = await runWbProductSync({ mode });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
