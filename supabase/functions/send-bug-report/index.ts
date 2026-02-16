import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, page, userEmail, screenshot } = await req.json();

    if (!description || typeof description !== "string" || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Description is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const attachments: Array<{ filename: string; content: string }> = [];
    if (screenshot) {
      // screenshot is a data URL like "data:image/png;base64,..."
      const base64 = screenshot.split(",")[1];
      if (base64) {
        attachments.push({ filename: "screenshot.png", content: base64 });
      }
    }

    const htmlBody = `
      <h2>🐛 Bug Report</h2>
      <p><strong>Description:</strong></p>
      <p>${description.replace(/\n/g, "<br/>")}</p>
      <hr/>
      <p><strong>Page:</strong> ${page || "N/A"}</p>
      <p><strong>Reported by:</strong> ${userEmail || "Anonymous"}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      ${screenshot ? "<p><em>Screenshot attached</em></p>" : ""}
    `;

    const payload: Record<string, unknown> = {
      from: "changethegame <noreply@changethegame.xyz>",
      to: ["pa@changethegame.xyz"],
      subject: `🐛 Bug Report — ${description.slice(0, 60)}`,
      html: htmlBody,
    };

    if (attachments.length > 0) {
      payload.attachments = attachments;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
