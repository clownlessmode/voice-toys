import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin-request";
import { WbClient } from "@/lib/wb/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = assertAdmin(request);
  if (auth) return auth;

  try {
    const client = new WbClient();
    const result = await client.ping();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ping failed";
    return NextResponse.json({ error: message, ok: false }, { status: 502 });
  }
}
