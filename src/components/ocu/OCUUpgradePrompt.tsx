import { useTranslation } from "react-i18next";
import { Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OCUUpgradePromptProps {
  onEnable?: () => void;
  canEnable?: boolean;
}

export function OCUUpgradePrompt({ onEnable, canEnable = false }: OCUUpgradePromptProps) {
  const { t } = useTranslation();
  const features = t("ocuUpgradePrompt.features", { returnObjects: true }) as string[];
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
      <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-display font-semibold text-lg">{t("ocuUpgradePrompt.title")}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          {t("ocuUpgradePrompt.description")}
        </p>
      </div>
      <ul className="text-sm text-muted-foreground space-y-1 max-w-sm mx-auto text-left">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-primary shrink-0" /> {feature}</li>
        ))}
      </ul>
      {canEnable && onEnable && (
        <Button onClick={onEnable} className="mt-2">
          <Lock className="h-4 w-4 mr-1" /> {t("ocuUpgradePrompt.enableButton")}
        </Button>
      )}
      {!canEnable && (
        <p className="text-xs text-muted-foreground">{t("ocuUpgradePrompt.adminOnly")}</p>
      )}
    </div>
  );
}
