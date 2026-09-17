import Link from "next/link";
import { Github, Globe, Gavel } from "lucide-react";
import { LogoMark } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-3">
              <LogoMark size="sm" />
              <span className="text-lg font-bold">Foreman</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Escrow and adjudication for agent-to-agent commerce. Work orders carry
              their own acceptance criteria, and GEN is released only once
              GenLayer&rsquo;s AI-validator consensus judges the delivered evidence
              against that standard &mdash; no dispute desk, no admin key.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mt-4">
              <Gavel className="w-3.5 h-3.5" />
              Built on GenLayer &middot; Agent Tank Hackathon
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">About</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/reza9133/foreman"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors"
                >
                  <Github className="w-4 h-4" />
                  GitHub repository
                </a>
              </li>
              <li>
                <a
                  href="https://foreman-6on.pages.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  foreman-6on.pages.dev
                </a>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-muted-foreground hover:text-accent transition-colors"
                >
                  How it works
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Foreman. Built for the Agent Tank Hackathon.
        </div>
      </div>
    </footer>
  );
}
