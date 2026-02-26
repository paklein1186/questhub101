import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ---------- Types ----------
interface DatasetRow {
  id: string;
  title: string;
  source: string;
  dataset_type: string;
  api_base_url: string | null;
  api_method: string;
  api_params_template: Record<string, string>;
  response_mapping: Record<string, string>;
  granularity: string;
}

interface TerritoryRow {
  id: string;
  name: string;
  country_code: string | null;
  nuts_code: string | null;
  granularity: string | null;
  precision_level: string | null;
}

interface StandardIndicator {
  dataset_id: string;
  dataset_title: string;
  dataset_source: string;
  dataset_type: string;
  status: "ok" | "unavailable" | "no_data";
  error?: string;
  indicators: {
    forest_cover: number | null;
    forest_change_rate: number | null;
    carbon_stock: number | null;
    disturbances_index: number | null;
    time_span: { from: string; to: string } | null;
    meta: Record<string, unknown>;
  };
}

// ---------- Core service functions ----------

function buildRequestFromTerritory(
  dataset: DatasetRow,
  territory: TerritoryRow,
  ecoRegion?: { eco_region_code: string; eco_region_name: string } | null
): { url: string; method: string; body?: string } | null {
  if (!dataset.api_base_url) return null;

  const vars: Record<string, string> = {
    "territory.id": territory.id,
    "territory.name": territory.name || "",
    "territory.country_code": territory.country_code || "",
    "territory.nuts_code": territory.nuts_code || "",
    "territory.nuts2_code": (territory.nuts_code || "").slice(0, 4),
    "territory.nuts3_code": (territory.nuts_code || "").slice(0, 5),
    "eco_region_code": ecoRegion?.eco_region_code || "",
    "eco_region_name": ecoRegion?.eco_region_name || "",
  };

  // Replace placeholders in api_base_url
  let url = dataset.api_base_url;
  for (const [k, v] of Object.entries(vars)) {
    url = url.replace(new RegExp(`\\{\\{${k.replace(".", "\\.")}\\}\\}`, "g"), encodeURIComponent(v));
  }

  // Build query params from template
  const params = new URLSearchParams();
  for (const [paramKey, paramTemplate] of Object.entries(dataset.api_params_template || {})) {
    let val = paramTemplate as string;
    for (const [k, v] of Object.entries(vars)) {
      val = val.replace(new RegExp(`\\{\\{${k.replace(".", "\\.")}\\}\\}`, "g"), v);
    }
    if (val) params.set(paramKey, val);
  }

  const method = dataset.api_method || "GET";

  if (method === "GET") {
    const qs = params.toString();
    return { url: qs ? `${url}?${qs}` : url, method: "GET" };
  } else if (method === "POST") {
    const bodyObj: Record<string, string> = {};
    params.forEach((v, k) => { bodyObj[k] = v; });
    return { url, method: "POST", body: JSON.stringify(bodyObj) };
  }

  return null;
}

async function fetchDatasetForTerritory(
  dataset: DatasetRow,
  territory: TerritoryRow,
  ecoRegion?: { eco_region_code: string; eco_region_name: string } | null
): Promise<{ raw: unknown; status: "ok" | "unavailable" | "no_data"; error?: string }> {
  if (dataset.api_method === "STATIC_FILE") {
    // For static files, return the example_response as mock data
    return { raw: dataset.response_mapping || {}, status: "no_data" };
  }

  const req = buildRequestFromTerritory(dataset, territory, ecoRegion);
  if (!req) {
    return { raw: null, status: "no_data", error: "No API URL configured" };
  }

  try {
    const fetchOpts: RequestInit = {
      method: req.method,
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
    };
    if (req.body) fetchOpts.body = req.body;

    const resp = await fetch(req.url, fetchOpts);
    if (!resp.ok) {
      return { raw: null, status: "unavailable", error: `HTTP ${resp.status}` };
    }
    const json = await resp.json();
    return { raw: json, status: "ok" };
  } catch (e) {
    return { raw: null, status: "unavailable", error: String(e) };
  }
}

function resolveJsonPath(obj: unknown, path: string): unknown {
  const parts = path.split(".");
  let current = obj;
  for (const p of parts) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[p];
  }
  return current ?? null;
}

