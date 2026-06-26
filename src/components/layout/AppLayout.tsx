"use client"

import { type ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import Link from "next/link";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/leads", label: "Leads", icon: "👤" },
    { href: "/customers", label: "Customers", icon: "👥" },
    { href: "/applications", label: "Applications", icon: "📋" },
    { href: "/follow-ups", label: "Follow-ups", icon: "📞" },
    { href: "/banks", label: "Banks", icon: "🏦" },
    ...(isAdmin ? [{ href: "/jobbers", label: "Jobbers", icon: "🔧" }] : []),
    { href: "/alerts", label: "Alerts", icon: "🔔" },
    { href: "/emails", label: "Emails", icon: "✉️" },
    { href: "/audit-logs", label: "Audit Logs", icon: "📝" },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          <Link href="/dashboard" className="font-heading text-xl italic text-foreground tracking-tight">
            SR Finance
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitch />
            <span className="text-sm text-muted-foreground/80 hidden sm:inline">
              {user?.fullName}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="w-56 min-h-[calc(100vh-3.5rem)] hidden md:block border-r border-border/30 bg-background/40">
          <nav className="p-3 space-y-0.5">
            {navLinks.map((link) => {
              const isActive = router.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all duration-150 ${
                    isActive
                      ? "bg-foreground/[0.04] text-foreground font-medium"
                      : "text-muted-foreground/70 hover:bg-foreground/[0.02] hover:text-foreground/80"
                  }`}
                >
                  <span className="text-base opacity-70">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}