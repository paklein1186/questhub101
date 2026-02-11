import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function WhatComesNextPage() {
  const { user } = useAuth();
  const { persona } = usePersona();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await supabase.from("feature_suggestions").insert({
        user_id: user?.id ?? null,
        original_text: text.trim(),
        source: "OTHER",
        persona_at_time: persona !== "UNSET" ? persona.toLowerCase() : null,
        status: "NEW",
        user_explicit: true,
      } as any);
      toast.success("Thank you — your idea has been planted.");
      setText("");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto py-12 sm:py-20 px-4">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
          What Comes Next
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          A quiet place to see what is emerging — and contribute to it.
        </p>

        <div className="space-y-4 text-base sm:text-lg leading-relaxed text-foreground/90">
          <p>Here are upcoming pieces we're weaving:</p>

          <ul className="list-disc list-inside space-y-1 pl-1 pt-2">
            <li>AI-led collective onboarding</li>
            <li>Territory memory expansion</li>
            <li>XP + Credits evolution</li>
            <li>Pods with expiration time</li>
            <li>Multi-creator quests</li>
            <li>Partnered guild ecosystems</li>
            <li>More expressive creative tools</li>
            <li>Deep cross-territory analytics</li>
            <li>Multi-language contextual translation</li>
            <li>Cooperative governance directly in the UI</li>
          </ul>

          <div className="pt-10 space-y-2">
            <p>Have an idea, a wild thought, a frustration, or a wish?</p>
            <p>
              Tell us.<br />
              We listen.
            </p>
          </div>
        </div>

        {/* Suggestion form */}
        <div className="mt-12 space-y-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share an idea, a wish, or a frustration…"
            className="min-h-[120px] border-border/40 bg-transparent resize-none text-base"
          />
          <Button
            onClick={handleSubmit}
            disabled={sending || !text.trim()}
            variant="outline"
            size="sm"
          >
            {sending ? "Sending…" : "Send to the builders"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
