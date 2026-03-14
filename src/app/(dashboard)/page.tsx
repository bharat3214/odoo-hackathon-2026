import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Clock,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { AnimatedWrapper, AnimatedCard } from "@/components/dashboard/animated-wrapper";
import { cn } from "@/lib/utils";

async function getDashboardData() {
  const [
    totalProducts,
    lowStockItems,
    outOfStockItems,
    pendingReceipts,
    pendingDeliveries,
    receiptStats,
    deliveryStats,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.stockLevel.count({
      where: {
        quantity: { gt: 0, lte: 10 },
      },
    }),
    prisma.stockLevel.count({
      where: { quantity: 0 },
    }),
    prisma.operation.count({
      where: { type: "RECEIPT", status: { in: ["DRAFT", "WAITING", "READY"] } },
    }),
    prisma.operation.count({
      where: { type: "DELIVERY", status: { in: ["DRAFT", "WAITING", "READY"] } },
    }),
    prisma.operation.groupBy({
      by: ["status"],
      where: { type: "RECEIPT" },
      _count: true,
    }),
    prisma.operation.groupBy({
      by: ["status"],
      where: { type: "DELIVERY" },
      _count: true,
    }),
  ]);

  const now = new Date();
  const [lateReceipts, lateDeliveries, waitingDeliveries] = await Promise.all([
    prisma.operation.count({
      where: {
        type: "RECEIPT",
        status: { in: ["DRAFT", "WAITING", "READY"] },
        scheduledDate: { lt: now },
      },
    }),
    prisma.operation.count({
      where: {
        type: "DELIVERY",
        status: { in: ["DRAFT", "WAITING", "READY"] },
        scheduledDate: { lt: now },
      },
    }),
    prisma.operation.count({
      where: { type: "DELIVERY", status: "WAITING" },
    }),
  ]);

  const totalReceipts = receiptStats.reduce((sum: number, s: any) => sum + s._count, 0);
  const totalDeliveries = deliveryStats.reduce((sum: number, s: any) => sum + s._count, 0);

  return {
    totalProducts,
    lowStockItems,
    outOfStockItems,
    pendingReceipts,
    pendingDeliveries,
    lateReceipts,
    lateDeliveries,
    waitingDeliveries,
    totalReceipts,
    totalDeliveries,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const data = await getDashboardData();

  const kpis = [
    {
      label: "Total Products",
      value: data.totalProducts,
      icon: Package,
      color: "text-foreground",
    },
    {
      label: "Low Stock",
      value: data.lowStockItems,
      icon: AlertTriangle,
      color: "text-amber-500",
    },
    {
      label: "Out of Stock",
      value: data.outOfStockItems,
      icon: XCircle,
      color: "text-red-500",
    },
    {
      label: "Pending Receipts",
      value: data.pendingReceipts,
      icon: ArrowDownToLine,
      color: "text-emerald-500",
    },
    {
      label: "Pending Deliveries",
      value: data.pendingDeliveries,
      icon: ArrowUpFromLine,
      color: "text-blue-500",
    },
  ];

  return (
    <AnimatedWrapper>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
            Welcome back, {session?.user?.name?.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1.5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary/60"></span>
            Here&apos;s an overview of your inventory operations.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => (
          <AnimatedCard key={kpi.label} index={idx}>
            <Card className="border-border/40 shadow-sm bg-card/60 backdrop-blur-xl hover:shadow-md transition-all hover:border-primary/20 group h-full">
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col gap-4">
                  <div className={cn("p-3 rounded-xl w-fit xl:w-12 xl:h-12 flex items-center justify-center transition-colors shadow-inner", kpi.color === "text-amber-500" ? "bg-amber-500/10 group-hover:bg-amber-500/20" : kpi.color === "text-red-500" ? "bg-red-500/10 group-hover:bg-red-500/20" : kpi.color === "text-emerald-500" ? "bg-emerald-500/10 group-hover:bg-emerald-500/20" : kpi.color === "text-blue-500" ? "bg-blue-500/10 group-hover:bg-blue-500/20" : "bg-primary/10 group-hover:bg-primary/20")}>
                    <kpi.icon className={cn("h-5 w-5 xl:h-6 xl:w-6", kpi.color === "text-foreground" ? "text-primary" : kpi.color)} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold tracking-tight">{kpi.value}</p>
                    <p className="text-sm font-medium text-muted-foreground mt-1">{kpi.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedCard>
        ))}
      </div>

      {/* Operations Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatedCard index={2} direction="-x">
          <Card className="border-border/40 shadow-xl shadow-black/5 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl h-full rounded-3xl overflow-hidden hover:border-primary/30 transition-colors group">
            <CardHeader className="pb-4 border-b border-border/30 bg-muted/10 group-hover:bg-emerald-500/5 transition-colors">
              <CardTitle className="text-lg font-semibold flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <ArrowDownToLine className="h-5 w-5" />
                </div>
                Incoming Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold tracking-tight text-emerald-500">{data.pendingReceipts}</span>
                    <span className="text-sm font-medium text-muted-foreground">Pending</span>
                  </div>
                  <div className="h-10 w-px bg-border/50"></div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold tracking-tight">{data.totalReceipts}</span>
                    <span className="text-sm font-medium text-muted-foreground">Total</span>
                  </div>
                </div>
                <Link href="/operations/receipts" className="shrink-0">
                  <Button size="sm" className="rounded-xl shadow-sm bg-emerald-500 hover:bg-emerald-600 text-white border-0 w-full sm:w-auto">
                    View Receipts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                <TrendingUp className="h-5 w-5 text-muted-foreground/50" />
                <span className="text-sm font-medium text-muted-foreground flex-1">Status Overview</span>
                {data.lateReceipts > 0 && (
                  <Badge variant="destructive" className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 border-0 shadow-none">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {data.lateReceipts} Late
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>

        <AnimatedCard index={3} direction="x">
          <Card className="border-border/40 shadow-xl shadow-black/5 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl h-full rounded-3xl overflow-hidden hover:border-primary/30 transition-colors group">
            <CardHeader className="pb-4 border-b border-border/30 bg-muted/10 group-hover:bg-blue-500/5 transition-colors">
              <CardTitle className="text-lg font-semibold flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <ArrowUpFromLine className="h-5 w-5" />
                </div>
                Outgoing Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 px-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold tracking-tight text-blue-500">{data.pendingDeliveries}</span>
                    <span className="text-sm font-medium text-muted-foreground">Pending</span>
                  </div>
                  <div className="h-10 w-px bg-border/50"></div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold tracking-tight">{data.totalDeliveries}</span>
                    <span className="text-sm font-medium text-muted-foreground">Total</span>
                  </div>
                </div>
                <Link href="/operations/deliveries" className="shrink-0">
                  <Button size="sm" className="rounded-xl shadow-sm bg-blue-500 hover:bg-blue-600 text-white border-0 w-full sm:w-auto">
                    View Deliveries
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                <TrendingUp className="h-5 w-5 text-muted-foreground/50 hidden sm:block" />
                <span className="text-sm font-medium text-muted-foreground flex-1">Status Overview</span>
                {data.lateDeliveries > 0 && (
                  <Badge variant="destructive" className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-500/10 text-red-600 border-0 shadow-none">
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {data.lateDeliveries} Late
                  </Badge>
                )}
                {data.waitingDeliveries > 0 && (
                  <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 border-0 shadow-none">
                    {data.waitingDeliveries} Waiting
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>
    </AnimatedWrapper>
  );
}
