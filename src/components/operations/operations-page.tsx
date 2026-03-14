"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, List, Columns3, Loader2, Calendar, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { StatusStepper } from "@/components/operations/status-stepper";

interface OperationItem {
  id: string;
  productId: string;
  demandQty: number;
  doneQty: number;
  product: { name: string; sku: string; unitOfMeasure: string };
}

interface LocationWithWarehouse {
  id: string;
  name: string;
  warehouse: { name: string };
}

interface Operation {
  id: string;
  type: string;
  reference: string;
  status: string;
  sourceLocation: LocationWithWarehouse | null;
  destLocation: LocationWithWarehouse | null;
  contactName: string | null;
  scheduledDate: string | null;
  createdBy: { name: string };
  items: OperationItem[];
  createdAt: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Location {
  id: string;
  name: string;
  warehouseId: string;
  warehouse: { name: string };
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  WAITING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  READY: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  DONE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
};

interface OperationsPageProps {
  operationType: "RECEIPT" | "DELIVERY" | "ADJUSTMENT" | "INTERNAL";
  title: string;
  sourceLabel?: string;
  destLabel?: string;
}

export function OperationsPage({ operationType, title, sourceLabel, destLabel }: OperationsPageProps) {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER";
  const [operations, setOperations] = useState<Operation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // New operation form state
  const [newSourceId, setNewSourceId] = useState("");
  const [newDestId, setNewDestId] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newSchedule, setNewSchedule] = useState("");
  const [newItems, setNewItems] = useState<{ productId: string; demandQty: number }[]>([{ productId: "", demandQty: 1 }]);