function mapDatasetResponse(
  dataset: DatasetRow,
  rawResponse: unknown
): StandardIndicator["indicators"] {
  const mapping = dataset.response_mapping || {};
  const result: StandardIndicator["indicators"] = {
    forest_cover: null,
    forest_change_rate: null,
    carbon_stock: null,
    disturbances_index: null,
    time_span: null,
    meta: {},
  };

  for (const [targetKey, sourcePath] of Object.entries(mapping)) {
    const val = resolveJsonPath(rawResponse, sourcePath as string);
    if (targetKey === "forest_cover" && typeof val === "number") result.forest_cover = val;
    else if (targetKey === "forest_change_rate" && typeof val === "number") result.forest_change_rate = val;
    else if (targetKey === "carbon_stock" && typeof val === "number") result.carbon_stock = val;
    else if (targetKey === "disturbances_index" && typeof val === "number") result.disturbances_index = val;
    else if (targetKey === "time_span_from" && typeof val === "string") {
      result.time_span = result.time_span || { from: "", to: "" };
      result.time_span.from = val;
    } else if (targetKey === "time_span_to" && typeof val === "string") {
      result.time_span = result.time_span || { from: "", to: "" };
      result.time_span.to = val;
    } else {
      result.meta[targetKey] = val;
    }
  }

  return result;
}

// ---------- Main handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { territory_id } = await req.json();
    if (!territory_id || typeof territory_id !== "string") {
      return new Response(JSON.stringify({ error: "territory_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: corsHeaders,
      });
    }

    // 1. Get territory
    const { data: territory, error: tErr } = await supabase
      .from("territories")
      .select("id, name, country_code, nuts_code, granularity, precision_level")
      .eq("id", territory_id)
      .eq("is_deleted", false)
      .single();

    if (tErr || !territory) {
      return new Response(JSON.stringify({ error: "Territory not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get eco region (for BIOREGIONAL_MATCH)
    let ecoRegion: { eco_region_code: string; eco_region_name: string } | null = null;
    if (territory.precision_level === "BIOREGIONAL_MATCH") {
      const serviceSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: ecoData } = await serviceSupabase.rpc("map_territory_to_eco_region", {
        p_territory_id: territory_id,
      });
      if (ecoData && ecoData.length > 0) {
        ecoRegion = {
          eco_region_code: ecoData[0].eco_region_code,
          eco_region_name: ecoData[0].eco_region_name,
        };
      }
    }

    // 3. Get matched datasets
    const { data: matches } = await supabase
      .from("territory_dataset_matches")
      .select("dataset_id")
      .eq("territory_id", territory_id)
      .eq("is_active", true);

    const datasetIds = (matches || []).map((m: { dataset_id: string }) => m.dataset_id);

    let datasets: DatasetRow[] = [];
    if (datasetIds.length > 0) {
      const { data: ds } = await supabase
        .from("environmental_datasets")
        .select("id, title, source, dataset_type, api_base_url, api_method, api_params_template, response_mapping, granularity")
        .in("id", datasetIds)
        .eq("is_active", true);
      datasets = (ds || []) as unknown as DatasetRow[];
    }

    // 4. Fetch + map each dataset
    const results: StandardIndicator[] = [];
    for (const ds of datasets) {
      const { raw, status, error } = await fetchDatasetForTerritory(ds, territory as TerritoryRow, ecoRegion);
      const indicators = status === "ok" ? mapDatasetResponse(ds, raw) : {
        forest_cover: null, forest_change_rate: null, carbon_stock: null,
        disturbances_index: null, time_span: null, meta: {},
      };

      results.push({
        dataset_id: ds.id,
        dataset_title: ds.title,
        dataset_source: ds.source,
        dataset_type: ds.dataset_type,
        status,
        error,
        indicators,
      });
    }

    // 5. Build merged view
    const mergedView: Record<string, unknown> = {};
    for (const r of results) {
      if (r.status !== "ok") continue;
      for (const [k, v] of Object.entries(r.indicators)) {
        if (k === "meta" || k === "time_span") continue;
        if (v !== null && mergedView[k] === undefined) mergedView[k] = v;
      }
    }

    return new Response(
      JSON.stringify({ datasets: results, mergedView, territory_id, eco_region: ecoRegion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
