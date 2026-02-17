import { useState } from "react";
import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export default function ContactPage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thank you! We'll get back to you shortly.");
    setName(""); setEmail(""); setType(""); setMessage("");
  };

  return (
    <ContentPageShell title={t("pages.contact.title")} subtitle={t("pages.contact.subtitle")}>
      <ContentSection title="Reach Out">
        <p>Have a question, request or issue? We respond to all messages.</p>
      </ContentSection>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue placeholder="Type of request (optional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bug">Bug report</SelectItem>
            <SelectItem value="feedback">Feedback</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="partnership">Partnership</SelectItem>
          </SelectContent>
        </Select>
        <Textarea placeholder="Your message…" value={message} onChange={e => setMessage(e.target.value)} required rows={5} />
        <Button type="submit">Send message</Button>
      </form>

      <ContentSection title="Other Channels">
        <p>Email: <a href="mailto:hello@changethegame.xyz" className="text-primary hover:underline">hello@changethegame.xyz</a></p>
      </ContentSection>
    </ContentPageShell>
  );
}
