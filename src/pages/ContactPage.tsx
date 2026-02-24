import { useState } from "react";
import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ContactPage({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(t("contactPage.successToast"));
    setName(""); setEmail(""); setType(""); setMessage("");
  };

  return (
    <ContentPageShell embedded={embedded} title={t("pages.contact.title")} subtitle={t("pages.contact.subtitle")}>
      <ContentSection title={t("contactPage.reachOut")}>
        <p>{t("contactPage.reachOutP")}</p>
      </ContentSection>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <Input placeholder={t("contactPage.namePlaceholder")} value={name} onChange={e => setName(e.target.value)} required />
        <Input type="email" placeholder={t("contactPage.emailPlaceholder")} value={email} onChange={e => setEmail(e.target.value)} required />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue placeholder={t("contactPage.typePlaceholder")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bug">{t("contactPage.typeBug")}</SelectItem>
            <SelectItem value="feedback">{t("contactPage.typeFeedback")}</SelectItem>
            <SelectItem value="support">{t("contactPage.typeSupport")}</SelectItem>
            <SelectItem value="partnership">{t("contactPage.typePartnership")}</SelectItem>
          </SelectContent>
        </Select>
        <Textarea placeholder={t("contactPage.messagePlaceholder")} value={message} onChange={e => setMessage(e.target.value)} required rows={5} />
        <Button type="submit">{t("contactPage.sendMessage")}</Button>
      </form>

      <ContentSection title={t("contactPage.otherChannels")}>
        <p>Email: <a href="mailto:hello@changethegame.xyz" className="text-primary hover:underline">hello@changethegame.xyz</a></p>
      </ContentSection>
    </ContentPageShell>
  );
}
