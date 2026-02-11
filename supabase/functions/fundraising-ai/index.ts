import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const CREDIT_TO_EUR = 0.18;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // --- Auth check ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return unauthorizedResponse();
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
  if (authError || !userData.user) return unauthorizedResponse();
  // --- End auth check ---

  try {
    const { action, quest } = await req.json();
    // quest: { title, description, credit_budget, credit_reward, escrow_credits, funding_goal_credits, price_fiat, price_currency, status, allow_fundraising }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "You are a fundraising and communications expert for a collaborative impact platform. Be concise, inspiring, and actionable.";
    let userPrompt = "";

    const questContext = `Quest: "${quest.title}"
Description: ${quest.description || "No description yet"}
Credit Budget: ${quest.credit_budget || 0} Credits
Credit Reward: ${quest.credit_reward || 0} Credits
Escrow: ${quest.escrow_credits || 0} Credits
Funding Goal: ${quest.funding_goal_credits || "not set"} Credits
Fiat Price: ${quest.price_fiat ? `€${(quest.price_fiat / 100).toFixed(2)}` : "Free"}
Status: ${quest.status}
Fundraising enabled: ${quest.allow_fundraising ? "yes" : "no"}`;

    switch (action) {
      case "pitch":
        userPrompt = `${questContext}

Generate a compelling fundraising pitch (200-300 words) that:
- Opens with a powerful hook
- Explains the mission and impact
- Details what funds will be used for
- Includes a clear call to action
- Ends with urgency or emotional appeal

Return ONLY valid JSON: { "pitch": "...", "headline": "short catchy headline" }`;
        break;

      case "funder_message":
        userPrompt = `${questContext}

Write a personalized outreach message (100-150 words) to a potential funder/supporter. The message should:
- Be warm and professional
- Briefly explain the quest
- Explain why their support matters
- Include a specific ask
- Be suitable for direct message or email

Return ONLY valid JSON: { "subject": "email subject line", "message": "...", "closing": "sign-off line" }`;
        break;

      case "suggest_goal":
        userPrompt = `${questContext}

Based on the quest scope and description, suggest a realistic Credit funding goal. Consider:
- Complexity and duration of the quest
- Number of potential collaborators needed
- Resources required
- Platform credit economy (1 Credit ≈ €${CREDIT_TO_EUR})

Return ONLY valid JSON: { "suggested_credits": <number>, "reasoning": "why this amount", "breakdown": [{"item": "...", "credits": <number>}], "stretch_goal_credits": <number> }`;
        break;

      case "convert":
        userPrompt = `${questContext}

Provide a clear conversion breakdown between Credits and fiat (EUR) for this quest:
- 1 Credit ≈ €${CREDIT_TO_EUR}
- Current credit budget: ${quest.credit_budget || 0} Credits
- Current funding goal: ${quest.funding_goal_credits || 0} Credits
- Current fiat price: ${quest.price_fiat || 0} cents

Return ONLY valid JSON: { "credit_budget_eur": <number>, "funding_goal_eur": <number>, "fiat_price_credits": <number>, "summary": "human-readable conversion summary", "tip": "advice on pricing strategy" }`;
        break;

      case "social_summary":
        userPrompt = `${questContext}

Create social media content for sharing this quest:
1. A Twitter/X post (max 280 chars, include relevant hashtags)
2. A LinkedIn post (2-3 paragraphs, professional tone)
3. A short pitch (1-2 sentences for messaging apps)

Return ONLY valid JSON: { "twitter": "...", "linkedin": "...", "short_pitch": "..." }`;
        break;

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "";

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = match ? JSON.parse(match[0]) : null;
      if (parsed) {
        return new Response(JSON.stringify({ action, result: parsed }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch { /* fallthrough */ }

    return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fundraising-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
