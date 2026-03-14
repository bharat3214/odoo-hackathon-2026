"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, MapPin, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LocationData {
  id: string;
  name: string;
  warehouseId: string;
  description: string | null;
  warehouse: { name: string };
}

interface WarehouseOption {
  id: string;
  name: string;
}

export default function LocationsPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER";
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LocationData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");

  async function fetchData() {
    const [locRes, whRes] = await Promise.all([
      fetch("/api/locations"),
      fetch("/api/warehouses"),
    ]);
    setLocations(await locRes.json());
    setWarehouses(await whRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (editing) setSelectedWarehouse(editing.warehouseId);
  }, [editing]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      const url = editing ? `/api/locations/${editing.id}` : "/api/locations";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, warehouseId: selectedWarehouse, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
      } else {
        toast.success(editing ? "Location updated" : "Location created");
        setDialogOpen(false);
        setEditing(null);
        setSelectedWarehouse("");
        fetchData();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this location?")) return;
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Location deleted");
      fetchData();
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
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">Locations Setups</h1>
          <p className="text-muted-foreground mt-1.5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary/60"></span>
            Manage specific storage locations within warehouses
          </p>
        </div>
        {isManager && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setSelectedWarehouse(""); } }}>
            <DialogTrigger className={cn(buttonVariants({ variant: "default" }), "shadow-md hover:shadow-lg transition-all decoration-0 rounded-xl")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Location
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Location" : "New Location"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-foreground font-medium">Name</Label>
                  <Input id="name" name="name" defaultValue={editing?.name || ""} placeholder="e.g. Aisle 5, Shelf B" className="rounded-xl border-border/50 focus-visible:ring-primary/20 bg-background/50" required />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Warehouse</Label>
                  <Select value={selectedWarehouse} onValueChange={(v) => setSelectedWarehouse(v || "")} required>
                    <SelectTrigger className="rounded-xl border-border/50 focus:ring-primary/20 bg-background/50">
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40 shadow-xl backdrop-blur-xl bg-card/95">
                      {warehouses.map((wh) => (
                        <SelectItem key={wh.id} value={wh.id} className="rounded-lg mb-1 focus:bg-primary/10">{wh.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-foreground font-medium">Description</Label>
                  <Input id="description" name="description" defaultValue={editing?.description || ""} placeholder="Optional description..." className="rounded-xl border-border/50 focus-visible:ring-primary/20 bg-background/50" />
                </div>
                <Button type="submit" className="w-full rounded-xl shadow-md hover:shadow-lg transition-all" disabled={submitting || !selectedWarehouse}>
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
                <MapPin className="h-5 w-5" />
              </div>
              <span>All Locations</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : locations.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No locations yet. Create a warehouse first, then add locations.</p>
          ) : (
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-muted-foreground h-12 px-6">Location Name</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Warehouse</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Description</TableHead>
                  {isManager && <TableHead className="w-24 font-semibold text-muted-foreground h-12 pr-6">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                {locations.map((loc, idx) => (
                  <motion.tr 
                    key={loc.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className={cn("group transition-colors border-b border-border/40 hover:bg-muted/30", idx % 2 === 0 ? "bg-transparent" : "bg-muted/10")}
                  >
                    <TableCell className="font-semibold text-foreground px-6 py-4">{loc.name}</TableCell>
                    <TableCell className="text-muted-foreground py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 opacity-50" />
                        {loc.warehouse.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground italic py-4">{loc.description || "—"}</TableCell>
                    {isManager && (
                      <TableCell className="pr-6 py-4">
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            onClick={() => { setEditing(loc); setDialogOpen(true); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            onClick={() => handleDelete(loc.id)}
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
