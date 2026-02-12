import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bot, Send, Loader2, UserPlus, LogIn, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel?: string;
}

type Msg = { role: "user" | "assistant"; content: string };

interface GuestContext {
  persona?: string;
  interests?: string[];
  goals?: string[];
  suggested_role?: string;
}

export function GuestOnboardingAssistant({ open, onOpenChange, actionLabel = "perform this action" }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"chat" | "signup">("chat");
  const [guestContext, setGuestContext] = useState<GuestContext>({});

  // Signup form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [signingUp, setSigningUp] = useState(false);

  const redirectParam = `?redirect=${encodeURIComponent(location.pathname + location.search)}`;

  // Initial greeting on open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          role: "assistant",
          content: `Hey there! 👋 I'd love to help you get started. Before we set you up, I'm curious — what brings you to changethegame today?`,
        },
      ]);
    }
  }, [open]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, phase]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("guest-onboarding-assistant", {
        body: {
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      if (data?.ready_for_signup) {
        const cleanMsg = (data.message || "").replace(/READY_FOR_SIGNUP/g, "").trim();
        setMessages((prev) => [...prev, { role: "assistant", content: cleanMsg || "Great! Let's get you set up with an account." }]);
        if (data.context) setGuestContext(data.context);
        // Short delay then show signup
        setTimeout(() => setPhase("signup"), 1200);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data?.message || "Tell me more!" }]);
      }
    } catch (e: any) {
      console.error("Assistant error:", e);
      toast({ title: "Could not reach assistant", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, toast]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) return;
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSigningUp(true);
    const role = guestContext.suggested_role || "GAMECHANGER";
    const { error } = await signUp(email.trim(), password, name.trim(), role);
    setSigningUp(false);
    if (error) {
      toast({ title: "Signup failed", description: error, variant: "destructive" });
    } else {
      // Store guest context for onboarding wizard
      if (guestContext.persona || guestContext.interests?.length || guestContext.goals?.length) {
        sessionStorage.setItem("guestOnboardingContext", JSON.stringify(guestContext));
      }
      onOpenChange(false);
    }
  };

  const handleSkipToSignup = () => {
    setPhase("signup");
  };

  const handleReset = () => {
    setMessages([]);
    setPhase("chat");
    setGuestContext({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarFallback className="bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-sm">Welcome Assistant</p>
            <p className="text-xs text-muted-foreground truncate">
              {phase === "chat" ? "Let's find the best way for you to get started" : "Create your free account"}
            </p>
          </div>
          {phase === "chat" && (
            <Button variant="ghost" size="sm" onClick={handleSkipToSignup} className="text-xs shrink-0">
              Skip to signup <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {phase === "chat" ? (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col">
              {/* Messages */}
              <ScrollArea className="h-[340px] px-4 py-3" ref={scrollRef}>
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted rounded-bl-md"
                        }`}
                      >
                        <div className="prose prose-sm dark:prose-invert [&>p]:m-0"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                      </div>
                    </motion.div>
                  ))}
                  {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </motion.div>
                  )}
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your answer…"
                    disabled={loading}
                    className="flex-1"
                    autoFocus
                  />
                  <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div key="signup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-5">
              {guestContext.interests?.length ? (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {guestContext.interests.map((t) => (
                    <span key={t} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              ) : null}

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-name" className="text-xs">Full name</Label>
                    <Input id="guest-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-email" className="text-xs">Email</Label>
                    <Input id="guest-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-pw" className="text-xs">Password</Label>
                    <Input id="guest-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} autoComplete="new-password" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="guest-pw2" className="text-xs">Confirm password</Label>
                    <Input id="guest-pw2" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required autoComplete="new-password" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={signingUp}>
                  {signingUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                  Create account
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-4">
                Already have an account?{" "}
                <button onClick={() => { onOpenChange(false); navigate(`/login${redirectParam}`); }} className="text-primary font-medium hover:underline">
                  Log in
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
