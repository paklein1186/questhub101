import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, Plus, MapPin, Hash, Settings, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PageShell } from "@/components/PageShell";
import { ImageUpload } from "@/components/ImageUpload";
import { SocialLinksEdit, normalizeUrl } from "@/components/SocialLinks";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { CompanySize } from "@/types/enums";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function MyCompanies({ bare }: { bare?: boolean }) {
  const currentUser = useCurrentUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const rerender = () => forceUpdate((n) => n + 1);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [size, setSize] = useState<CompanySize>(CompanySize.SME);
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [bannerUrl, setBannerUrl] = useState<string | undefined>();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");

  const myCompanies = filterActive(companies).filter(
    (c) => c.contactUserId === currentUser.id
  );

  const handleCreate = () => {
    if (!name.trim()) return;
    const newCompany: Company = {
      id: `co-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      sector: sector.trim() || undefined,
      size,
      logoUrl,
      bannerUrl,
      websiteUrl: normalizeUrl(websiteUrl) ?? undefined,
      twitterUrl: normalizeUrl(twitterUrl) ?? undefined,
      linkedinUrl: normalizeUrl(linkedinUrl) ?? undefined,
      instagramUrl: normalizeUrl(instagramUrl) ?? undefined,
      contactUserId: currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    companies.push(newCompany);
    setCreateOpen(false);
    setName(""); setDescription(""); setSector(""); setSize(CompanySize.SME);
    setLogoUrl(undefined); setBannerUrl(undefined);
    setWebsiteUrl(""); setTwitterUrl(""); setLinkedinUrl(""); setInstagramUrl("");
    rerender();
    toast({ title: "Company created!" });
    navigate(`/companies/${newCompany.id}`);
  };

  return (
    <PageShell bare={bare}>
      {!bare && (
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/network"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Network</Link>
        </Button>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" /> My Companies
        </h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Create Company</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" maxLength={80} />
              </div>
              <ImageUpload label="Logo" currentImageUrl={logoUrl} onChange={setLogoUrl} aspectRatio="1/1" description="Square logo, 256×256 recommended" />
              <ImageUpload label="Banner (optional)" currentImageUrl={bannerUrl} onChange={setBannerUrl} aspectRatio="16/9" description="Wide banner, 1200×400 recommended" />
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this company do?" maxLength={500} className="resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Sector</label>
                  <Input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="e.g. Sustainability" maxLength={50} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Size</label>
                  <Select value={size} onValueChange={(v) => setSize(v as CompanySize)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CompanySize.MICRO}>Micro</SelectItem>
                      <SelectItem value={CompanySize.SME}>SME</SelectItem>
                      <SelectItem value={CompanySize.LARGE}>Large</SelectItem>
                      <SelectItem value={CompanySize.OTHER}>Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SocialLinksEdit
                data={{ websiteUrl, twitterUrl, linkedinUrl, instagramUrl }}
                onChange={(key, value) => {
                  if (key === "websiteUrl") setWebsiteUrl(value);
                  else if (key === "twitterUrl") setTwitterUrl(value);
                  else if (key === "linkedinUrl") setLinkedinUrl(value);
                  else if (key === "instagramUrl") setInstagramUrl(value);
                }}
              />
              <Button onClick={handleCreate} disabled={!name.trim()} className="w-full">Create Company</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {myCompanies.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">You don't manage any companies yet.</p>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Create your first company
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {myCompanies.map((company, i) => {
            const cTopics = getTopicsForCompany(company.id);
            const cTerrs = getTerritoriesForCompany(company.id);
            return (
              <motion.div key={company.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`/companies/${company.id}`} className="block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    {company.logoUrl && <img src={company.logoUrl} alt="" className="h-10 w-10 rounded-lg" />}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{company.name}</h3>
                      {company.sector && <span className="text-xs text-muted-foreground">{company.sector}</span>}
                    </div>
                    <Button size="sm" variant="ghost" asChild onClick={(e) => e.stopPropagation()}>
                      <Link to={`/companies/${company.id}/settings`}><Settings className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                  {company.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{company.description}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {cTopics.map(t => <Badge key={t.id} variant="secondary" className="text-[10px]"><Hash className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                    {cTerrs.map(t => <Badge key={t.id} variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />{t.name}</Badge>)}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
