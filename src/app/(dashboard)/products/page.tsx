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
import { Plus, Pencil, Trash2, Package, Search, Loader2, AlertTriangle, Layers } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StockLevel {
  quantity: number;
  location: { name: string; warehouse: { name: string } };
}

interface ProductData {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  unitOfMeasure: string;
  reorderLevel: number;
  category: { name: string } | null;
  stockLevels: StockLevel[];
}

interface CategoryOption {
  id: string;
  name: string;
}

export default function ProductsPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER";
  const [products, setProducts] = useState<ProductData[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  async function fetchData() {
    const [prodRes, catRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories"),
    ]);
    setProducts(await prodRes.json());
    setCategories(await catRes.json());
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (editing) setSelectedCategory(editing.categoryId || "");
  }, [editing]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.categoryId === filterCategory;
    return matchesSearch && matchesCategory;
  });

  function getTotalStock(product: ProductData) {
    return product.stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
  }

  function getStockStatus(product: ProductData) {
    const total = getTotalStock(product);
    if (total === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (total <= product.reorderLevel) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const payload = {
      name: formData.get("name") as string,
      sku: formData.get("sku") as string,
      categoryId: selectedCategory || null,
      unitOfMeasure: formData.get("unitOfMeasure") as string || "Units",
      reorderLevel: parseInt(formData.get("reorderLevel") as string) || 10,
    };

    try {
      const url = editing ? `/api/products/${editing.id}` : "/api/products";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error);
      } else {
        toast.success(editing ? "Product updated" : "Product created");
        setDialogOpen(false);
        setEditing(null);
        setSelectedCategory("");
        fetchData();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Product deleted");
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
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 max-w-7xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">Products Catalog</h1>
          <p className="text-muted-foreground mt-1.5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary/60"></span>
            Manage your inventory and stock categories
          </p>
        </div>
        {isManager && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setSelectedCategory(""); } }}>
            <DialogTrigger className={cn(buttonVariants({ variant: "default" }), "shadow-md hover:shadow-lg transition-all decoration-0 rounded-xl")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Product" : "New Product"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" name="name" defaultValue={editing?.name || ""} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sku">SKU</Label>
                    <Input id="sku" name="sku" defaultValue={editing?.sku || ""} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v || "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unitOfMeasure">Unit of Measure</Label>
                    <Input id="unitOfMeasure" name="unitOfMeasure" defaultValue={editing?.unitOfMeasure || "Units"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reorderLevel">Reorder Level</Label>
                    <Input id="reorderLevel" name="reorderLevel" type="number" defaultValue={editing?.reorderLevel || 10} min={0} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Update" : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card/60 p-2 rounded-2xl border border-border/40 backdrop-blur-md shadow-sm">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 bg-background/50 border-border/40 rounded-xl focus-visible:ring-primary/20 h-11"
          />
        </div>
        <div className="h-8 w-px bg-border/50 hidden sm:block mx-1"></div>
        <div className="flex items-center gap-2 w-full sm:w-auto px-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v || "all")}>
            <SelectTrigger className="w-full sm:w-[200px] border-0 bg-transparent focus:ring-0 shadow-none font-medium text-foreground">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/40 shadow-xl backdrop-blur-xl bg-card/95">
              <SelectItem value="all" className="rounded-lg mb-1 focus:bg-primary/10">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="rounded-lg mb-1 focus:bg-primary/10">{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-border/40 shadow-xl shadow-black/5 bg-card/50 backdrop-blur-xl overflow-hidden rounded-3xl">
        <CardHeader className="bg-muted/20 border-b border-border/40 pb-4 pt-5 px-6">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Package className="h-5 w-5" />
              </div>
              <span>Inventory List</span>
            </div>
            <Badge variant="outline" className="px-3 py-1 font-mono text-sm border-border/50 bg-background/50">
               {filteredProducts.length} Items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-lg font-medium text-foreground">
                {search || filterCategory !== "all" ? "No matches found" : "No products yet."}
              </p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-muted-foreground h-12 px-6">Product Name</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">SKU</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Category</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">UoM</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Total Stock</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Status</TableHead>
                  {isManager && <TableHead className="w-24 font-semibold text-muted-foreground h-12 pr-6">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                {filteredProducts.map((product, idx) => {
                  const stockStatus = getStockStatus(product);
                  const totalStock = getTotalStock(product);
                  return (
                    <motion.tr 
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      className={cn("group transition-colors border-b border-border/40 hover:bg-muted/30", idx % 2 === 0 ? "bg-transparent" : "bg-muted/10")}
                    >
                      <TableCell className="font-medium px-6 py-4">
                        <div className="flex items-center gap-3">
                          {totalStock <= product.reorderLevel && totalStock > 0 && (
                            <div className="p-1.5 bg-amber-500/10 rounded-md">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            </div>
                          )}
                          <span className="text-foreground group-hover:text-primary transition-colors">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground py-4">
                        <span className="bg-muted/50 px-2.5 py-1 rounded-md text-xs font-medium border border-border/50">{product.sku}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground py-4">{product.category?.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground py-4">{product.unitOfMeasure}</TableCell>
                      <TableCell className="py-4 font-medium text-foreground">{totalStock}</TableCell>
                      <TableCell className="py-4">
                        <Badge variant={stockStatus.variant} className={cn("px-2.5 py-0.5", stockStatus.variant === 'secondary' ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-0" : stockStatus.variant === 'destructive' ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border-0" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-0")}>
                           {stockStatus.label}
                        </Badge>
                      </TableCell>
                      {isManager && (
                        <TableCell className="pr-6 py-4">
                          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              onClick={() => { setEditing(product); setDialogOpen(true); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </motion.tr>
                  );
                })}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
