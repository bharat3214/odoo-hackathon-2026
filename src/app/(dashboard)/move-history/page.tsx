"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { History, Search, Loader2, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { format } from "date-fns";

interface MoveHistoryItem {
  id: string;
  quantity: number;
  direction: string;
  createdAt: string;
  operation: { reference: string; type: string };
  product: { name: string; sku: string };
  fromLocation: { name: string; warehouse: { name: string } } | null;
  toLocation: { name: string; warehouse: { name: string } } | null;
  performedBy: { name: string };
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

export default function MoveHistoryPage() {
  const [moves, setMoves] = useState<MoveHistoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const fetchMoves = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterProduct !== "all") params.set("productId", filterProduct);
    if (filterFrom) params.set("from", filterFrom);
    if (filterTo) params.set("to", filterTo);

    const res = await fetch(`/api/move-history?${params.toString()}`);
    setMoves(await res.json());
    setLoading(false);
  }, [filterProduct, filterFrom, filterTo]);

  useEffect(() => {
    fetch("/api/products").then((res) => res.json()).then(setProducts);
  }, []);

  useEffect(() => { fetchMoves(); }, [fetchMoves]);

  function getLocationDisplay(loc: { name: string; warehouse: { name: string } } | null) {
    if (!loc) return "—";
    return `${loc.warehouse.name} / ${loc.name}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Move History</h1>
        <p className="text-muted-foreground mt-1">Complete audit trail of all stock changes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterProduct} onValueChange={(v) => setFilterProduct(v || "all")}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All Products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">From:</span>
          <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="w-40" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">To:</span>
          <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="w-40" />
        </div>
      </div>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Stock Movements ({moves.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : moves.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No stock movements recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moves.map((move) => (
                  <TableRow key={move.id}>
                    <TableCell className="font-mono text-sm">{move.operation.reference}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{move.product.name}</p>
                        <p className="text-xs text-muted-foreground">{move.product.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{getLocationDisplay(move.fromLocation)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{getLocationDisplay(move.toLocation)}</TableCell>
                    <TableCell className="font-medium">{move.quantity}</TableCell>
                    <TableCell>
                      {move.direction === "IN" ? (
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                          <ArrowDownToLine className="h-3 w-3" />
                          IN
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 gap-1">
                          <ArrowUpFromLine className="h-3 w-3" />
                          OUT
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{move.performedBy.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(move.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
