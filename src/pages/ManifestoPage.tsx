import { PageShell } from "@/components/PageShell";
import { useTranslation } from "react-i18next";

export default function ManifestoPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const content = (
    <div className={embedded ? "max-w-2xl mx-auto px-4" : "max-w-2xl mx-auto py-12 sm:py-20 px-4"}>
      <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
        {t("pages.manifesto.title")}
      </h1>
        <p className="text-muted-foreground text-lg mb-12">
          {t("pages.manifesto.subtitle")}
        </p>

        <div className="space-y-4 text-base sm:text-lg leading-relaxed text-foreground/90">
          <p>{t("manifestoPage.believe1")}</p>
          <p>{t("manifestoPage.believe2")}</p>
          <p>{t("manifestoPage.believe3")}</p>
          <p>{t("manifestoPage.believe4")}</p>
          <p>{t("manifestoPage.believe5")}</p>
          <p>{t("manifestoPage.believe6")}</p>
          <p>{t("manifestoPage.believe7")}</p>
          <p>{t("manifestoPage.believe8")}</p>

          <div className="pt-6">
            <p>{t("manifestoPage.existsSo")}</p>
            <ul className="list-disc list-inside space-y-1 pl-1 mt-2">
              <li>{t("manifestoPage.can1")}</li>
              <li>{t("manifestoPage.can2")}</li>
              <li>{t("manifestoPage.can3")}</li>
              <li>{t("manifestoPage.can4")}</li>
            </ul>
          </div>

          <div className="pt-6 space-y-4">
            <p>{t("manifestoPage.movement")}</p>
            <p>{t("manifestoPage.notAttention")}</p>
            <p dangerouslySetInnerHTML={{ __html: t("manifestoPage.powerBack") }} />
          </div>

          <div className="pt-6 space-y-1">
            <p>{t("manifestoPage.letsChange")}</p>
            <p>{t("manifestoPage.together")}</p>
          </div>
        </div>
      </div>
  );
  if (embedded) return content;
  return <PageShell>{content}</PageShell>;
}
