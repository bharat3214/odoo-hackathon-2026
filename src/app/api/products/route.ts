import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { name: true } },
        stockLevels: { include: { location: { include: { warehouse: { select: { name: true } } } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, sku, categoryId, unitOfMeasure, reorderLevel } = await req.json();
    if (!name || !sku) {
      return NextResponse.json({ error: "Name and SKU are required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        sku,
        categoryId: categoryId || null,
        unitOfMeasure: unitOfMeasure || "Units",
        reorderLevel: reorderLevel ?? 10,
      },
      include: { category: { select: { name: true } } },
    });
    return NextResponse.json(product, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
