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

/** Strip PEM headers and decode base64, or handle raw base64 */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  // Env vars often store \n as literal two-char sequence; restore real newlines
  const normalised = pem.replace(/\\n/g, "\n").trim();
  // Strip PEM headers if present
  let b64 = normalised
    .replace(/-----BEGIN [\w\s]+-----/g, "")
    .replace(/-----END [\w\s]+-----/g, "")
    .replace(/\s/g, "");
  // If still empty after stripping, the input was already raw base64
  if (!b64) b64 = normalised.replace(/\s/g, "");
  const binary = atob(b64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

function normalizeAppId(raw: string): string {
  return raw
    .replace(/^https?:\/\/8x8\.vc\//i, "")
    .replace(/\/+$/, "")
    .trim();
}

function normalizeRoomName(appId: string, raw: string): string {
  const safeAppId = normalizeAppId(appId);
  const trimmed = raw.trim();
  const withoutUrl = trimmed.replace(/^https?:\/\/(?:meet\.jit\.si|8x8\.vc)\//i, "");
  if (withoutUrl.startsWith(`${safeAppId}/`)) {
    return withoutUrl.slice(safeAppId.length + 1);
  }
  const parts = withoutUrl.split("/").filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : (parts[0] ?? "");
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

  const keyId = Deno.env.get("JAAS_KEY_ID")?.trim() || "default";
  const safeAppId = normalizeAppId(appId);

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: `${safeAppId}/${keyId}`,
  };

  const payload = {
    iss: "chat",
    aud: "jitsi",
    sub: safeAppId,
    room: "*",
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

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email || "";

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
      console.error("JaaS not configured. appId:", !!appId, "privateKey:", !!privateKey);
      return new Response(JSON.stringify({ error: "JaaS not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Debug: log key format info (NOT the key itself)
    const keyNorm = privateKey.replace(/\\n/g, "\n");
    console.log("Key starts with:", keyNorm.substring(0, 40));
    console.log("Key length:", keyNorm.length);
    console.log("Contains BEGIN:", keyNorm.includes("-----BEGIN"));

    const normalizedRoomName = normalizeRoomName(appId, roomName);
    if (!normalizedRoomName) {
      return new Response(JSON.stringify({ error: "Invalid roomName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeAppId = normalizeAppId(appId);
    const keyId = Deno.env.get("JAAS_KEY_ID")?.trim() || "default";
    console.log("AppID:", safeAppId);
    console.log("KeyID:", keyId);
    console.log("kid:", `${safeAppId}/${keyId}`);
    console.log("Room name (normalized):", normalizedRoomName);
    console.log("Room in JWT: *");

    const jwt = await createJaaSJwt(
      safeAppId,
      privateKey,
      normalizedRoomName,
      profile?.name || "Participant",
      userEmail,
      profile?.avatar_url || undefined,
      true // all authenticated platform users are moderators in their rooms
    );

    const roomPath = `${safeAppId}/${normalizedRoomName}`;
    console.log("Returned roomPath:", roomPath);

    return new Response(JSON.stringify({ jwt, appId: safeAppId, roomName: normalizedRoomName, roomPath }), {
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
