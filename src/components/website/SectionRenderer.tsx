import ReactMarkdown from "react-markdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, ExternalLink } from "lucide-react";

interface SectionItem {
  id: string;
  title: string;
  shortDescription?: string;
  webTags?: string[];
  url?: string;
}

interface Section {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  body_markdown?: string;
  layout?: string;
  items?: SectionItem[];
}

interface Props {
  section: Section;
  websiteSlug: string;
}

export function SectionRenderer({ section, websiteSlug }: Props) {
  switch (section.type) {
    case "hero":
      return <HeroSection section={section} />;
    case "text_block":
      return <TextBlockSection section={section} />;
    case "cta":
      return <CTASection section={section} />;
    case "services_list":
    case "quests_list":
    case "guilds_list":
    case "projects_list":
      return <ListSection section={section} />;
    default:
      return null;
  }
}

/* ─── Hero ─── */
function HeroSection({ section }: { section: Section }) {
  return (
    <section className="py-12 md:py-20 text-center">
      {section.title && (
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
          {section.title}
        </h1>
      )}
      {section.subtitle && (
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6">
          {section.subtitle}
        </p>
      )}
      {section.body_markdown && (
        <div className="prose prose-sm md:prose-base max-w-2xl mx-auto text-muted-foreground">
          <ReactMarkdown>{section.body_markdown}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}

/* ─── Text Block ─── */
function TextBlockSection({ section }: { section: Section }) {
  return (
    <section className="py-8">
      {section.title && (
        <h2 className="text-2xl font-bold text-foreground mb-4">{section.title}</h2>
      )}
      {section.body_markdown && (
        <div className="prose prose-sm md:prose-base max-w-3xl text-foreground/90">
          <ReactMarkdown>{section.body_markdown}</ReactMarkdown>
        </div>
      )}
    </section>
  );
}

/* ─── CTA ─── */
function CTASection({ section }: { section: Section }) {
  return (
    <section className="py-10 px-6 md:px-12 rounded-2xl bg-muted/50 border border-border text-center">
      {section.title && (
        <h2 className="text-2xl font-bold text-foreground mb-3">{section.title}</h2>
      )}
      {section.body_markdown && (
        <div className="prose prose-sm max-w-xl mx-auto text-muted-foreground mb-6">
          <ReactMarkdown>{section.body_markdown}</ReactMarkdown>
        </div>
      )}
      <Button size="lg" className="gap-2">
        Get in touch <ArrowRight className="h-4 w-4" />
      </Button>
    </section>
  );
}

/* ─── List Section (services, quests, guilds, projects) ─── */
function ListSection({ section }: { section: Section }) {
  const items = section.items || [];
  const isGrid = section.layout !== "list";

  const typeLabel: Record<string, string> = {
    services_list: "service",
    quests_list: "quest",
    guilds_list: "guild",
    projects_list: "project",
  };
  const entityType = typeLabel[section.type] || "item";

  return (
    <section className="py-8">
      {section.title && (
        <h2 className="text-2xl font-bold text-foreground mb-6">{section.title}</h2>
      )}
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm py-4">No {entityType}s to display yet.</p>
      ) : isGrid ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} entityType={entityType} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} entityType={entityType} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Cards ─── */
function ItemCard({ item, entityType }: { item: SectionItem; entityType: string }) {
  const link = entityLink(entityType, item.id);
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors">
      <h3 className="font-semibold text-foreground">{item.title}</h3>
      {item.shortDescription && (
        <p className="text-sm text-muted-foreground line-clamp-3">{item.shortDescription}</p>
      )}
      {item.webTags && item.webTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.webTags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto text-sm text-primary hover:underline flex items-center gap-1"
      >
        View on changethegame <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function ItemRow({ item, entityType }: { item: SectionItem; entityType: string }) {
  const link = entityLink(entityType, item.id);
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card px-5 py-4 hover:border-primary/40 transition-colors">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
        {item.shortDescription && (
          <p className="text-sm text-muted-foreground line-clamp-1">{item.shortDescription}</p>
        )}
      </div>
      {item.webTags && item.webTags.length > 0 && (
        <div className="hidden sm:flex gap-1">
          {item.webTags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-primary hover:underline flex items-center gap-1 shrink-0"
      >
        View <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function entityLink(type: string, id: string): string {
  const base = window.location.origin;
  const map: Record<string, string> = {
    service: `/services/${id}`,
    quest: `/quests/${id}`,
    guild: `/guilds/${id}`,
    project: `/quests/${id}`,
  };
  return `${base}${map[type] || `/explore`}`;
}
