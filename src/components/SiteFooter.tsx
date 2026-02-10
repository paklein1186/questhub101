import { Link } from "react-router-dom";
import { useState } from "react";
import { Zap, ChevronDown, ExternalLink } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const FOOTER_COLUMNS = [
  {
    title: "Core",
    links: [
      { label: "About", href: "/about", external: false },
      { label: "How it works", href: "/about#how-it-works", external: false },
      { label: "Guides & Support", href: "/about#support", external: false },
      { label: "Contact", href: "/about#contact", external: false },
      { label: "Privacy Policy", href: "/privacy", external: false },
      { label: "Terms of Service", href: "/terms", external: false },
      { label: "Cookies", href: "/cookies", external: false },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Discover Quests", href: "/explore?tab=quests", external: false },
      { label: "Find Guilds & Collectives", href: "/explore?tab=guilds", external: false },
      { label: "Browse Companies", href: "/explore?tab=companies", external: false },
      { label: "Explore People", href: "/explore/users", external: false },
      { label: "Territories & Houses", href: "/explore/houses", external: false },
    ],
  },
  {
    title: "Start Something",
    links: [
      { label: "Create a Quest", href: "/quests/new", external: false },
      { label: "Offer a Service", href: "/services/new", external: false },
      { label: "Create a Guild", href: "/me/guilds", external: false },
      { label: "Create a Company", href: "/me/companies", external: false },
      { label: "Browse Courses", href: "/explore?tab=courses", external: false },
    ],
  },
  {
    title: "AI Agents",
    links: [
      { label: "What AI can do here", href: "/about#ai", external: false },
      { label: "Territory Agents", href: "/explore/houses", external: false },
      { label: "AI Ethics & Transparency", href: "/about#ai-ethics", external: false },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Community Guidelines", href: "/terms#guidelines", external: false },
      { label: "Governance Model", href: "/about#governance", external: false },
      { label: "Roadmap & Changelog", href: "/about#roadmap", external: false },
      { label: "Bug Reporting", href: "/about#contact", external: false },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: "X / Twitter", icon: "𝕏", href: "#" },
  { label: "LinkedIn", icon: "in", href: "#" },
  { label: "Instagram", icon: "📷", href: "#" },
  { label: "Discord", icon: "💬", href: "#" },
];

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string; external: boolean }[] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold text-foreground mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            {link.external ? (
              <a href={link.href} target="_blank" rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                {link.label} <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MobileFooterColumn({ title, links }: { title: string; links: { label: string; href: string; external: boolean }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border last:border-0">
      <CollapsibleTrigger className="flex items-center justify-between w-full py-3 text-sm font-semibold text-foreground">
        {title}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-2 pb-3">
          {links.map((link) => (
            <li key={link.label}>
              {link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                  {link.label} <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SiteFooter() {
  const isMobile = useIsMobile();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container py-10">
        {/* Brand + Columns */}
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Brand & Mission */}
          <div className="lg:max-w-xs shrink-0">
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <Zap className="h-5 w-5 text-primary" /> QuestHub
            </Link>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              A human-powered, AI-augmented ecosystem for regeneration, creativity and collaboration.
            </p>
          </div>

          {/* Link columns */}
          {isMobile ? (
            <div className="flex-1">
              {FOOTER_COLUMNS.map((col) => (
                <MobileFooterColumn key={col.title} title={col.title} links={col.links} />
              ))}
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
              {FOOTER_COLUMNS.map((col) => (
                <FooterColumn key={col.title} title={col.title} links={col.links} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Social */}
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                className="w-8 h-8 rounded-lg border border-border bg-background flex items-center justify-center text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                {s.icon}
              </a>
            ))}
          </div>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} QuestHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
