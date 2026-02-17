import { PageShell } from "@/components/PageShell";
import { useTranslation } from "react-i18next";

export default function ManifestoPage() {
  const { t } = useTranslation();
  return (
    <PageShell>
      <div className="max-w-2xl mx-auto py-12 sm:py-20 px-4">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">
          {t("pages.manifesto.title")}
        </h1>
        <p className="text-muted-foreground text-lg mb-12">
          {t("pages.manifesto.subtitle")}
        </p>

        <div className="space-y-4 text-base sm:text-lg leading-relaxed text-foreground/90">
          <p>We believe people can create extraordinary things when they are seen, supported and connected.</p>
          <p>We believe communities are wiser than institutions.</p>
          <p>We believe creativity and impact are not separate.</p>
          <p>We believe territories are alive and deserve to be understood.</p>
          <p>We believe collaboration is a form of beauty.</p>
          <p>We believe technology should amplify the human, not replace it.</p>
          <p>We believe ownership should be shared.</p>
          <p>We believe the future is built one quest at a time.</p>

          <div className="pt-6">
            <p>changethegame exists so people can:</p>
            <ul className="list-disc list-inside space-y-1 pl-1 mt-2">
              <li>create without permission,</li>
              <li>act with others,</li>
              <li>learn from each other,</li>
              <li>and transform the places they live in.</li>
            </ul>
          </div>

          <div className="pt-6 space-y-4">
            <p>This is our movement, our coop-like venture, our little rebellion.</p>
            <p>We're not here to take attention.</p>
            <p>We're here to give people <em>their power back</em>.</p>
          </div>

          <div className="pt-6 space-y-1">
            <p>Let's change the game.</p>
            <p>Together.</p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
