import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Check, Save, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useSpokenLanguages, AVAILABLE_LANGUAGES } from "@/hooks/useSpokenLanguages";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function LanguageSettingsTab() {
  const { t, i18n } = useTranslation();
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  const { spokenCodes, isLoading, saveSpokenLanguages, isSaving } = useSpokenLanguages();
  const [localCodes, setLocalCodes] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Initialize from DB
  useEffect(() => {
    if (!isLoading && spokenCodes.length > 0 && !initialized) {
      setLocalCodes(spokenCodes);
      setInitialized(true);
    } else if (!isLoading && spokenCodes.length === 0 && !initialized) {
      // Default to current language
      setLocalCodes([i18n.language || "en"]);
      setInitialized(true);
    }
  }, [isLoading, spokenCodes, initialized, i18n.language]);

  const toggleLang = (code: string) => {
    setLocalCodes((p) =>
      p.includes(code) ? p.filter((c) => c !== code) : [...p, code]
    );
  };

  const handleSave = async () => {
    if (localCodes.length === 0) {
      toast({ title: "Select at least one language", variant: "destructive" });
      return;
    }
    // Ensure preferred language is in the set
    if (!localCodes.includes(i18n.language)) {
      setLocalCodes((p) => [i18n.language, ...p]);
    }
    await saveSpokenLanguages(localCodes);
    toast({ title: "Spoken languages saved!" });
  };

  const handleChangePreferred = async (code: string) => {
    i18n.changeLanguage(code);
    // Auto-add to spoken if not present
    if (!localCodes.includes(code)) {
      setLocalCodes((p) => [code, ...p]);
    }
    if (authUser?.id) {
      await supabase
        .from("profiles")
        .update({ preferred_language: code } as any)
        .eq("user_id", authUser.id);
      toast({ title: t("language." + code) });
    }
  };

  return (
    <div className="space-y-6">
      <Section title={t("settings.preferredLanguage")} icon={<Globe className="h-5 w-5" />}>
        <p className="text-sm text-muted-foreground mb-4">{t("settings.languageDescription")}</p>
        <Select value={i18n.language} onValueChange={handleChangePreferred}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_LANGUAGES.map((lang) => (
              <SelectItem key={lang.code} value={lang.code}>
                {lang.flag} {lang.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Separator />

      <Section title="Spoken Languages" icon={<Languages className="h-5 w-5" />}>
        <p className="text-sm text-muted-foreground mb-4">
          These are the languages you speak and feel comfortable collaborating in.
          They influence which translations and AI answers you see by default.
        </p>

        <div className="space-y-2 max-w-md">
          {AVAILABLE_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => toggleLang(lang.code)}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
                localCodes.includes(lang.code)
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/30"
              )}
            >
              <span className="text-lg">{lang.flag}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{lang.label}</p>
                <p className="text-xs text-muted-foreground">{lang.native}</p>
              </div>
              {localCodes.includes(lang.code) && <Check className="h-4 w-4 text-primary shrink-0" />}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-3">
          {localCodes.length} selected · Your preferred language must be included.
        </p>

        <Button onClick={handleSave} disabled={isSaving || localCodes.length === 0} className="mt-4">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save spoken languages
        </Button>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-lg font-semibold flex items-center gap-2 mb-3">{icon}{title}</h3>
      {children}
    </div>
  );
}
