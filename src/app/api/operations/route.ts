import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
      ];
    }

    const operations = await prisma.operation.findMany({
      where,
      include: {
        sourceLocation: { include: { warehouse: { select: { name: true } } } },
        destLocation: { include: { warehouse: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true, unitOfMeasure: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(operations);
  } catch (error) {
    console.error("Failed to fetch operations:", error);
    return NextResponse.json({ error: "Failed to fetch operations" }, { status: 500 });
  }
}

async function getNextReference(type: string): Promise<string> {
  const prefix = type === "RECEIPT" ? "WH/IN" : type === "DELIVERY" ? "WH/OUT" : type === "INTERNAL" ? "WH/INT" : "WH/ADJ";
  const last = await prisma.operation.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
  });

  if (!last) return `${prefix}/0001`;
  const num = parseInt(last.reference.split("/").pop() || "0") + 1;
  return `${prefix}/${num.toString().padStart(4, "0")}`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, sourceLocationId, destLocationId, contactName, scheduledDate, items } = body;

    if (!type) {
      return NextResponse.json({ error: "Operation type is required" }, { status: 400 });
    }

    const reference = await getNextReference(type);

    const operation = await prisma.operation.create({
      data: {
        type,
        reference,
        status: "DRAFT",
        sourceLocationId: sourceLocationId || null,
        destLocationId: destLocationId || null,
        contactName: contactName || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        createdById: session.user.id,
        items: items?.length > 0
          ? {
              create: items.map((item: { productId: string; demandQty: number }) => ({
                productId: item.productId,
                demandQty: item.demandQty || 0,
                doneQty: 0,
              })),
            }
          : undefined,
      },
      include: {
        sourceLocation: { include: { warehouse: { select: { name: true } } } },
        destLocation: { include: { warehouse: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true, unitOfMeasure: true } } } },
      },
    });

    return NextResponse.json(operation, { status: 201 });
  } catch (error) {
    console.error("Failed to create operation:", error);
    return NextResponse.json({ error: "Failed to create operation" }, { status: 500 });
  }
}
