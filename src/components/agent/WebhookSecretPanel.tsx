import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { KeyRound, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

function generateSecret(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return "whsec_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Owner-only: set your own webhook secret or regenerate one (shown once). */
export function WebhookSecretPanel({ agentId }: { agentId: string }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [custom, setCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: isSet } = useQuery({
    queryKey: ["agent-secret-set", agentId],
    queryFn: async () => {
      const { data } = await supabase.from("agent_secrets" as any).select("webhook_secret").eq("agent_id", agentId).maybeSingle();
      return !!(data as any)?.webhook_secret;
    },
  });

  const save = async (value: string, showIt: boolean) => {
    setSaving(true);
    const { error } = await supabase.from("agent_secrets" as any).upsert({ agent_id: agentId, webhook_secret: value } as any, { onConflict: "agent_id" });
    setSaving(false);
    if (error) { toast.error(t("agentForm.secretSaveFailed")); return; }
    qc.invalidateQueries({ queryKey: ["agent-secret-set", agentId] });
    setCustom("");
    if (showIt) setRevealed(value); else toast.success(t("agentForm.secretSaved"));
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> {t("agentForm.secretPanelTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {isSet ? t("agentForm.secretIsSet") : t("agentForm.secretIsNotSet")}
          </p>
          <div className="flex gap-2">
            <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder={t("agentForm.secretFieldPlaceholder")} className="font-mono text-xs" autoComplete="off" />
            <Button variant="outline" disabled={saving || custom.trim().length < 16} onClick={() => save(custom.trim(), false)}>{t("agentForm.secretUseMine")}</Button>
          </div>
          <Button variant="secondary" size="sm" disabled={saving} onClick={() => save(generateSecret(), true)}>{t("agentForm.secretRegenerate")}</Button>
        </CardContent>
      </Card>

      <Dialog open={!!revealed} onOpenChange={(v) => { if (!v) { setRevealed(null); setCopied(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("agentForm.secretTitle")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("agentForm.secretIntro")}</p>
          <div className="flex gap-2">
            <Input readOnly value={revealed ?? ""} className="font-mono text-xs" onClick={(e) => (e.target as HTMLInputElement).select()} />
            <Button variant="secondary" size="icon" onClick={() => { navigator.clipboard.writeText(revealed ?? ""); setCopied(true); }}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
