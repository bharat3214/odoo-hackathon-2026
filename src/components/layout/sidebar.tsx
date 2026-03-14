"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  Warehouse,
  ChevronDown,
  LogOut,
  User,
  Settings,
  MapPin,
  Menu,
  X,
  Sparkles,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Stock", href: "/stock", icon: Boxes },
  {
    name: "Operations",
    icon: SlidersHorizontal,
    children: [
      { name: "Receipts", href: "/operations/receipts", icon: ArrowDownToLine },
      { name: "Delivery", href: "/operations/deliveries", icon: ArrowUpFromLine },
      { name: "Internal Transfers", href: "/operations/internal", icon: ArrowLeftRight },
      { name: "Adjustments", href: "/operations/adjustments", icon: SlidersHorizontal },
    ],
  },
  { name: "Move History", href: "/move-history", icon: History },
  {
    name: "Settings",
    icon: Settings,
    children: [
      { name: "Warehouses", href: "/settings/warehouses", icon: Warehouse },
      { name: "Locations", href: "/settings/locations", icon: MapPin },
    ],
  },
];

function NavItem({
  item,
  pathname,
}: {
  item: (typeof navigation)[number];
  pathname: string;
}) {
  const [open, setOpen] = useState(
    item.children?.some((c) => pathname.startsWith(c.href)) ?? false
  );

  useEffect(() => {
    if (item.children?.some((c) => pathname.startsWith(c.href))) {
      setOpen(true);
    }
  }, [pathname, item.children]);

  if (item.children) {
    const isChildActive = item.children.some((c) => pathname.startsWith(c.href));

    return (
      <div className="mb-1">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex items-center justify-between w-full px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden",
            isChildActive
              ? "text-primary shadow-sm bg-primary/5 dark:bg-primary/10"
              : "text-muted-foreground hover:text-primary hover:bg-muted/50"
          )}
        >
          {isChildActive && (
            <motion.div
              layoutId="active-indicator"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          <span className="flex items-center gap-3 relative z-10">
            <item.icon className={cn("h-5 w-5 transition-colors", isChildActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
            {item.name}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform duration-200 text-muted-foreground",
              open && "rotate-180"
            )}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="ml-5 mt-1.5 space-y-1 border-l-2 border-muted/60 pl-4 py-1">
                {item.children.map((child) => {
                  const isActive = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "flex flex-col gap-1 px-3 py-2 text-sm rounded-lg transition-all duration-200 relative",
                        isActive
                          ? "text-foreground font-semibold bg-primary/10 shadow-sm"
                          : "text-muted-foreground font-medium hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <child.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                        {child.name}
                      </div>
                      {isActive && (
                         <motion.div 
                           layoutId="active-child"
                           className="absolute -left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary"
                         />
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href!);

  return (
    <div className="mb-1">
      <Link
        href={item.href!}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group relative overflow-hidden",
          isActive
            ? "text-primary shadow-sm bg-primary/5 dark:bg-primary/10"
            : "text-muted-foreground hover:text-primary hover:bg-muted/50"
        )}
      >
        {isActive && (
          <motion.div
            layoutId="active-indicator-single"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-primary rounded-r-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
        <item.icon className={cn("h-5 w-5 transition-colors relative z-10", isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
        <span className="relative z-10">{item.name}</span>
      </Link>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userInitials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "U";

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-card/50 to-background/80 backdrop-blur-xl border-r border-border/40 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300 relative overflow-hidden">
            <motion.div 
               className="absolute inset-0 bg-white/20"
               initial={{ x: '-100%' }}
               whileHover={{ x: '100%' }}
               transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
            <Package className="h-6 w-6 text-primary-foreground relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Core
            </span>
            <span className="text-xs font-medium tracking-widest text-primary uppercase -mt-1">
              Inventory
            </span>
          </div>
        </Link>
      </div>

      <div className="px-4 pb-2">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted/50 scrollbar-track-transparent">
        {navigation.map((item) => (
          <NavItem key={item.name} item={item} pathname={pathname} />
        ))}
      </nav>

      <div className="px-4 pt-2">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-muted/50 transition-all duration-200 outline-none cursor-pointer group border border-transparent hover:border-border/50 hover:shadow-sm">
            <div className="relative">
              <Avatar className="h-10 w-10 border-2 border-background shadow-sm group-hover:border-primary/20 transition-colors">
                <AvatarImage src={(session?.user as any)?.avatarUrl || ""} alt={session?.user?.name || "User"} />
                <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-muted to-muted/50 text-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{session?.user?.name}</p>
              <p className="text-xs font-medium text-muted-foreground truncate capitalize flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                {session?.user?.role?.toLowerCase()}
              </p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl border-border/40 shadow-xl backdrop-blur-xl bg-card/95">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="opacity-50" />
            <DropdownMenuItem className="rounded-lg cursor-pointer transition-colors focus:bg-primary/10 focus:text-primary">
              <Link href="/profile" className="flex items-center gap-2 w-full">
                <User className="h-4 w-4" />
                <span>My Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg cursor-pointer transition-colors focus:bg-primary/10 focus:text-primary">
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings className="h-4 w-4" />
                <span>Preferences</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="opacity-50" />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-background/80 backdrop-blur-md border border-border/40 shadow-sm lg:hidden focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all hover:bg-muted/50"
      >
        <AnimatePresence mode="wait">
           {mobileOpen ? (
             <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
               <X className="h-5 w-5" />
             </motion.div>
           ) : (
             <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
               <Menu className="h-5 w-5" />
             </motion.div>
           )}
        </AnimatePresence>
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-y-0 left-0 z-40 w-72 lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0">
        {sidebarContent}
      </aside>
    </>
  );
}
