"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Boxes,
  Search,
  Loader2,
  AlertTriangle,
  ChevronDown,
  Check,
  X,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StockLevel {
  id: string;
  quantity: number;
  location: {
    id: string;
    name: string;
    warehouse: { name: string };
  };
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitOfMeasure: string;
  reorderLevel: number;
  category: { name: string } | null;
  stockLevels: StockLevel[];
}

function StockBadge({ qty, reorderLevel }: { qty: number; reorderLevel: number }) {
  if (qty === 0)
    return (
      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 border text-xs font-semibold">
        Out of Stock
      </Badge>
    );
  if (qty <= reorderLevel)
    return (
      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 border text-xs font-semibold">
        Low Stock
      </Badge>
    );
  return (
    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border text-xs font-semibold">
      In Stock
    </Badge>
  );
}

function InlineEditor({
  stockLevel,
  productId,
  onSave,
  canEdit,
}: {
  stockLevel: StockLevel;
  productId: string;
  onSave: (slId: string, qty: number) => Promise<void>;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(stockLevel.quantity.toString());
  const [saving, setSaving] = useState(false);

  async function save() {
    const qty = parseInt(value);
    if (isNaN(qty) || qty < 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    setSaving(true);
    try {
      await onSave(stockLevel.id, qty);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setValue(stockLevel.quantity.toString());
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 group/cell">
        <span className="text-base font-semibold tabular-nums">
          {stockLevel.quantity}
        </span>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover/cell:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") cancel();
        }}
        className="w-20 h-7 text-sm px-2 py-0"
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-emerald-500 hover:bg-emerald-500/10"
        onClick={save}
        disabled={saving}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-muted-foreground hover:bg-muted"
        onClick={cancel}
        disabled={saving}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default function StockPage() {
  const { data: session } = useSession();
  const isManager = (session?.user as { role?: string })?.role === "MANAGER";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openRows, setOpenRows] = useState<Set<string>>(new Set());

  const fetchStock = useCallback(async () => {
    const res = await fetch("/api/stock");
    setProducts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  async function handleSave(stockLevelId: string, qty: number) {
    const res = await fetch(`/api/stock/${stockLevelId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty }),
    });
    if (res.ok) {
      toast.success("Stock updated");
      await fetchStock();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to update");
    }
  }

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  function getTotalStock(p: Product) {
    return p.stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
  }

  function toggleRow(id: string) {
    setOpenRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const totalProducts = products.length;
  const outOfStock = products.filter((p) => getTotalStock(p) === 0).length;
  const lowStock = products.filter(
    (p) => getTotalStock(p) > 0 && getTotalStock(p) <= p.reorderLevel
  ).length;

  return (
    <div className="space-y-8 pb-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
            Stock Overview
          </h1>
          <p className="text-muted-foreground mt-1.5 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-primary/60" />
            {isManager ? "Click any quantity to edit inline" : "View current stock levels across all locations"}
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Products", value: totalProducts, color: "text-foreground", bg: "bg-primary/10" },
          { label: "Low Stock", value: lowStock, color: "text-amber-500", bg: "bg-amber-500/10" },
          { label: "Out of Stock", value: outOfStock, color: "text-red-500", bg: "bg-red-500/10" },
        ].map((kpi) => (
          <Card key={kpi.label} className="border-border/40 bg-card/60 backdrop-blur-xl rounded-2xl">
            <CardContent className="pt-5 pb-4 flex items-center gap-4">
              <div className={cn("p-2.5 rounded-xl", kpi.bg)}>
                <Boxes className={cn("h-5 w-5", kpi.color)} />
              </div>
              <div>
                <p className={cn("text-2xl font-bold tabular-nums", kpi.color)}>{kpi.value}</p>
                <p className="text-sm text-muted-foreground font-medium">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product, SKU, or category..."
          className="pl-10 bg-card/50 border-border/40 rounded-xl h-10"
        />
      </div>

      {/* Main table */}
      <Card className="border-border/40 shadow-xl shadow-black/5 bg-card/50 backdrop-blur-xl overflow-hidden rounded-3xl">
        <CardHeader className="bg-muted/20 border-b border-border/40 pb-4 pt-5 px-6">
          <CardTitle className="text-lg font-semibold flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Boxes className="h-5 w-5" />
            </div>
            Stock Levels
            <Badge variant="outline" className="ml-auto font-mono text-sm border-border/50">
              {filtered.length} products
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                <Search className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-lg font-medium">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold text-muted-foreground h-12 px-6 w-8" />
                  <TableHead className="font-semibold text-muted-foreground h-12">Product</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">SKU</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Category</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12">Unit</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12 text-right">On Hand</TableHead>
                  <TableHead className="font-semibold text-muted-foreground h-12 text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((product, idx) => {
                  const total = getTotalStock(product);
                  const isOpen = openRows.has(product.id);
                  const hasLocations = product.stockLevels.length > 0;

                  return (
                    <>
                      <TableRow
                        key={product.id}
                        className={cn(
                          "transition-colors cursor-pointer",
                          idx % 2 === 0 ? "bg-transparent" : "bg-muted/10",
                          isOpen && "bg-primary/5 border-b-0"
                        )}
                        onClick={() => hasLocations && toggleRow(product.id)}
                      >
                        <TableCell className="pl-6 pr-2">
                          {hasLocations && (
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-180"
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground py-4">
                          <div className="flex items-center gap-2.5">
                            {total > 0 && total <= product.reorderLevel && (
                              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                            )}
                            {product.name}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-mono text-xs bg-muted/50 px-2 py-1 rounded-md border border-border/50 text-muted-foreground">
                            {product.sku}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground py-4 font-medium">
                          {product.category?.name || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground py-4 font-medium">
                          {product.unitOfMeasure}
                        </TableCell>
                        <TableCell className="text-right py-4 font-bold text-lg tabular-nums">
                          {total}
                        </TableCell>
                        <TableCell className="text-right py-4 pr-6">
                          <StockBadge qty={total} reorderLevel={product.reorderLevel} />
                        </TableCell>
                      </TableRow>

                      {/* Expandable location rows */}
                      {isOpen && hasLocations && (
                        <TableRow key={`${product.id}-locations`} className="hover:bg-transparent border-b border-primary/10">
                          <TableCell colSpan={7} className="p-0">
                            <div className="ml-10 mr-6 mb-3 mt-1 rounded-xl border border-border/40 overflow-hidden">
                              <div className="bg-muted/30 px-4 py-2 flex items-center gap-2 border-b border-border/40">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  Stock by Location
                                </p>
                                {isManager && (
                                  <p className="text-xs text-muted-foreground/60 ml-auto italic">
                                    hover to edit
                                  </p>
                                )}
                              </div>
                              <table className="w-full">
                                <tbody>
                                  {product.stockLevels.map((sl, i) => (
                                    <tr
                                      key={sl.id}
                                      className={cn(
                                        "border-b border-border/30 last:border-0",
                                        i % 2 === 0 ? "bg-background/30" : "bg-muted/20"
                                      )}
                                    >
                                      <td className="px-4 py-2.5 text-sm font-medium text-foreground">
                                        {sl.location.warehouse.name}
                                      </td>
                                      <td className="px-4 py-2.5 text-sm text-muted-foreground">
                                        {sl.location.name}
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                                          <InlineEditor
                                            stockLevel={sl}
                                            productId={product.id}
                                            onSave={handleSave}
                                            canEdit={isManager}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
