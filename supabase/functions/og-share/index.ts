import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!;
const APP_URL = "https://questhub101.lovable.app";
const DEFAULT_IMAGE = `${APP_URL}/favicon.png`;

function synthesize(text: string | null | undefined, maxLen = 160): string {
  if (!text) return "Discover this on Game Changers";
  // Take first sentence
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0] || text;
  const clean = firstSentence.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 1).trimEnd() + "…";
}

function buildHtml(title: string, description: string, image: string, url: string): string {
  const safeTitle = title.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const safeDesc = description.replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const safeImage = image.replace(/"/g, "&quot;");
  const safeUrl = url.replace(/"/g, "&quot;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${safeTitle}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website"/>
  <meta property="og:title" content="${safeTitle}"/>
  <meta property="og:description" content="${safeDesc}"/>
  <meta property="og:image" content="${safeImage}"/>
  <meta property="og:url" content="${safeUrl}"/>
  <meta property="og:site_name" content="Game Changers"/>

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:title" content="${safeTitle}"/>
  <meta name="twitter:description" content="${safeDesc}"/>
  <meta name="twitter:image" content="${safeImage}"/>

  <!-- Description -->
  <meta name="description" content="${safeDesc}"/>

  <!-- Redirect real browsers to the app -->
  <meta http-equiv="refresh" content="0;url=${safeUrl}"/>
</head>
<body>
  <p>Redirecting to <a href="${safeUrl}">${safeTitle}</a>…</p>
</body>
</html>`;
}

type EntityConfig = {
  table: string;
  titleField: string;
  descField: string;
  imageField: string;
  fallbackImageField?: string;
  pathPrefix: string;
  namePrefix: string;
};

const ENTITY_MAP: Record<string, EntityConfig> = {
  quest: {
    table: "quests",
    titleField: "title",
    descField: "description",
    imageField: "cover_image_url",
    pathPrefix: "/quests",
    namePrefix: "Quest",
  },
  guild: {
    table: "guilds",
    titleField: "name",
    descField: "description",
    imageField: "banner_url",
    fallbackImageField: "logo_url",
    pathPrefix: "/guilds",
    namePrefix: "Guild",
  },
  service: {
    table: "services",
    titleField: "title",
    descField: "description",
    imageField: "cover_image_url",
    pathPrefix: "/services",
    namePrefix: "Service",
  },
  company: {
    table: "companies",
    titleField: "name",
    descField: "description",
    imageField: "banner_url",
    fallbackImageField: "logo_url",
    pathPrefix: "/companies",
    namePrefix: "Company",
  },
  event: {
    table: "guild_events",
    titleField: "title",
    descField: "description",
    imageField: "",
    pathPrefix: "/events",
    namePrefix: "Event",
  },
  course: {
    table: "courses",
    titleField: "title",
    descField: "description",
    imageField: "cover_image_url",
    pathPrefix: "/courses",
    namePrefix: "Course",
  },
  profile: {
    table: "profiles_public",
    titleField: "name",
    descField: "bio",
    imageField: "banner_url",
    fallbackImageField: "avatar_url",
    pathPrefix: "/profile",
    namePrefix: "",
  },
  territory: {
    table: "territories",
    titleField: "name",
    descField: "description",
    imageField: "banner_url",
    pathPrefix: "/territories",
    namePrefix: "Territory",
  },
  pod: {
    table: "guilds",
    titleField: "name",
    descField: "description",
    imageField: "banner_url",
    fallbackImageField: "logo_url",
    pathPrefix: "/pods",
    namePrefix: "Pod",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type");
    const id = url.searchParams.get("id");

    if (!type || !id) {
      return new Response("Missing type or id", { status: 400, headers: corsHeaders });
    }

    const config = ENTITY_MAP[type];
    if (!config) {
      return new Response("Unknown entity type", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Build select fields
    const fields = [config.titleField, config.descField];
    if (config.imageField) fields.push(config.imageField);
    if (config.fallbackImageField) fields.push(config.fallbackImageField);

    // Profile uses user_id, others use id
    const idField = type === "profile" ? "user_id" : "id";

    const { data, error } = await supabase
      .from(config.table)
      .select(fields.join(", "))
      .eq(idField, id)
      .maybeSingle();

    if (error || !data) {
      // Fallback: redirect to app anyway
      const appUrl = `${APP_URL}${config.pathPrefix}/${id}`;
      const html = buildHtml("Game Changers", "Discover this on Game Changers", DEFAULT_IMAGE, appUrl);
      return new Response(html, {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const title = data[config.titleField]
      ? `${config.namePrefix ? config.namePrefix + ": " : ""}${data[config.titleField]}`
      : "Game Changers";

    const description = synthesize(data[config.descField]);

    let image = DEFAULT_IMAGE;
    if (config.imageField && data[config.imageField]) {
      image = data[config.imageField];
    } else if (config.fallbackImageField && data[config.fallbackImageField]) {
      image = data[config.fallbackImageField];
    }

    const appUrl = `${APP_URL}${config.pathPrefix}/${id}`;
    const html = buildHtml(title, description, image, appUrl);

    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    console.error("OG share error:", err);
    const html = buildHtml("Game Changers", "Discover this on Game Changers", DEFAULT_IMAGE, APP_URL);
    return new Response(html, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
