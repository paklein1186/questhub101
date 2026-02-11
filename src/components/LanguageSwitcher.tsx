import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

export function LanguageSwitcher({ variant = "icon" }: { variant?: "icon" | "full" }) {
  const { i18n } = useTranslation();
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const switchLanguage = async (code: string) => {
    i18n.changeLanguage(code);
    // Persist to DB if logged in
    if (session?.user?.id) {
      setSaving(true);
      await supabase
        .from("profiles")
        .update({ preferred_language: code } as any)
        .eq("user_id", session.user.id);
      setSaving(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button variant="ghost" size="sm" className="px-2 text-muted-foreground hover:text-foreground">
            <Globe className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <span>{current.flag}</span>
            <span className="text-sm">{current.label}</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLanguage(lang.code)}
            className={`gap-2 cursor-pointer ${lang.code === current.code ? "bg-primary/10 font-medium" : ""}`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
