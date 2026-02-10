import { Globe, Twitter, Linkedin, Instagram } from "lucide-react";
import { Input } from "@/components/ui/input";

export interface SocialLinksData {
  websiteUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  instagramUrl?: string | null;
}

/** Normalize URL: prepend https:// if missing */
export function normalizeUrl(url: string | undefined | null): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

const LINKS = [
  { key: "websiteUrl" as const, label: "Website", icon: Globe, placeholder: "https://example.com" },
  { key: "linkedinUrl" as const, label: "LinkedIn", icon: Linkedin, placeholder: "https://linkedin.com/in/…" },
  { key: "twitterUrl" as const, label: "Twitter / X", icon: Twitter, placeholder: "https://x.com/…" },
  { key: "instagramUrl" as const, label: "Instagram", icon: Instagram, placeholder: "https://instagram.com/…" },
] as const;

/** Display row of social link icons (only non-empty ones) */
export function SocialLinksDisplay({ data }: { data: SocialLinksData }) {
  const active = LINKS.filter((l) => data[l.key]);
  if (active.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {active.map((l) => {
        const Icon = l.icon;
        const href = normalizeUrl(data[l.key]);
        return (
          <a
            key={l.key}
            href={href!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors"
            title={l.label}
          >
            <Icon className="h-4 w-4" />
          </a>
        );
      })}
    </div>
  );
}

/** Editable form fields for social links */
export function SocialLinksEdit({
  data,
  onChange,
}: {
  data: SocialLinksData;
  onChange: (key: keyof SocialLinksData, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      {LINKS.map((l) => {
        const Icon = l.icon;
        return (
          <div key={l.key}>
            <label className="text-sm font-medium mb-1 flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" /> {l.label}
            </label>
            <Input
              value={data[l.key] ?? ""}
              onChange={(e) => onChange(l.key, e.target.value)}
              placeholder={l.placeholder}
              maxLength={500}
            />
          </div>
        );
      })}
    </div>
  );
}