  const fetchData = useCallback(async () => {
    const [opsRes, prodRes, locRes] = await Promise.all([
      fetch(`/api/operations?type=${operationType}`),
      fetch("/api/products"),
      fetch("/api/locations"),
    ]);
    setOperations(await opsRes.json());
    setProducts(await prodRes.json());
    setLocations(await locRes.json());
    setLoading(false);
  }, [operationType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredOps = operations.filter((op) =>
    op.reference.toLowerCase().includes(search.toLowerCase()) ||
    (op.contactName && op.contactName.toLowerCase().includes(search.toLowerCase()))
  );

  const kanbanColumns = ["DRAFT", "WAITING", "READY", "DONE"];

  function addItem() {
    setNewItems([...newItems, { productId: "", demandQty: 1 }]);
  }

  function removeItem(index: number) {
    setNewItems(newItems.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: string, value: string | number) {
    const updated = [...newItems];
    updated[index] = { ...updated[index], [field]: value };
    setNewItems(updated);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const validItems = newItems.filter((item) => item.productId);
    if (validItems.length === 0) {
      toast.error("Add at least one product");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: operationType,
          sourceLocationId: newSourceId || null,
          destLocationId: newDestId || null,
          contactName: newContact || null,
          scheduledDate: newSchedule || null,
          items: validItems,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
      } else {
        toast.success("Operation created");
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setNewSourceId("");
    setNewDestId("");
    setNewContact("");
    setNewSchedule("");
    setNewItems([{ productId: "", demandQty: 1 }]);
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const res = await fetch(`/api/operations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      toast.success(`Status updated to ${newStatus}`);
      fetchData();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update");
    }
  }

  function getLocationDisplay(loc: LocationWithWarehouse | null) {
    if (!loc) return "—";
    return `${loc.warehouse.name} / ${loc.name}`;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">{title}</h1>
          <p className="text-muted-foreground mt-1.5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary/60"></span>
            {filteredOps.length} operations found
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger className={cn(buttonVariants({ variant: "default" }), "shadow-md hover:shadow-lg transition-all decoration-0 rounded-xl")}>
            <Plus className="h-4 w-4 mr-2" />
            New Operation
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New {title.slice(0, -1)}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              {sourceLabel && (
                <div className="space-y-2">
                  <Label>{sourceLabel}</Label>
                  <Select value={newSourceId} onValueChange={(v) => setNewSourceId(v || "")}>
                    <SelectTrigger><SelectValue placeholder={`Select ${sourceLabel.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.warehouse.name} / {loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {destLabel && (
                <div className="space-y-2">
                  <Label>{destLabel}</Label>
                  <Select value={newDestId} onValueChange={(v) => setNewDestId(v || "")}>
                    <SelectTrigger><SelectValue placeholder={`Select ${destLabel.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.warehouse.name} / {loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input value={newContact} onChange={(e) => setNewContact(e.target.value)} placeholder="Contact name" />
                </div>
                <div className="space-y-2">
                  <Label>Scheduled Date</Label>
                  <Input type="date" value={newSchedule} onChange={(e) => setNewSchedule(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Products</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {newItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Select value={item.productId} onValueChange={(v) => updateItem(i, "productId", v || "")}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Select product" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={item.demandQty}
                      onChange={(e) => updateItem(i, "demandQty", parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    {newItems.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(i)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Operation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & View Toggle */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card/50 p-2 rounded-2xl border border-border/40 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search by reference or contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-background/50 border-border/40 rounded-xl focus-visible:ring-primary/20 h-10"
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "kanban")}>
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-3.5 w-3.5" /> List
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5">
              <Columns3 className="h-3.5 w-3.5" /> Kanban
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
        </div>
      ) : viewMode === "list" ? (
        /* ─── Table View ─── */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="border-border/40 shadow-xl shadow-black/5 bg-card/50 backdrop-blur-xl overflow-hidden rounded-2xl">
            <CardContent className="p-0">
              {filteredOps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-lg font-medium text-foreground">No operations found</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">We couldn&apos;t find any corresponding operations for your search query.</p>
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOps.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell>
                        <Link href={`/operations/${op.id}`} className="font-medium hover:underline font-mono text-sm">
                          {op.reference}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{getLocationDisplay(op.sourceLocation)}</TableCell>
                      <TableCell className="text-muted-foreground">{getLocationDisplay(op.destLocation)}</TableCell>
                      <TableCell className="text-muted-foreground">{op.contactName || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {op.scheduledDate ? (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(op.scheduledDate), "MMM d, yyyy")}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${statusColors[op.status] || ""}`}>
                          {op.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link href={`/operations/${op.id}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>View</Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        </motion.div>
      ) : (
        /* ─── Kanban View ─── */
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, staggerChildren: 0.1 }}
        >
          {kanbanColumns.map((status, colIdx) => {
            const columnOps = filteredOps.filter((op) => op.status === status);
            return (
              <motion.div 
                key={status} 
                className="space-y-4 bg-muted/30 rounded-2xl p-4 border border-border/40"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: colIdx * 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${statusColors[status]}`}>
                    {status}
                  </span>
                  <Badge variant="secondary" className="text-xs">{columnOps.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {columnOps.map((op) => (
                    <Link key={op.id} href={`/operations/${op.id}`}>
                      <Card className="border-border/40 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 cursor-pointer overflow-hidden group bg-card/80 backdrop-blur rounded-xl">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                             <p className="font-mono text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{op.reference}</p>
                             <div className={`h-2 w-2 rounded-full ${statusColors[status].split(' ')[0]}`} />
                          </div>
                          
                          {op.contactName && (
                            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                              <span className="text-foreground/80">{op.contactName}</span>
                            </p>
                          )}
                          
                          {op.scheduledDate && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted/50 w-fit px-2 py-1 rounded-md">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(op.scheduledDate), "MMM d, yyyy")}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
                              {op.items.length} item{op.items.length !== 1 ? "s" : ""}
                            </p>
                          {isManager && op.status !== "DONE" && op.status !== "CANCELLED" && (
                            <div className="flex gap-1 pt-1">
                              {op.status === "DRAFT" && (
                                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => { e.preventDefault(); handleStatusChange(op.id, "READY"); }}>
                                  Mark Ready
                                </Button>
                              )}
                              {op.status === "READY" && (
                                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={(e) => { e.preventDefault(); handleStatusChange(op.id, "DONE"); }}>
                                  Validate
                                </Button>
                              )}
                            </div>
                          )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                  {columnOps.length === 0 && (
                    <div className="border-2 border-dashed border-border/30 rounded-xl p-6 text-center text-xs font-medium text-muted-foreground/60 flex flex-col items-center justify-center gap-2">
                      <List className="h-6 w-6 opacity-20" />
                      No operations
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
