"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Music,
  Users,
  BookOpen,
  Mic,
  ListMusic,
  Dumbbell,
  Clock,
  Settings,
  LogOut,
  Home,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/bands", label: "Bands", icon: Users },
  { href: "/learning", label: "Learning", icon: BookOpen },
  { href: "/recording", label: "Recording", icon: Mic },
  { href: "/setlists", label: "Setlists", icon: ListMusic },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/practice-log", label: "Practice Log", icon: Clock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <aside className="flex w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Music className="h-6 w-6" />
          <span>BandBrain</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
