// OG Share — serves OG meta tags for shared links and redirects browsers to changethegame.xyz

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
  const DEFAULT_IMAGE = APP_URL + "/favicon.png";

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
    // Short or missing description — build a richer fallback
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
      "</head><body><p>Redirecting...</p></body></html>";
  }

  function isSocialBot(userAgent: string): boolean {
    const ua = userAgent.toLowerCase();
    return [
      "whatsapp", "facebookexternalhit", "facebot", "twitterbot", "linkedinbot", "slackbot", "discordbot", "telegrambot", "skypeuripreview", "pinterest", "googlebot"
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
    const type = reqUrl.searchParams.get("type");
    const id = reqUrl.searchParams.get("id");
    const ref = reqUrl.searchParams.get("ref");
    const userAgent = req.headers.get("user-agent") || "";
    const socialBot = isSocialBot(userAgent);

    if (!type || !id) {
      return new Response("Missing type or id", { status: 400, headers: corsHeaders });
    }

    const c = MAP[type];
    if (!c) {
      return new Response("Unknown type", { status: 400, headers: corsHeaders });
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

    const appUrl = APP_URL + c.path + "/" + id + (ref ? "?ref=" + ref : "");

    if (!data) {
      return new Response(buildHtml(BRAND, "Explore this " + c.label.toLowerCase() + " on " + BRAND, DEFAULT_IMAGE, appUrl), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const rawTitle = data[c.title] || c.label;
    const title = c.label + ": " + rawTitle;
    const description = buildDesc(rawTitle, data[c.desc], c.label);
    const image = (c.img && data[c.img]) || (c.fallback && data[c.fallback]) || DEFAULT_IMAGE;

    return new Response(buildHtml(title, description, image, appUrl), {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    console.error("OG error:", err);
    return new Response(buildHtml(BRAND, TAGLINE, DEFAULT_IMAGE, APP_URL), {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
