"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Warehouse, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface WarehouseData {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  _count: { locations: number };
}

export default function WarehousesPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER";
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchWarehouses() {
    const res = await fetch("/api/warehouses");
    const data = await res.json();
    setWarehouses(data);
    setLoading(false);
  }

  useEffect(() => { fetchWarehouses(); }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;

    try {
      const url = editing ? `/api/warehouses/${editing.id}` : "/api/warehouses";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
      } else {
        toast.success(editing ? "Warehouse updated" : "Warehouse created");
        setDialogOpen(false);
        setEditing(null);
        fetchWarehouses();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this warehouse? All locations in it will also be deleted.")) return;
    const res = await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Warehouse deleted");
      fetchWarehouses();
    } else {
      toast.error("Failed to delete");
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 max-w-5xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">Warehouses Setup</h1>
          <p className="text-muted-foreground mt-1.5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary/60"></span>
            Manage your physical locations and facilities
          </p>
        </div>
        {isManager && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
            <DialogTrigger className={cn(buttonVariants({ variant: "default" }), "shadow-md hover:shadow-lg transition-all decoration-0 rounded-xl")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Warehouse
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Warehouse" : "New Warehouse"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground font-medium">Name</Label>
                  <Input id="name" name="name" defaultValue={editing?.name || ""} placeholder="e.g. Main Distribution Center" className="rounded-xl border-border/50 focus-visible:ring-primary/20 bg-background/50" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-foreground font-medium">Address</Label>
                  <Input id="address" name="address" defaultValue={editing?.address || ""} placeholder="123 Storage Lane..." className="rounded-xl border-border/50 focus-visible:ring-primary/20 bg-background/50" />
                </div>
                <Button type="submit" className="w-full rounded-xl shadow-md hover:shadow-lg transition-all" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Update" : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="border-border/40 shadow-xl shadow-black/5 bg-card/50 backdrop-blur-xl overflow-hidden rounded-3xl">
        <CardHeader className="bg-muted/20 border-b border-border/40 pb-4 pt-5 px-6">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Warehouse className="h-5 w-5" />
              </div>
              <span>All Facilities</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : warehouses.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No warehouses yet. Create your first one.</p>
          ) : (
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-muted-foreground h-12 px-6">Facility Name</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Address</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Zones/Locations</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Status</TableHead>
                  {isManager && <TableHead className="w-24 font-semibold text-muted-foreground h-12 pr-6">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                {warehouses.map((wh, idx) => (
                  <motion.tr 
                    key={wh.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className={cn("group transition-colors border-b border-border/40 hover:bg-muted/30", idx % 2 === 0 ? "bg-transparent" : "bg-muted/10")}
                  >
                    <TableCell className="font-semibold text-foreground px-6 py-4">{wh.name}</TableCell>
                    <TableCell className="text-muted-foreground py-4">{wh.address || "—"}</TableCell>
                    <TableCell className="py-4">
                      <Badge variant="outline" className="px-2 py-0 border-border/50 font-mono text-muted-foreground">
                        {wh._count.locations}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge variant={wh.isActive ? "default" : "secondary"} className={cn("px-2.5 py-0.5", wh.isActive ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border-0" : "bg-muted text-muted-foreground shadow-none border-0")}>
                        {wh.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isManager && (
                      <TableCell className="pr-6 py-4">
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            onClick={() => { setEditing(wh); setDialogOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            onClick={() => handleDelete(wh.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </motion.tr>
                ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
