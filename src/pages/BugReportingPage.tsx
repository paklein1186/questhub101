import { useState } from "react";
import { ContentPageShell, ContentSection } from "@/components/ContentPageShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function BugReportingPage() {
  const [title, setTitle] = useState("");
  const [steps, setSteps] = useState("");
  const [device, setDevice] = useState("");
  const [link, setLink] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Bug report submitted. Thank you!");
    setTitle(""); setSteps(""); setDevice(""); setLink("");
  };

  return (
    <ContentPageShell title="Bug Reporting" subtitle="Help us improve changethegame.">
      <ContentSection title="Report a Bug">
        <p>If something is broken, confusing or incomplete, we want to know. This platform evolves with your feedback.</p>
      </ContentSection>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <Input placeholder="Bug title" value={title} onChange={e => setTitle(e.target.value)} required />
        <Textarea placeholder="Steps to reproduce…" value={steps} onChange={e => setSteps(e.target.value)} required rows={4} />
        <Input placeholder="Device / Browser" value={device} onChange={e => setDevice(e.target.value)} />
        <Input placeholder="Link to impacted page (optional)" value={link} onChange={e => setLink(e.target.value)} />
        <Button type="submit">Submit bug report</Button>
      </form>
    </ContentPageShell>
  );
}
