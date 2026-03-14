"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Printer, XCircle, ArrowLeft, Loader2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { StatusStepper } from "@/components/operations/status-stepper";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

interface OperationDetail {
  id: string;
  type: string;
  reference: string;
  status: string;
  sourceLocation: { id: string; name: string; warehouse: { name: string } } | null;
  destLocation: { id: string; name: string; warehouse: { name: string } } | null;
  contactName: string | null;
  scheduledDate: string | null;
  validatedAt: string | null;
  createdBy: { name: string };
  items: {
    id: string;
    demandQty: number;
    doneQty: number;
    product: { name: string; sku: string; unitOfMeasure: string };
  }[];
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  RECEIPT: "Receipt",
  DELIVERY: "Delivery",
  INTERNAL: "Internal Transfer",
  ADJUSTMENT: "Adjustment",
};

const typePath: Record<string, string> = {
  RECEIPT: "/operations/receipts",
  DELIVERY: "/operations/deliveries",
  INTERNAL: "/operations/internal",
  ADJUSTMENT: "/operations/adjustments",
};

export default function OperationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER";
  const [operation, setOperation] = useState<OperationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    fetch(`/api/operations/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setOperation(data);
        setLoading(false);
      });
  }, [params.id]);

  async function handleValidate() {
    if (!confirm("Validate this operation? Stock levels will be updated.")) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/operations/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DONE" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOperation(updated);
        toast.success("Operation validated. Stock levels updated.");
      } else {
        const data = await res.json();
        toast.error(data.error || "Validation failed");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setValidating(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this operation?")) return;
    const res = await fetch(`/api/operations/${params.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Operation cancelled");
      setOperation((prev) => prev ? { ...prev, status: "CANCELLED" } : prev);
    } else {
      toast.error("Failed to cancel");
    }
  }

  async function handleStatusChange(newStatus: string) {
    const res = await fetch(`/api/operations/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOperation(updated);
      toast.success(`Status changed to ${newStatus}`);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!operation) {
    return <p className="text-center py-12 text-muted-foreground">Operation not found.</p>;
  }

  const isTerminal = operation.status === "DONE" || operation.status === "CANCELLED";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 max-w-5xl mx-auto pb-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-6 rounded-2xl border border-border/40 shadow-sm backdrop-blur-xl">
        <div className="flex items-start sm:items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push(typePath[operation.type])} className="rounded-xl h-10 w-10 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80 font-mono">{operation.reference}</h1>
              <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20 text-sm">{typeLabels[operation.type]}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5 font-medium">
              <User className="h-3.5 w-3.5" />
              Created by <span className="text-foreground">{operation.createdBy.name}</span> on {format(new Date(operation.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
        {isManager && !isTerminal && (
          <div className="flex flex-wrap items-center gap-2">
            {operation.status === "DRAFT" && (
              <Button variant="outline" size="sm" onClick={() => handleStatusChange("READY")} className="rounded-xl font-medium">
                Mark Ready
              </Button>
            )}
            {(operation.status === "READY" || operation.status === "DRAFT") && (
              <Button size="sm" onClick={handleValidate} disabled={validating} className="gap-1.5 rounded-xl font-medium shadow-sm hover:shadow-md transition-all">
                {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                Validate
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5 rounded-xl font-medium">
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button variant="destructive" size="sm" onClick={handleCancel} className="gap-1.5 rounded-xl font-medium shadow-sm">
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Details Snapshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {operation.sourceLocation && (
          <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur rounded-2xl hover:border-primary/20 transition-colors">
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-col gap-1">
                 <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Source</p>
                 <p className="text-base font-semibold text-foreground">{operation.sourceLocation.warehouse.name}</p>
                 <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                   <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"></span>
                   {operation.sourceLocation.name}
                 </p>
              </div>
            </CardContent>
          </Card>
        )}
        {operation.destLocation && (
          <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur rounded-2xl hover:border-primary/20 transition-colors">
            <CardContent className="pt-5 pb-4">
               <div className="flex flex-col gap-1">
                 <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Destination</p>
                 <p className="text-base font-semibold text-foreground">{operation.destLocation.warehouse.name}</p>
                 <p className="text-sm text-muted-foreground font-medium flex items-center gap-1.5">
                   <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40"></span>
                   {operation.destLocation.name}
                 </p>
               </div>
            </CardContent>
          </Card>
        )}
        {operation.contactName && (
          <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur rounded-2xl hover:border-primary/20 transition-colors">
            <CardContent className="pt-5 pb-4 h-full flex flex-col justify-center">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Contact</p>
              <p className="text-base font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {operation.contactName}
              </p>
            </CardContent>
          </Card>
        )}
        {operation.scheduledDate && (
          <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur rounded-2xl hover:border-primary/20 transition-colors">
            <CardContent className="pt-5 pb-4 h-full flex flex-col justify-center">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Scheduled</p>
              <p className="text-base font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {format(new Date(operation.scheduledDate), "MMM d, yyyy")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Stepper */}
      <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden bg-gradient-to-br from-card to-card/50">
        <CardContent className="py-8">
          <div className="flex items-center justify-center max-w-2xl mx-auto">
            <StatusStepper currentStatus={operation.status} />
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      <Card className="border-border/40 shadow-md rounded-2xl overflow-hidden backdrop-blur-sm bg-card/80">
        <CardHeader className="bg-muted/30 border-b border-border/40 pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="flex h-5 w-5 bg-primary/10 text-primary rounded-full items-center justify-center text-xs">
               {operation.items.length}
            </span>
            Products List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground h-12">Product</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-12">SKU</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-12">UoM</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-12 text-center">Demand Qty</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-12 text-center">Done Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operation.items.map((item, idx) => (
                <TableRow key={item.id} className={cn("transition-colors", idx % 2 === 0 ? "bg-card" : "bg-muted/20")}>
                  <TableCell className="font-semibold text-foreground py-4">{item.product.name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground py-4 bg-muted/30 rounded px-2 table-cell-bg">{item.product.sku}</TableCell>
                  <TableCell className="text-muted-foreground font-medium py-4">{item.product.unitOfMeasure}</TableCell>
                  <TableCell className="text-center font-medium py-4">{item.demandQty}</TableCell>
                  <TableCell className="text-center font-medium py-4 text-primary">{item.doneQty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
