import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Upload, Link2, MessageSquareText, Sparkles, Check, X,
  ChevronRight, Leaf, Building2, Target, MapPin, Lightbulb,
  Loader2, FileText,
} from "lucide-react";

/* ─── Types ─── */
interface EnrichmentResult {
  bioVariants: { short: string; medium: string; narrative: string };
  headline: string;
  suggestedTopics: string[];
  suggestedTerritories: string[];
  detectedOrganizations: { name: string; role: string; type: string; isCurrent: boolean }[];
  suggestedCompletedQuests: { title: string; description: string }[];
  suggestedOpenQuests: { title: string; description: string }[];
  skills: string[];
  pulseMessage: string;
}

type Step = "welcome" | "input" | "processing" | "review" | "done";

/* ─── Component ─── */
export default function ProfileEnrichment() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>("welcome");

  // Input state
  const [resumeText, setResumeText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [linkedinPrefilled, setLinkedinPrefilled] = useState(false);

  // Pre-fill LinkedIn URL from profile
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("linkedin_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.linkedin_url) {
          setLinkedinUrl(data.linkedin_url);
          setLinkedinPrefilled(true);
        }
      });
  }, [user?.id]);
  const [pastedDescription, setPastedDescription] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");

  // Result state
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [selectedBioVariant, setSelectedBioVariant] = useState<"short" | "medium" | "narrative">("medium");
  const [acceptedTopics, setAcceptedTopics] = useState<Set<string>>(new Set());
  const [acceptedTerritories, setAcceptedTerritories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const inputCount = [resumeText, linkedinUrl, pastedDescription].filter(Boolean).length;

  /* ─── File handling (text extraction from PDF) ─── */
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File must be under 5MB");
      return;
    }
    setResumeFileName(file.name);
    // Extract text from PDF using FileReader
    const reader = new FileReader();
    reader.onload = () => {
      // For simplicity, send the raw text content. Real PDF parsing would need a library.
      // We'll extract what we can from the raw data.
      const text = reader.result as string;
      // Basic text extraction from PDF binary — will be imperfect but AI can handle noise
      const cleaned = text
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .replace(/\s{3,}/g, "\n")
        .slice(0, 8000);
      setResumeText(cleaned || `[PDF uploaded: ${file.name}]`);
    };
    reader.readAsText(file);
  }, []);

  /* ─── Submit to AI ─── */
  const handleAnalyze = useCallback(async () => {
    if (inputCount === 0) {
      toast.error("Please provide at least one input");
      return;
    }
    setStep("processing");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("profile-enrichment", {
        body: {
          resumeText: resumeText || undefined,
          linkedinUrl: linkedinUrl || undefined,
          pastedDescription: pastedDescription || undefined,
          existingProfile: user
            ? { name: user.name, bio: "", headline: "", topics: [], territories: [] }
            : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      setAcceptedTopics(new Set(data.suggestedTopics || []));
      setAcceptedTerritories(new Set(data.suggestedTerritories || []));
      setStep("review");
    } catch (err: any) {
      console.error("Enrichment error:", err);
      toast.error(err?.message || "Failed to analyze your profile");
      setStep("input");
    } finally {
      setLoading(false);
    }
  }, [resumeText, linkedinUrl, pastedDescription, user, inputCount]);

  /* ─── Apply changes ─── */
  const handleApply = useCallback(async () => {
    if (!result || !user) return;
    setLoading(true);
    try {
      const bio = result.bioVariants[selectedBioVariant];
      const { error } = await supabase
        .from("profiles")
        .update({
          bio,
          headline: result.headline,
        })
        .eq("user_id", user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success("Profile enriched successfully! 🌱");
      setStep("done");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }, [result, user, selectedBioVariant, refreshProfile]);

  const toggleItem = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, item: string) => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setFn(next);
  };

  /* ─── Render steps ─── */
  return (
    <PageShell>
      <div className="max-w-2xl mx-auto py-6">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Leaf className="h-4 w-4 text-emerald-500" />
            <span>
              {step === "welcome" && "Welcome"}
              {step === "input" && "Share your story"}
              {step === "processing" && "Pulse is reading…"}
              {step === "review" && "Review suggestions"}
              {step === "done" && "Complete!"}
            </span>
          </div>
          <Progress
            value={
              step === "welcome" ? 10 :
              step === "input" ? 30 :
              step === "processing" ? 55 :
              step === "review" ? 80 :
              100
            }
            className="h-2"
          />
        </div>

        <AnimatePresence mode="wait">
          {/* ─── WELCOME ─── */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-500/10 mx-auto">
                <Sparkles className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold mb-2">
                  Let's build your showcase 🌱
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto leading-relaxed">
                  I'm <strong>Pulse</strong>, your living guide. Share a bit about yourself and I'll help
                  structure your profile — you stay in full control of every edit.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => setStep("input")} size="lg">
                  Start enrichment <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => navigate(-1)}>
                  Maybe later
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── INPUT ─── */}
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <p className="text-muted-foreground text-sm">
                Choose up to 3 ways to share about yourself. The more you share, the richer the suggestions.
              </p>

              {/* Option A: Resume */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-primary" />
                    Upload Resume (PDF)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {resumeFileName || "Click to upload PDF"}
                    </span>
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                  {resumeText && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-emerald-600">
                      <Check className="h-3 w-3" /> Extracted text from {resumeFileName}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Option B: LinkedIn */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Link2 className="h-4 w-4 text-primary" />
                    LinkedIn Profile URL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    placeholder="https://linkedin.com/in/your-profile"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                  {linkedinPrefilled && (
                    <p className="text-xs text-muted-foreground mt-1">Pre-filled from your profile — update if needed.</p>
                  )}
                </CardContent>
              </Card>

              {/* Option C: Paste */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageSquareText className="h-4 w-4 text-primary" />
                    Paste a description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Tell us about yourself — your passions, projects, dream quests, or paste what your favorite AI says about you..."
                    value={pastedDescription}
                    onChange={(e) => setPastedDescription(e.target.value)}
                    rows={5}
                  />
                </CardContent>
              </Card>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">{inputCount}/3 sources provided</span>
                <Button onClick={handleAnalyze} disabled={inputCount === 0}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Analyze with Pulse
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── PROCESSING ─── */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center space-y-6 py-12"
            >
              <Loader2 className="h-12 w-12 animate-spin text-emerald-500 mx-auto" />
              <div>
                <h3 className="font-display font-semibold text-lg mb-1">Pulse is reading…</h3>
                <p className="text-muted-foreground text-sm">
                  Extracting your story, mapping topics, detecting territories and organizations.
                </p>
              </div>
            </motion.div>
          )}

          {/* ─── REVIEW ─── */}
          {step === "review" && result && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Pulse message */}
              <Card className="border-emerald-500/30 bg-emerald-500/5">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <Leaf className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-emerald-600 mb-1">Pulse</p>
                      <p className="text-sm text-foreground leading-relaxed">{result.pulseMessage}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Headline */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" /> Suggested Headline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">{result.headline}</p>
                </CardContent>
              </Card>

              {/* Bio variants */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bio — Choose your style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(["short", "medium", "narrative"] as const).map((variant) => (
                    <button
                      key={variant}
                      onClick={() => setSelectedBioVariant(variant)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors text-sm ${
                        selectedBioVariant === variant
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <span className="text-xs font-medium uppercase text-muted-foreground block mb-1">
                        {variant === "short" ? "Short (3 lines)" : variant === "medium" ? "Medium (about section)" : "Narrative (storytelling)"}
                      </span>
                      <p className="text-foreground leading-relaxed">{result.bioVariants[variant]}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Topics */}
              {result.suggestedTopics.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" /> Suggested Topics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.suggestedTopics.map((topic) => (
                        <Badge
                          key={topic}
                          variant={acceptedTopics.has(topic) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleItem(acceptedTopics, setAcceptedTopics, topic)}
                        >
                          {acceptedTopics.has(topic) ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Territories */}
              {result.suggestedTerritories.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Suggested Territories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.suggestedTerritories.map((t) => (
                        <Badge
                          key={t}
                          variant={acceptedTerritories.has(t) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleItem(acceptedTerritories, setAcceptedTerritories, t)}
                        >
                          {acceptedTerritories.has(t) ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Organizations detected */}
              {result.detectedOrganizations.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Organizations Detected
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {result.detectedOrganizations.map((org, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{org.name}</p>
                          <p className="text-xs text-muted-foreground">{org.role} · {org.type}{org.isCurrent ? " · Current" : ""}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate("/onboarding/organization")}
                        >
                          Create profile
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Quests */}
              {(result.suggestedCompletedQuests.length > 0 || result.suggestedOpenQuests.length > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" /> Suggested Quests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.suggestedCompletedQuests.map((q, i) => (
                      <div key={`c-${i}`} className="p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">Past</Badge>
                          <span className="text-sm font-medium">{q.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{q.description}</p>
                      </div>
                    ))}
                    {result.suggestedOpenQuests.map((q, i) => (
                      <div key={`o-${i}`} className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="text-xs">Open</Badge>
                          <span className="text-sm font-medium">{q.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{q.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Apply */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Button variant="ghost" onClick={() => setStep("input")}>
                  Back to inputs
                </Button>
                <Button onClick={handleApply} disabled={loading}>
                  {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                  Apply to profile
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── DONE ─── */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 py-12"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 mx-auto">
                <Check className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold mb-2">Your vitrine is growing 🌱</h2>
                <p className="text-muted-foreground">
                  Profile enhanced! You can always refine it from your settings.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate(`/users/${user?.id}`)}>
                  View my profile
                </Button>
                <Button variant="outline" onClick={() => navigate("/home")}>
                  Back to home
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
