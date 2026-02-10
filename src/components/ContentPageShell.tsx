import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/PageShell";

interface ContentPageShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  backTo?: string;
  backLabel?: string;
}

export function ContentPageShell({ title, subtitle, children, backTo = "/", backLabel = "Back" }: ContentPageShellProps) {
  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link to={backTo}><ArrowLeft className="h-4 w-4 mr-1" /> {backLabel}</Link>
      </Button>
      <article className="max-w-3xl mx-auto">
        <h1 className="font-display text-3xl font-bold mb-2">{title}</h1>
        {subtitle && <p className="text-lg text-muted-foreground mb-8">{subtitle}</p>}
        <div className="space-y-8">{children}</div>
      </article>
    </PageShell>
  );
}

export function ContentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold mb-3">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export function ContentList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

export function ContentCTA({ links }: { links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 pt-4">
      {links.map((l) => (
        <Button key={l.href} asChild variant="outline">
          <Link to={l.href}>{l.label}</Link>
        </Button>
      ))}
    </div>
  );
}
