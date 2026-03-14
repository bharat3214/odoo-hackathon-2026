import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: {
        sourceLocation: { include: { warehouse: { select: { name: true } } } },
        destLocation: { include: { warehouse: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true, unitOfMeasure: true } } } },
      },
    });

    if (!operation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(operation);
  } catch (error) {
    console.error("Failed to fetch operation:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, sourceLocationId, destLocationId, contactName, scheduledDate, items } = body;

    // If validating (setting to DONE), update stock levels
    if (status === "DONE") {
      if (session.user.role !== "MANAGER") {
        return NextResponse.json({ error: "Only managers can validate operations" }, { status: 403 });
      }

      const operation = await prisma.operation.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!operation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Process stock changes within a transaction
      await prisma.$transaction(async (tx) => {
        for (const item of operation.items) {
          const qty = item.doneQty > 0 ? item.doneQty : item.demandQty;

          if (operation.type === "RECEIPT" && operation.destLocationId) {
            // Increase stock at destination
            await tx.stockLevel.upsert({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: operation.destLocationId,
                },
              },
              update: { quantity: { increment: qty } },
              create: {
                productId: item.productId,
                locationId: operation.destLocationId,
                quantity: qty,
              },
            });

            await tx.moveHistory.create({
              data: {
                operationId: operation.id,
                productId: item.productId,
                toLocationId: operation.destLocationId,
                quantity: qty,
                direction: "IN",
                performedById: session.user.id,
              },
            });
          } else if (operation.type === "DELIVERY" && operation.sourceLocationId) {
            // Decrease stock at source
            await tx.stockLevel.upsert({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: operation.sourceLocationId,
                },
              },
              update: { quantity: { decrement: qty } },
              create: {
                productId: item.productId,
                locationId: operation.sourceLocationId,
                quantity: 0,
              },
            });

            await tx.moveHistory.create({
              data: {
                operationId: operation.id,
                productId: item.productId,
                fromLocationId: operation.sourceLocationId,
                quantity: qty,
                direction: "OUT",
                performedById: session.user.id,
              },
            });
          } else if (operation.type === "INTERNAL" && operation.sourceLocationId && operation.destLocationId) {
            // Decrease at source, increase at destination
            await tx.stockLevel.upsert({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: operation.sourceLocationId,
                },
              },
              update: { quantity: { decrement: qty } },
              create: { productId: item.productId, locationId: operation.sourceLocationId, quantity: 0 },
            });

            await tx.stockLevel.upsert({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: operation.destLocationId,
                },
              },
              update: { quantity: { increment: qty } },
              create: { productId: item.productId, locationId: operation.destLocationId, quantity: qty },
            });

            await tx.moveHistory.create({
              data: {
                operationId: operation.id,
                productId: item.productId,
                fromLocationId: operation.sourceLocationId,
                toLocationId: operation.destLocationId,
                quantity: qty,
                direction: "OUT",
                performedById: session.user.id,
              },
            });

            await tx.moveHistory.create({
              data: {
                operationId: operation.id,
                productId: item.productId,
                fromLocationId: operation.sourceLocationId,
                toLocationId: operation.destLocationId,
                quantity: qty,
                direction: "IN",
                performedById: session.user.id,
              },
            });
          } else if (operation.type === "ADJUSTMENT" && operation.destLocationId) {
            // Set stock to the done qty (counted quantity)
            const counted = item.doneQty;
            await tx.stockLevel.upsert({
              where: {
                productId_locationId: {
                  productId: item.productId,
                  locationId: operation.destLocationId,
                },
              },
              update: { quantity: counted },
              create: { productId: item.productId, locationId: operation.destLocationId, quantity: counted },
            });

            const diff = counted - item.demandQty;
            await tx.moveHistory.create({
              data: {
                operationId: operation.id,
                productId: item.productId,
                toLocationId: operation.destLocationId,
                quantity: Math.abs(diff),
                direction: diff >= 0 ? "IN" : "OUT",
                performedById: session.user.id,
              },
            });
          }

          // Update done qty
          if (item.doneQty === 0) {
            await tx.operationItem.update({
              where: { id: item.id },
              data: { doneQty: item.demandQty },
            });
          }
        }

        // Update operation status
        await tx.operation.update({
          where: { id },
          data: { status: "DONE", validatedAt: new Date() },
        });
      });

      const updated = await prisma.operation.findUnique({
        where: { id },
        include: {
          sourceLocation: { include: { warehouse: { select: { name: true } } } },
          destLocation: { include: { warehouse: { select: { name: true } } } },
          createdBy: { select: { name: true } },
          items: { include: { product: { select: { name: true, sku: true, unitOfMeasure: true } } } },
        },
      });
      return NextResponse.json(updated);
    }

    // Regular update (status change, field edits)
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (sourceLocationId !== undefined) updateData.sourceLocationId = sourceLocationId;
    if (destLocationId !== undefined) updateData.destLocationId = destLocationId;
    if (contactName !== undefined) updateData.contactName = contactName;
    if (scheduledDate !== undefined) updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;

    // Handle items update
    if (items) {
      await prisma.operationItem.deleteMany({ where: { operationId: id } });
      await prisma.operationItem.createMany({
        data: items.map((item: { productId: string; demandQty: number; doneQty?: number }) => ({
          operationId: id,
          productId: item.productId,
          demandQty: item.demandQty || 0,
          doneQty: item.doneQty || 0,
        })),
      });
    }

    const operation = await prisma.operation.update({
      where: { id },
      data: updateData,
      include: {
        sourceLocation: { include: { warehouse: { select: { name: true } } } },
        destLocation: { include: { warehouse: { select: { name: true } } } },
        createdBy: { select: { name: true } },
        items: { include: { product: { select: { name: true, sku: true, unitOfMeasure: true } } } },
      },
    });

    return NextResponse.json(operation);
  } catch (error) {
    console.error("Failed to update operation:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "MANAGER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.operation.update({
      where: { id },
      data: { status: "CANCELLED" },
    });
    return NextResponse.json({ message: "Cancelled" });
  } catch (error) {
    console.error("Failed to cancel operation:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
