"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, Bell, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/products": "Products",
  "/operations/receipts": "Receipts",
  "/operations/deliveries": "Deliveries",
  "/operations/adjustments": "Adjustments",
  "/operations/internal": "Internal Transfers",
  "/move-history": "Move History",
  "/settings/warehouses": "Warehouses",
  "/settings/locations": "Locations",
};

interface SearchResult {
  id: string;
  label: string;
  sub: string;
  href: string;
  type: "product" | "operation";
}

export function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Resolve page title — handle dynamic routes like /operations/[id]
  const pageTitle =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/operations/") ? "Operation Detail" : "");

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  const isManager = (session?.user as { role?: string })?.role === "MANAGER";

  // Global search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const [prodRes, opRes] = await Promise.all([
          fetch(`/api/products?search=${encodeURIComponent(query)}`),
          fetch(`/api/operations?search=${encodeURIComponent(query)}`),
        ]);
        const products = prodRes.ok ? await prodRes.json() : [];
        const operations = opRes.ok ? await opRes.json() : [];

        const productResults: SearchResult[] = products
          .slice(0, 4)
          .map((p: { id: string; name: string; sku: string }) => ({
            id: p.id,
            label: p.name,
            sub: p.sku,
            href: `/products`,
            type: "product" as const,
          }));

        const opResults: SearchResult[] = operations
          .slice(0, 4)
          .map((op: { id: string; reference: string; type: string; status: string }) => ({
            id: op.id,
            label: op.reference,
            sub: `${op.type} · ${op.status}`,
            href: `/operations/${op.id}`,
            type: "operation" as const,
          }));

        setResults([...productResults, ...opResults]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSelect(href: string) {
    router.push(href);
    setQuery("");
    setOpen(false);
    setResults([]);
  }

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-4 px-6 lg:px-8 border-b border-border/40 bg-background/80 backdrop-blur-xl shadow-sm">
      {/* Page Title */}
      <div className="hidden lg:block">
        <h2 className="text-sm font-semibold text-foreground/80 tracking-tight">
          {pageTitle}
        </h2>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Global Search */}
      <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search products, operations..."
            className="w-full h-9 pl-9 pr-8 text-sm bg-muted/50 border border-border/40 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all placeholder:text-muted-foreground/50"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
              className="absolute right-2.5 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && query && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border/40 rounded-xl shadow-xl overflow-hidden z-50">
            {searching ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                Searching…
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">
                No results for &quot;{query}&quot;
              </div>
            ) : (
              <ul className="py-1.5 max-h-72 overflow-y-auto">
                {results.map((r) => (
                  <li key={r.id + r.type}>
                    <button
                      onMouseDown={() => handleSelect(r.href)}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold shrink-0 px-1.5",
                          r.type === "product"
                            ? "text-emerald-500 border-emerald-500/30"
                            : "text-blue-500 border-blue-500/30"
                        )}
                      >
                        {r.type === "product" ? "Product" : "Op"}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Role Badge */}
      <Badge
        variant="outline"
        className={cn(
          "hidden sm:flex text-xs font-semibold px-2 py-0.5 shrink-0",
          isManager
            ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
            : "text-muted-foreground border-border/60"
        )}
      >
        {isManager ? "Manager" : "Staff"}
      </Badge>

      {/* Notification bell (visual) */}
      <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
        <Bell className="h-4 w-4" />
      </button>

      {/* User avatar */}
      <Avatar className="h-8 w-8 border border-border/60 shrink-0">
        <AvatarImage src={(session?.user as { image?: string })?.image || ""} />
        <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-muted to-muted/50">
          {userInitials}
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
