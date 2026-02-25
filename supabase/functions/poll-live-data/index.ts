import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface LiveConfig {
  type: "http_api" | "scraper";
  endpoint: string;
  metrics_map?: Record<string, string>;
  selector?: string;
  metric?: string;
  unit?: string;
  refresh_minutes?: number;
}

interface NsRow {
  id: string;
  live_config: LiveConfig;
  source_url: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all natural systems with a live_config
    const { data: systems, error: fetchErr } = await supabase
      .from("natural_systems")
      .select("id, live_config, source_url")
      .not("live_config", "is", null)
      .eq("is_deleted", false);

    if (fetchErr) throw fetchErr;

    const results: { id: string; points: number; error?: string }[] = [];

    for (const ns of (systems ?? []) as NsRow[]) {
      try {
        const cfg = ns.live_config;
        if (!cfg?.endpoint) {
          results.push({ id: ns.id, points: 0, error: "no endpoint" });
          continue;
        }

        const points: {
          natural_system_id: string;
          metric: string;
          value: number;
          unit: string | null;
          source: string;
          recorded_at: string;
        }[] = [];

        if (cfg.type === "http_api") {
          const res = await fetch(cfg.endpoint, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(15_000),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();

          // metrics_map: { "external_field": "internal_metric" }
          const map = cfg.metrics_map ?? {};
          for (const [extKey, intMetric] of Object.entries(map)) {
            const val = extractNestedValue(json, extKey);
            if (val !== null && typeof val === "number") {
              points.push({
                natural_system_id: ns.id,
                metric: intMetric,
                value: val,
                unit: cfg.unit ?? null,
                source: "api",
                recorded_at: new Date().toISOString(),
              });
            }
          }
        } else if (cfg.type === "scraper") {
          // Simple HTML scraping: fetch page, extract text via regex around selector
          const res = await fetch(cfg.endpoint, {
            signal: AbortSignal.timeout(15_000),
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const html = await res.text();

          // Try to extract numeric value near the CSS selector id/class
          const selectorId = (cfg.selector ?? "").replace(/^[#.]/, "");
          if (selectorId) {
            // Look for content near the selector in raw HTML
            const pattern = new RegExp(
              `(?:id|class)=["']?[^"']*${escapeRegex(selectorId)}[^"']*["']?[^>]*>([^<]+)`,
              "i"
            );
            const match = html.match(pattern);
            if (match) {
              const numMatch = match[1].match(/-?\d+(\.\d+)?/);
              if (numMatch) {
                points.push({
                  natural_system_id: ns.id,
                  metric: cfg.metric ?? "value",
                  value: parseFloat(numMatch[0]),
                  unit: cfg.unit ?? null,
                  source: "scraper",
                  recorded_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        if (points.length > 0) {
          const { error: insertErr } = await supabase
            .from("natural_system_data_points")
            .insert(points);
          if (insertErr) throw insertErr;

          // Recompute indicators for this system
          await supabase.rpc("recompute_natural_system_indicators", {
            p_natural_system_id: ns.id,
          });
        }

        results.push({ id: ns.id, points: points.length });
      } catch (e) {
        results.push({ id: ns.id, points: 0, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj) ?? null;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
