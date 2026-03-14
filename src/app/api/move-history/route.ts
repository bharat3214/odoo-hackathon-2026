import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const userId = searchParams.get("userId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: Record<string, unknown> = {};
    if (productId) where.productId = productId;
    if (userId) where.performedById = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const moves = await prisma.moveHistory.findMany({
      where,
      include: {
        operation: { select: { reference: true, type: true } },
        product: { select: { name: true, sku: true } },
        fromLocation: { include: { warehouse: { select: { name: true } } } },
        toLocation: { include: { warehouse: { select: { name: true } } } },
        performedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(moves);
  } catch (error) {
    console.error("Failed to fetch move history:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
