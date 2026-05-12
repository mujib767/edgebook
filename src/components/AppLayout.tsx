import { Link, Outlet, useRouter, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpen,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  TrendingUp,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/journal", label: "Journal", icon: BookOpen },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/ai-coach", label: "AI Coach", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = location.pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        <div className="flex h-16 items-center gap-2 px-5 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">Edgebook</span>
        </div>
        <div className="flex-1 py-4">
          <NavLinks />
        </div>
        <div className="p-3 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">Edgebook</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="ghost"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
            <div className="h-16 flex items-center px-5 border-b border-sidebar-border font-semibold">
              Edgebook
            </div>
            <div className="py-4">
              <NavLinks onNavigate={() => setOpen(false)} />
            </div>
            <div className="p-3 border-t border-sidebar-border">
              <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <main className="flex-1 md:pl-0 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
