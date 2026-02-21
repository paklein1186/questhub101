import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { SectionRenderer } from "@/components/website/SectionRenderer";

/* ─── Types ─── */
interface WebsiteSection {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  body_markdown?: string;
  layout?: string;
  items?: { id: string; title: string; shortDescription?: string; webTags?: string[]; url?: string }[];
}

interface WebsitePage {
  id: string;
  slug: string;
  title: string;
  page_type: string;
  sections: WebsiteSection[];
}

interface Website {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  owner_type: string;
  owner_id: string;
  theme_mode?: string;
  theme_primary_color?: string;
  theme_accent_color?: string;
  theme_font_heading?: string;
  theme_font_body?: string;
  pages: WebsitePage[];
}

/* ─── Page ─── */
export default function PublicWebsite() {
  const { websiteSlug, pageSlug } = useParams<{ websiteSlug: string; pageSlug?: string }>();
  const navigate = useNavigate();

  // Fetch full resolved website
  const { data: website, isLoading, error } = useQuery<Website>({
    queryKey: ["public-website", websiteSlug],
    queryFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/public-website/${websiteSlug}/full`;
      const res = await fetch(url, {
        headers: {
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Website not found");
      return res.json();
    },
    enabled: !!websiteSlug,
    staleTime: 60_000,
  });

  // Determine active page
  const activePage = useMemo(() => {
    if (!website?.pages?.length) return null;
    if (pageSlug) {
      return website.pages.find((p) => p.slug === pageSlug) || null;
    }
    // Default to "home" page type
    return website.pages.find((p) => p.page_type === "home") || website.pages[0];
  }, [website, pageSlug]);

  // Apply theme CSS variables
  useEffect(() => {
    if (!website) return;
    const root = document.documentElement;
    if (website.theme_primary_color) root.style.setProperty("--website-primary", website.theme_primary_color);
    if (website.theme_accent_color) root.style.setProperty("--website-accent", website.theme_accent_color);
    return () => {
      root.style.removeProperty("--website-primary");
      root.style.removeProperty("--website-accent");
    };
  }, [website]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <h1 className="text-2xl font-bold text-foreground">Website not found</h1>
        <p className="text-muted-foreground">This website doesn't exist or hasn't been published yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(`/site/${websiteSlug}`)}
            className="font-bold text-lg text-foreground hover:text-primary transition-colors"
          >
            {website.title}
          </button>
          <nav className="flex items-center gap-1">
            {website.pages.map((page) => {
              const isActive =
                activePage?.slug === page.slug;
              return (
                <button
                  key={page.id}
                  onClick={() =>
                    navigate(
                      page.page_type === "home"
                        ? `/site/${websiteSlug}`
                        : `/site/${websiteSlug}/${page.slug}`
                    )
                  }
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {page.title}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {activePage ? (
          <div className="space-y-12">
            {activePage.sections.map((section) => (
              <SectionRenderer key={section.id} section={section} websiteSlug={websiteSlug!} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-16">No pages configured.</p>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 mt-16">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} {website.title}</span>
          <a
            href="https://changethegame.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Powered by changethegame
          </a>
        </div>
      </footer>
    </div>
  );
}
