import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { quantity, productId, locationId } = await req.json();

    if (typeof quantity !== "number" || quantity < 0) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    // Upsert: update existing or create new stock level entry
    const stockLevel = await prisma.stockLevel.upsert({
      where: id !== "new" ? { id } : { productId_locationId: { productId, locationId } },
      update: { quantity },
      create: { productId, locationId, quantity },
      include: {
        location: { include: { warehouse: { select: { name: true } } } },
      },
    });

    return NextResponse.json(stockLevel);
  } catch (error) {
    console.error("Failed to update stock level:", error);
    return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
  }
}
