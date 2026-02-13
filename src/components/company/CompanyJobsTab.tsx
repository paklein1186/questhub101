import { useState, useRef } from "react";
import { Plus, Briefcase, MapPin, FileText, Upload, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useJobPositionsForCompany, useCreateJobPosition, useDeleteJobPosition } from "@/hooks/useJobPositions";
import { useTopics, useTerritories } from "@/hooks/useSupabaseData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const CONTRACT_TYPES = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "freelance", label: "Freelance" },
  { value: "internship", label: "Internship" },
  { value: "volunteer", label: "Volunteer" },
];

const REMOTE_POLICIES = [
  { value: "on-site", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];

interface Props {
  companyId: string;
  isAdmin: boolean;
}

export function CompanyJobsTab({ companyId, isAdmin }: Props) {
  const { data: jobs = [], isLoading } = useJobPositionsForCompany(companyId);
  const { data: allTopics = [] } = useTopics();
  const { data: allTerritories = [] } = useTerritories();
  const createJob = useCreateJobPosition();
  const deleteJob = useDeleteJobPosition();
  const currentUser = useCurrentUser();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contractType, setContractType] = useState("full-time");
  const [remotePolicy, setRemotePolicy] = useState("on-site");
  const [locationText, setLocationText] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTerritories, setSelectedTerritories] = useState<string[]>([]);
  const [docUrl, setDocUrl] = useState<string | undefined>();
  const [docName, setDocName] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle(""); setDescription(""); setContractType("full-time");
    setRemotePolicy("on-site"); setLocationText("");
    setSelectedTopics([]); setSelectedTerritories([]);
    setDocUrl(undefined); setDocName(undefined);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `jobs/${companyId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("entity-images").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: pub } = supabase.storage.from("entity-images").getPublicUrl(path);
    setDocUrl(pub.publicUrl);
    setDocName(file.name);
    setUploading(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      await createJob.mutateAsync({
        company_id: companyId,
        created_by_user_id: currentUser.id,
        title: title.trim(),
        description: description.trim() || undefined,
        contract_type: contractType,
        remote_policy: remotePolicy,
        location_text: locationText.trim() || undefined,
        document_url: docUrl,
        document_name: docName,
        topic_ids: selectedTopics,
        territory_ids: selectedTerritories,
      });
      toast({ title: "Job position created" });
      resetForm();
      setOpen(false);
    } catch {
      toast({ title: "Error creating job", variant: "destructive" });
    }
  };

  const toggleTopic = (id: string) =>
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  const toggleTerritory = (id: string) =>
    setSelectedTerritories(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  return (
    <div className="space-y-4">
      {isAdmin && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Job Position</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add Job Position</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Title *</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Frontend Developer" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000} className="resize-none min-h-[100px]" placeholder="Describe the role…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Contract type</label>
                  <Select value={contractType} onValueChange={setContractType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CONTRACT_TYPES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Remote policy</label>
                  <Select value={remotePolicy} onValueChange={setRemotePolicy}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{REMOTE_POLICIES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input value={locationText} onChange={e => setLocationText(e.target.value)} placeholder="e.g. Paris, France" />
              </div>

              {/* Topics */}
              <div>
                <label className="text-sm font-medium mb-1 block">Topics</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {allTopics.map((t: any) => (
                    <Badge
                      key={t.id}
                      variant={selectedTopics.includes(t.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleTopic(t.id)}
                    >
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Territories */}
              <div>
                <label className="text-sm font-medium mb-1 block">Territories</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {allTerritories.map((t: any) => (
                    <Badge
                      key={t.id}
                      variant={selectedTerritories.includes(t.id) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleTerritory(t.id)}
                    >
                      <MapPin className="h-3 w-3 mr-0.5" />{t.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Document upload */}
              <div>
                <label className="text-sm font-medium mb-1 block">Attachment (PDF, doc…)</label>
                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" className="hidden" onChange={handleFileUpload} />
                {docUrl ? (
                  <div className="flex items-center gap-2 text-sm bg-muted rounded-lg p-2">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate flex-1">{docName}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setDocUrl(undefined); setDocName(undefined); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-1" /> {uploading ? "Uploading…" : "Upload document"}
                  </Button>
                )}
              </div>

              <Button onClick={handleCreate} className="w-full" disabled={!title.trim() || createJob.isPending}>
                {createJob.isPending ? "Creating…" : "Create Job Position"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {jobs.length === 0 && !isLoading && (
        <p className="text-muted-foreground text-sm">No job positions yet.</p>
      )}

      <div className="grid gap-3">
        {jobs.map((job: any) => {
          const topics = (job.job_position_topics ?? []).map((jt: any) => jt.topics).filter(Boolean);
          const territories = (job.job_position_territories ?? []).map((jt: any) => jt.territories).filter(Boolean);
          return (
            <div key={job.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-display font-semibold text-sm">{job.title}</h4>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs capitalize">{job.contract_type}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{job.remote_policy}</Badge>
                    {job.location_text && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />{job.location_text}
                      </span>
                    )}
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => deleteJob.mutate({ id: job.id, companyId })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {job.description && (
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 whitespace-pre-line">{job.description}</p>
              )}

              <div className="flex flex-wrap gap-1">
                {topics.map((t: any) => <Badge key={t.id} variant="outline" className="text-[10px]">{t.name}</Badge>)}
                {territories.map((t: any) => <Badge key={t.id} variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                <span>Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}</span>
                {job.document_url && (
                  <a href={job.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <FileText className="h-3 w-3" /> {job.document_name || "Document"} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
