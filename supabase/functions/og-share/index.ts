// OG Share — serves entity-specific OG meta tags for social cards
// Supports both:
//   - Clean paths:  /og-share/quest/UUID
//   - Query params: /og-share?type=quest&id=UUID  (legacy)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const APP_URL = "https://changethegame.xyz";
  const BRAND = "changethegame";
  const TAGLINE = "Human-powered. AI-augmented. Game-changing.";
  const DEFAULT_IMAGE = APP_URL + "/og-image.png";

  function esc(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function synthesize(text: string | null | undefined, maxLen = 160): string {
    if (!text) return "";
    const clean = (text.split(/[.!?]\s/)[0] || text).replace(/\s+/g, " ").trim();
    return clean.length <= maxLen ? clean : clean.slice(0, maxLen - 1).trimEnd() + "\u2026";
  }

  function buildDesc(title: string, desc: string | null, label: string): string {
    const s = synthesize(desc, 200);
    if (s && s.length > 30) return s;
    const prefix = s ? s + " — " : "";
    if (title) return prefix + "Discover \"" + title + "\" — a " + label.toLowerCase() + " on " + BRAND + ". " + TAGLINE;
    return prefix + "Explore this " + label.toLowerCase() + " on " + BRAND + ". " + TAGLINE;
  }

  function buildHtml(title: string, desc: string, image: string, pageUrl: string, shouldRedirect: boolean): string {
    const t = esc(title);
    const d = esc(desc);
    const i = esc(image);
    const u = esc(pageUrl);
    const refreshTag = shouldRedirect ? `<meta http-equiv="refresh" content="0;url=${u}"/>` : "";
    return "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/>" +
      "<title>" + t + " | " + BRAND + "</title>" +
      "<meta property=\"og:type\" content=\"website\"/>" +
      "<meta property=\"og:title\" content=\"" + t + "\"/>" +
      "<meta property=\"og:description\" content=\"" + d + "\"/>" +
      "<meta property=\"og:image\" content=\"" + i + "\"/>" +
      "<meta property=\"og:image:secure_url\" content=\"" + i + "\"/>" +
      "<meta property=\"og:image:width\" content=\"1200\"/>" +
      "<meta property=\"og:image:height\" content=\"630\"/>" +
      "<meta property=\"og:url\" content=\"" + u + "\"/>" +
      "<meta property=\"og:site_name\" content=\"" + BRAND + "\"/>" +
      "<meta name=\"twitter:card\" content=\"summary_large_image\"/>" +
      "<meta name=\"twitter:title\" content=\"" + t + "\"/>" +
      "<meta name=\"twitter:description\" content=\"" + d + "\"/>" +
      "<meta name=\"twitter:image\" content=\"" + i + "\"/>" +
      "<meta name=\"description\" content=\"" + d + "\"/>" +
      refreshTag +
      "</head><body><p>Redirecting\u2026</p></body></html>";
  }

  function isSocialBot(userAgent: string): boolean {
    const ua = userAgent.toLowerCase();
    return [
      "whatsapp", "facebookexternalhit", "facebot", "twitterbot",
      "linkedinbot", "slackbot", "discordbot", "telegrambot",
      "skypeuripreview", "pinterest", "googlebot", "applebot",
      "bingbot", "yandex", "embedly", "outbrain", "quora",
      "vkshare", "w3c_validator",
    ].some((bot) => ua.includes(bot));
  }

  function resolveImage(type: string, id: string, rawImage: string | null | undefined): string {
    const image = (rawImage || "").trim();
    if (image && /^https?:\/\//i.test(image) && !image.endsWith("/favicon.png")) {
      return image;
    }
    return `https://api.dicebear.com/9.x/shapes/png?seed=${encodeURIComponent(`${type}-${id}`)}&size=1200`;
  }

  const MAP: Record<string, { table: string; title: string; desc: string; img: string; fallback: string; path: string; label: string }> = {
    quest:     { table: "quests",       title: "title", desc: "description", img: "cover_image_url", fallback: "",         path: "/quests",      label: "Quest" },
    guild:     { table: "guilds",       title: "name",  desc: "description", img: "banner_url",      fallback: "logo_url", path: "/guilds",      label: "Guild" },
    service:   { table: "services",     title: "title", desc: "description", img: "image_url",       fallback: "",         path: "/services",    label: "Service" },
    company:   { table: "companies",    title: "name",  desc: "description", img: "banner_url",      fallback: "logo_url", path: "/companies",   label: "Organization" },
    event:     { table: "guild_events", title: "title", desc: "description", img: "",                fallback: "",         path: "/events",      label: "Event" },
    course:    { table: "courses",      title: "title", desc: "description", img: "cover_image_url", fallback: "",         path: "/courses",     label: "Course" },
    profile:   { table: "profiles",     title: "name",  desc: "bio",         img: "avatar_url",      fallback: "",         path: "/users",       label: "Human" },
    territory: { table: "territories",  title: "name",  desc: "summary",     img: "",                fallback: "",         path: "/territories", label: "Territory" },
    pod:       { table: "guilds",       title: "name",  desc: "description", img: "banner_url",      fallback: "logo_url", path: "/pods",        label: "Pod" },
    topic:     { table: "topics",       title: "name",  desc: "description", img: "image_url",       fallback: "",         path: "/topics",      label: "Topic" },
  };

  try {
    const reqUrl = new URL(req.url);
    const userAgent = req.headers.get("user-agent") || "";
    const socialBot = isSocialBot(userAgent);

    // Parse type & id from either clean path or query params
    let type: string | null = null;
    let id: string | null = null;
    let ref: string | null = reqUrl.searchParams.get("ref");

    // Clean path format: /og-share/quest/UUID or just /quest/UUID
    const pathParts = reqUrl.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
    // Remove "og-share" prefix if present (Supabase function routing)
    const cleanParts = pathParts[0] === "og-share" ? pathParts.slice(1) : pathParts;

    if (cleanParts.length >= 2) {
      type = decodeURIComponent(cleanParts[0]);
      id = decodeURIComponent(cleanParts[1]);
    }

    // Fallback to query params (legacy support)
    if (!type) type = reqUrl.searchParams.get("type");
    if (!id) id = reqUrl.searchParams.get("id");
    if (!ref) ref = reqUrl.searchParams.get("ref");

    if (!type || !id) {
      // Root hit — redirect to main site
      return new Response(buildHtml(BRAND + " — " + TAGLINE, TAGLINE, DEFAULT_IMAGE, APP_URL, true), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const c = MAP[type];
    if (!c) {
      return new Response(buildHtml(BRAND, TAGLINE, DEFAULT_IMAGE, APP_URL, true), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const sbUrl = Deno.env.get("SUPABASE_URL") || "";
    const sbKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

    const cols: string[] = [c.title, c.desc];
    if (c.img) cols.push(c.img);
    if (c.fallback) cols.push(c.fallback);
    const idCol = type === "profile" ? "user_id" : "id";

    const restUrl = sbUrl + "/rest/v1/" + c.table + "?select=" + cols.join(",") + "&" + idCol + "=eq." + id + "&limit=1";
    const res = await fetch(restUrl, {
      headers: { apikey: sbKey, Authorization: "Bearer " + sbKey, Accept: "application/json" },
    });
    const rows = await res.json();
    const data = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    const appUrl = APP_URL + c.path + "/" + encodeURIComponent(id) + (ref ? "?ref=" + encodeURIComponent(ref) : "");

    if (!data) {
      return new Response(buildHtml(BRAND, "Explore this " + c.label.toLowerCase() + " on " + BRAND, resolveImage(type, id, null), appUrl, !socialBot), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
      });
    }

    const rawTitle = data[c.title] || c.label;
    const title = c.label + ": " + rawTitle;
    const description = buildDesc(rawTitle, data[c.desc], c.label);
    const rawImage = (c.img && data[c.img]) || (c.fallback && data[c.fallback]) || null;
    const image = resolveImage(type, id, rawImage);

    console.log(`OG card: type=${type} id=${id} title="${rawTitle}" image=${image ? "yes" : "fallback"}`);

    return new Response(buildHtml(title, description, image, appUrl, !socialBot), {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
    });
  } catch (err) {
    console.error("OG error:", err);
    return new Response(buildHtml(BRAND, TAGLINE, DEFAULT_IMAGE, APP_URL, true), {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0" },
    });
  }
});
