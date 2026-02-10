import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Stub: Bookings are currently stored as mock data.
// When a bookings table is added to the DB, this function will cancel
// PENDING_PAYMENT bookings older than 30 minutes.

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // TODO: Uncomment when bookings table exists in DB
    // const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    // const { data, error } = await supabase
    //   .from("bookings")
    //   .update({ status: "CANCELLED" })
    //   .eq("status", "PENDING_PAYMENT")
    //   .lt("created_at", cutoff);

    console.log("Booking cleanup ran (stub) at", new Date().toISOString());
    return new Response(JSON.stringify({ success: true, stub: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Booking cleanup failed:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
