import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: { _count: { select: { locations: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(warehouses);
  } catch (error) {
    console.error("Failed to fetch warehouses:", error);
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, address } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const warehouse = await prisma.warehouse.create({
      data: { name, address },
    });
    return NextResponse.json(warehouse, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Warehouse name already exists" }, { status: 409 });
    }
    console.error("Failed to create warehouse:", error);
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
  }
}
