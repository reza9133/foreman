"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { AccountPanel } from "./AccountPanel";
import { useProtocolStats } from "@/lib/hooks/useForeman";
import { Logo, LogoMark } from "./Logo";
import { Button } from "./ui/button";

const NAV_LINKS = [
  { href: "/orders", label: "Orders" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/lifecycle", label: "Lifecycle" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  // O(1) on-chain counters — the navbar used to download every order on every page.
  const { data: stats } = useProtocolStats();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const threshold = 80;

      setIsScrolled(scrollY > 20);

      const progress = Math.min(Math.max((scrollY - 10) / threshold, 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const paddingTop = Math.round(scrollProgress * 16);
  const headerHeight = 64 - Math.round(scrollProgress * 8);

  const getBorderRadius = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      return Math.round(scrollProgress * 9999);
    }
    return 0;
  };
  const borderRadius = getBorderRadius();

  const orderCount = stats?.order_count ?? 0;
  const verdicts = stats?.settled_count ?? 0;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out"
      style={{ paddingTop: `${paddingTop}px` }}
    >
      <div
        className="transition-all duration-500 ease-out"
        style={{
          width: "100%",
          maxWidth: isScrolled ? "80rem" : "100%",
          margin: "0 auto",
          borderRadius: `${borderRadius}px`,
        }}
      >
        <div
          className="backdrop-blur-xl border transition-all duration-500 ease-out md:rounded-none"
          style={{
            borderColor: `oklch(0.3 0.02 0 / ${0.4 + scrollProgress * 0.4})`,
            background: `linear-gradient(135deg, oklch(0.18 0.01 0 / ${0.1 + scrollProgress * 0.3}) 0%, oklch(0.15 0.01 0 / ${0.05 + scrollProgress * 0.25}) 50%, oklch(0.16 0.01 0 / ${0.08 + scrollProgress * 0.27}) 100%)`,
            borderRadius: `${borderRadius}px`,
            borderWidth: "1px",
            borderLeftWidth: isScrolled ? "1px" : "0px",
            borderRightWidth: isScrolled ? "1px" : "0px",
            borderTopWidth: isScrolled ? "1px" : "0px",
            boxShadow: isScrolled
              ? "0 32px 64px 0 rgba(0, 0, 0, 0.2), inset 0 1px 0 0 oklch(0.3 0.02 0 / 0.3)"
              : "none",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
          }}
        >
          <div
            className="px-6 transition-all duration-500 mx-auto"
            style={{ maxWidth: isScrolled ? "80rem" : "112rem" }}
          >
            <div
              className="flex items-center justify-between transition-all duration-500"
              style={{ height: `${headerHeight}px` }}
            >
              <Link href="/" className="flex items-center gap-3 group">
                <LogoMark size="md" className="flex md:hidden" animated />
                <Logo size="md" className="hidden md:flex" animated />
                <span className="text-lg font-bold ml-2 md:hidden">Foreman</span>
              </Link>

              <div className="hidden lg:flex items-center gap-5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Orders:</span>
                  <span className="text-foreground font-bold text-accent">{orderCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Verdicts:</span>
                  <span className="text-foreground font-bold text-accent">{verdicts}</span>
                </div>
                {NAV_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} className="text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <details className="lg:hidden relative group/menu">
                  <summary
                    className="list-none cursor-pointer rounded-md border border-border bg-background/70 px-3 py-1.5 text-sm font-medium select-none"
                    aria-label="Open navigation menu"
                  >
                    Menu
                  </summary>
                  <nav className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card p-2 shadow-xl">
                    {NAV_LINKS.concat([{ href: "/how-it-works", label: "How it works" }]).map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent/10"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </nav>
                </details>
                <Link href="/orders/new">
                  <Button size="sm" className="gap-1.5">
                    <PlusCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">New order</span>
                  </Button>
                </Link>
                <AccountPanel />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
