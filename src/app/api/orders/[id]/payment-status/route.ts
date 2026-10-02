import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: { status: true, paymentType: true },
    });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404, headers });
    return NextResponse.json({ status: order.status, paymentType: order.paymentType }, { headers });
  } catch {
    return NextResponse.json({ error: "Status is temporarily unavailable" }, { status: 503, headers });
  }
}
