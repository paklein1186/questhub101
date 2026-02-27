import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Import Web Crypto helpers */
function base64UrlEncode(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function textToUint8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Strip PEM headers and decode base64 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const lines = pem
    .replace(/-----BEGIN [\w\s]+-----/, "")
    .replace(/-----END [\w\s]+-----/, "")
    .replace(/\s/g, "");
  const binary = atob(lines);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

async function createJaaSJwt(
  appId: string,
  privateKeyPem: string,
  roomName: string,
  userName: string,
  userEmail: string,
  avatarUrl?: string,
  isModerator = false
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: appId + "/default",
  };

  const payload = {
    iss: "chat",
    aud: "jitsi",
    sub: appId,
    room: roomName,
    exp: now + 3600, // 1 hour
    nbf: now - 10,
    iat: now,
    context: {
      user: {
        moderator: isModerator ? "true" : "false",
        name: userName,
        email: userEmail,
        avatar: avatarUrl || "",
        id: userEmail,
      },
      features: {
        livestreaming: "false",
        "outbound-call": "false",
        "sip-outbound-call": "false",
        transcription: "false",
        recording: "false",
      },
    },
  };

  const encodedHeader = base64UrlEncode(textToUint8(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(textToUint8(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const keyData = pemToArrayBuffer(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    textToUint8(signingInput)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  return `${signingInput}.${encodedSignature}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) || "";

    const { roomName } = await req.json();
    if (!roomName || typeof roomName !== "string") {
      return new Response(JSON.stringify({ error: "roomName required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile for display name and avatar
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", userId)
      .single();

    const appId = Deno.env.get("JAAS_APP_ID");
    const privateKey = Deno.env.get("JAAS_PRIVATE_KEY");
    if (!appId || !privateKey) {
      return new Response(JSON.stringify({ error: "JaaS not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jwt = await createJaaSJwt(
      appId,
      privateKey,
      roomName,
      profile?.name || "Participant",
      userEmail,
      profile?.avatar_url || undefined,
      true // all authenticated platform users are moderators in their rooms
    );

    return new Response(JSON.stringify({ jwt, appId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("jaas-token error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
