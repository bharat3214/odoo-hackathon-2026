import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      include: { warehouse: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(locations);
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { name, warehouseId, description } = await req.json();
    if (!name || !warehouseId) {
      return NextResponse.json({ error: "Name and warehouse are required" }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: { name, warehouseId, description },
      include: { warehouse: { select: { name: true } } },
    });
    return NextResponse.json(location, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Location name already exists in this warehouse" }, { status: 409 });
    }
    console.error("Failed to create location:", error);
    return NextResponse.json({ error: "Failed to create location" }, { status: 500 });
  }
}
