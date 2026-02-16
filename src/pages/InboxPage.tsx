import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/components/PageShell";
import { useConversations, useConversationMessages, useSendMessage, useCreateConversation, useDeleteMessage, useEditMessage, useAddParticipants } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { useBlock } from "@/hooks/useBlock";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserSearchInput } from "@/components/UserSearchInput";
import { Send, Plus, ArrowLeft, Users, MessageSquare, MoreVertical, Pencil, Trash2, Ban, UserPlus, Check, X, Paperclip, FileText, Image as ImageIcon, Loader2, Sparkles, MapPin, Hash, Briefcase, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const URL_REGEX = /https?:\/\/[^\s<]+/gi;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function sanitizeFileName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderWithLinks(text: string, isOwn: boolean) {
  const parts = text.split(URL_REGEX);
  const urls = text.match(URL_REGEX) || [];
  if (urls.length === 0) return text;
  const result: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    result.push(part);
    if (i < urls.length) {
      result.push(
        <a key={i} href={urls[i]} target="_blank" rel="noopener noreferrer"
          className={cn("underline break-all", isOwn ? "text-primary-foreground/90 hover:text-primary-foreground" : "text-primary hover:text-primary/80")}>
          {urls[i]}
        </a>
      );
    }
  });
  return <>{result}</>;
}

function BlockMenuItem({ targetUserId }: { targetUserId: string }) {
  const { isBlocked, toggle } = useBlock(targetUserId);
  return (
    <DropdownMenuItem onClick={toggle} className="text-destructive focus:text-destructive">
      <Ban className="h-4 w-4 mr-2" />
      {isBlocked ? "Unblock user" : "Block user"}
    </DropdownMenuItem>
  );
}

function isPulseConversation(conv: any): boolean {
  return conv?.sender_entity_type === "pulse_bot";
}

function EnrichmentCards({ data, onAccept }: { data: any; onAccept: (field: string, value: any) => void }) {
  if (!data) return null;
  return (
    <div className="space-y-3 mt-3 mb-2 px-1">
      {data.headline && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold flex items-center gap-1"><Briefcase className="h-3 w-3" /> Suggested Headline</p>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => onAccept("headline", data.headline)}>
              <Check className="h-3 w-3 mr-1" /> Accept
            </Button>
          </div>
          <p className="text-sm">{data.headline}</p>
        </div>
      )}

      {data.bioVariants && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold flex items-center gap-1 mb-2"><Sparkles className="h-3 w-3" /> Bio Suggestions</p>
          {Object.entries(data.bioVariants).map(([key, value]) => (
            <div key={key} className="mb-2 last:mb-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-medium uppercase text-muted-foreground">{key}</span>
                <Button size="sm" variant="outline" className="h-5 text-[10px] px-1.5" onClick={() => onAccept("bio", value)}>
                  Use this
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{value as string}</p>
            </div>
          ))}
        </div>
      )}

      {data.suggestedTopics?.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
          <p className="text-xs font-semibold flex items-center gap-1 mb-2"><Hash className="h-3 w-3" /> Suggested Topics</p>
          <div className="flex flex-wrap gap-1.5">
            {data.suggestedTopics.map((t: string) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {data.suggestedTerritories?.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
          <p className="text-xs font-semibold flex items-center gap-1 mb-2"><MapPin className="h-3 w-3" /> Suggested Territories</p>
          <div className="flex flex-wrap gap-1.5">
            {data.suggestedTerritories.map((t: string) => (
              <Badge key={t} variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-0.5" />{t}</Badge>
            ))}
          </div>
        </div>
      )}

      {data.suggestedQuests?.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-semibold flex items-center gap-1 mb-2"><Sparkles className="h-3 w-3" /> Quest Ideas</p>
          {data.suggestedQuests.map((q: any, i: number) => (
            <div key={i} className="flex items-start justify-between gap-2 mb-2 last:mb-0">
              <div>
                <p className="text-sm font-medium">{q.title}</p>
                <p className="text-xs text-muted-foreground">{q.description}</p>
                <Badge variant="outline" className="text-[10px] mt-1">{q.type === "completed" ? "Past achievement" : "Open project"}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.detectedOrganizations?.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
          <p className="text-xs font-semibold flex items-center gap-1 mb-2"><Building2 className="h-3 w-3" /> Detected Organizations</p>
          {data.detectedOrganizations.map((org: any, i: number) => (
            <div key={i} className="text-xs mb-1.5 last:mb-0">
              <span className="font-medium">{org.name}</span> — {org.role}
              {org.isCurrent && <Badge variant="secondary" className="text-[9px] ml-1.5">Current</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; name: string }[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showAddPeopleDialog, setShowAddPeopleDialog] = useState(false);
  const [newParticipants, setNewParticipants] = useState<{ id: string; name: string }[]>([]);
  const [newGroupTitle, setNewGroupTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [pulseLoading, setPulseLoading] = useState(false);
  const [pulseEnrichment, setPulseEnrichment] = useState<any>(null);

  const { data: conversations = [], isLoading } = useConversations();
  const { data: messages = [] } = useConversationMessages(activeConvId);
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();
  const deleteMessage = useDeleteMessage();
  const editMessage = useEditMessage();
  const addParticipants = useAddParticipants();

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll page to top when opening a conversation (especially on mobile)
  useEffect(() => {
    if (activeConvId) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const [attachment, setAttachment] = useState<{ file: File; preview?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPulseActive = activeConv && isPulseConversation(activeConv);

  const handleSend = async () => {
    if ((!messageText.trim() && !attachment) || !activeConvId || !userId) return;
    const text = messageText.trim();
    const currentAttachment = attachment;
    setMessageText("");
    setAttachment(null);

    let attachmentData: { url: string; name: string; type: string; size: number } | undefined;
    if (currentAttachment) {
      try {
        const safeName = sanitizeFileName(currentAttachment.file.name);
        const path = `${userId}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage.from("dm-attachments").upload(path, currentAttachment.file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from("dm-attachments").getPublicUrl(path);
        attachmentData = { url: urlData.publicUrl, name: currentAttachment.file.name, type: currentAttachment.file.type, size: currentAttachment.file.size };
      } catch (e: any) {
        toast({ title: "Upload failed", description: e?.message, variant: "destructive" });
        return;
      }
    }

    // Save user's message first
    sendMessage.mutate({
      conversationId: activeConvId,
      content: text || (attachmentData ? `[File: ${attachmentData.name}]` : ""),
      ...(attachmentData && {
        attachment_url: attachmentData.url,
        attachment_name: attachmentData.name,
        attachment_type: attachmentData.type,
        attachment_size: attachmentData.size,
      }),
    } as any);

    // If this is a Pulse bot conversation, also call the AI
    if (isPulseActive && text) {
      setPulseLoading(true);
      setPulseEnrichment(null);
      try {
        const { data: botResponse, error: botError } = await supabase.functions.invoke("pulse-bot", {
          body: { message: text, conversationId: activeConvId },
        });
        if (botError) throw botError;
        if (botResponse?.enrichment) {
          setPulseEnrichment(botResponse.enrichment);
        }
        // Refresh messages to show the bot's reply
        qc.invalidateQueries({ queryKey: ["conversation-messages", activeConvId] });
        qc.invalidateQueries({ queryKey: ["conversations", userId] });
      } catch (e: any) {
        console.error("Pulse bot error:", e);
        toast({ title: "Pulse couldn't respond", description: e?.message || "Try again in a moment", variant: "destructive" });
      } finally {
        setPulseLoading(false);
      }
    }
  };

  const handleAcceptEnrichment = useCallback(async (field: string, value: any) => {
    if (!userId) return;
    try {
      if (field === "bio" || field === "headline") {
        await supabase.from("profiles").update({ [field]: value }).eq("user_id", userId);
        toast({ title: `${field === "bio" ? "Bio" : "Headline"} updated!` });
      }
    } catch (e: any) {
      toast({ title: "Failed to update", description: e?.message, variant: "destructive" });
    }
  }, [userId, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File too large", description: "Maximum size is 25 MB.", variant: "destructive" });
      return;
    }
    const preview = IMAGE_TYPES.includes(file.type) ? URL.createObjectURL(file) : undefined;
    setAttachment({ file, preview });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = () => {
    if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
    setAttachment(null);
  };

  const handleNewConversation = async () => {
    if (!selectedUsers.length) return;
    const convId = await createConversation.mutateAsync({
      participantIds: selectedUsers.map((u) => u.id),
      title: selectedUsers.length > 1 ? groupTitle || undefined : undefined,
      isGroup: selectedUsers.length > 1,
    });
    setActiveConvId(convId);
    setShowNewDialog(false);
    setSelectedUsers([]);
    setGroupTitle("");
  };

  const handleEditSave = () => {
    if (!editingMsgId || !editText.trim() || !activeConvId) return;
    editMessage.mutate({ messageId: editingMsgId, content: editText.trim(), conversationId: activeConvId });
    setEditingMsgId(null);
    setEditText("");
  };

  const handleDelete = (msgId: string) => {
    if (!activeConvId) return;
    deleteMessage.mutate({ messageId: msgId, conversationId: activeConvId });
  };

  const handleAddPeople = async () => {
    if (!activeConvId || !newParticipants.length) return;
    const existingIds = activeConv?.participants.map((p) => p.user_id) ?? [];
    const toAdd = newParticipants.filter((p) => !existingIds.includes(p.id));
    if (!toAdd.length) {
      toast({ title: "Users already in conversation" });
      return;
    }
    await addParticipants.mutateAsync({
      conversationId: activeConvId,
      userIds: toAdd.map((p) => p.id),
      makeGroup: !activeConv?.is_group,
      title: !activeConv?.is_group ? newGroupTitle || undefined : undefined,
    });
    setShowAddPeopleDialog(false);
    setNewParticipants([]);
    setNewGroupTitle("");
    toast({ title: "Participants added" });
  };

  const getConversationName = (conv: typeof conversations[0]) => {
    if ((conv as any).sender_label) return (conv as any).sender_label;
    if (conv.title) return conv.title;
    const others = conv.participants.filter((p) => p.user_id !== userId);
    return others.map((p) => p.name).join(", ") || "Conversation";
  };

  const isOfficialConv = (conv: typeof conversations[0]) => !!(conv as any).sender_label;

  const getConversationAvatar = (conv: typeof conversations[0]) => {
    const others = conv.participants.filter((p) => p.user_id !== userId);
    return others[0];
  };

  const showConvList = !isMobile || !activeConvId;
  const showThread = !isMobile || !!activeConvId;

  return (
    <PageShell>
      <div ref={containerRef} className={cn("flex rounded-xl border border-border overflow-hidden bg-card", isMobile ? "h-[calc(100vh-8rem)]" : "h-[calc(100vh-10rem)]")}>
        {/* Conversation list */}
        {showConvList && (
          <div className={cn("flex flex-col border-r border-border", isMobile ? "w-full" : "w-80 shrink-0")}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-lg">Messages</h2>
              <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost"><Plus className="h-5 w-5" /></Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New conversation</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {selectedUsers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map((u) => (
                          <span key={u.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-sm">
                            {u.name}
                            <button onClick={() => setSelectedUsers((prev) => prev.filter((p) => p.id !== u.id))} className="text-muted-foreground hover:text-foreground">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <UserSearchInput
                      onSelect={(user) => {
                        if (!selectedUsers.find((u) => u.id === user.user_id)) {
                          setSelectedUsers((prev) => [...prev, { id: user.user_id, name: user.display_name ?? "User" }]);
                        }
                      }}
                      placeholder="Search users..."
                    />
                    {selectedUsers.length > 1 && (
                      <Input
                        placeholder="Group name (optional)"
                        value={groupTitle}
                        onChange={(e) => setGroupTitle(e.target.value)}
                      />
                    )}
                    <Button onClick={handleNewConversation} disabled={!selectedUsers.length || createConversation.isPending} className="w-full">
                      {createConversation.isPending ? "Creating..." : "Start conversation"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Loading...</div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start one with the + button</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const avatar = getConversationAvatar(conv);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        activeConvId === conv.id && "bg-muted"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={avatar?.avatar_url ?? undefined} />
                          <AvatarFallback>{conv.is_group ? <Users className="h-4 w-4" /> : (avatar?.name?.[0] ?? "?")}</AvatarFallback>
                        </Avatar>
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                            {conv.unread_count > 9 ? "9+" : conv.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={cn("text-sm truncate", conv.unread_count > 0 ? "font-semibold" : "font-medium")}>
                            {isOfficialConv(conv) && <span className="text-primary mr-1">●</span>}
                            {getConversationName(conv)}
                          </p>
                          {conv.last_message && (
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                              {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message.content}</p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </div>
        )}

        {/* Message thread */}
        {showThread && (
          <div className="flex-1 flex flex-col min-w-0">
            {activeConvId ? (
              <>
                {/* Thread header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                  {isMobile && (
                    <Button size="icon" variant="ghost" onClick={() => setActiveConvId(null)}>
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}
                  {(() => {
                    if (!activeConv) return null;
                    const avatar = getConversationAvatar(activeConv);
                    return (
                      <>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={avatar?.avatar_url ?? undefined} />
                          <AvatarFallback>{activeConv.is_group ? <Users className="h-4 w-4" /> : (avatar?.name?.[0] ?? "?")}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{getConversationName(activeConv)}</p>
                          {activeConv.is_group && (
                            <p className="text-[11px] text-muted-foreground">{activeConv.participants.length} members</p>
                          )}
                        </div>
                      </>
                    );
                  })()}

                  {/* Header actions */}
                  <div className="flex items-center gap-1 ml-auto">
                    {/* Add people / convert to group */}
                    <Dialog open={showAddPeopleDialog} onOpenChange={setShowAddPeopleDialog}>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" title="Add people">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{activeConv?.is_group ? "Add people" : "Create group from conversation"}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          {newParticipants.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {newParticipants.map((u) => (
                                <span key={u.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-sm">
                                  {u.name}
                                  <button onClick={() => setNewParticipants((prev) => prev.filter((p) => p.id !== u.id))} className="text-muted-foreground hover:text-foreground">×</button>
                                </span>
                              ))}
                            </div>
                          )}
                          <UserSearchInput
                            onSelect={(user) => {
                              if (!newParticipants.find((u) => u.id === user.user_id)) {
                                setNewParticipants((prev) => [...prev, { id: user.user_id, name: user.display_name ?? "User" }]);
                              }
                            }}
                            placeholder="Search users to add..."
                          />
                          {!activeConv?.is_group && (
                            <Input
                              placeholder="Group name (optional)"
                              value={newGroupTitle}
                              onChange={(e) => setNewGroupTitle(e.target.value)}
                            />
                          )}
                          <Button onClick={handleAddPeople} disabled={!newParticipants.length || addParticipants.isPending} className="w-full">
                            {addParticipants.isPending ? "Adding..." : "Add participants"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Block user (only in 1:1) */}
                    {!activeConv?.is_group && activeConv && (() => {
                      const other = activeConv.participants.find((p) => p.user_id !== userId);
                      if (!other) return null;
                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <BlockMenuItem targetUserId={other.user_id} />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    })()}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isPulseMsg = (msg as any).sender_label === "Pulse 🌱";
                      const isOwn = msg.sender_id === userId && !isPulseMsg;
                      const isEditing = editingMsgId === msg.id;

                      return (
                        <div key={msg.id} className={cn("flex gap-2 group", isOwn ? "justify-end" : "justify-start")}>
                          {!isOwn && (
                            <Avatar className={cn("h-7 w-7 shrink-0 mt-1", isPulseMsg && "ring-2 ring-green-500/30")}>
                              {isPulseMsg ? (
                                <AvatarFallback className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">🌱</AvatarFallback>
                              ) : (
                                <>
                                  <AvatarImage src={msg.sender?.avatar_url ?? undefined} />
                                  <AvatarFallback className="text-[10px]">{msg.sender?.name?.[0] ?? "?"}</AvatarFallback>
                                </>
                              )}
                            </Avatar>
                          )}
                          <div className="flex items-start gap-1 max-w-[75%]">
                            {/* Actions for own messages (left side) */}
                            {isOwn && !msg.is_deleted && !isEditing && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingMsgId(msg.id); setEditText(msg.content); }}>
                                    <Pencil className="h-4 w-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDelete(msg.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}

                            <div className={cn(
                              "rounded-2xl px-3.5 py-2",
                              isOwn
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            )}>
                              {!isOwn && (activeConv?.is_group || (msg as any).sender_label) && (
                                <p className="text-[10px] font-medium opacity-70 mb-0.5">
                                  {(msg as any).sender_label || msg.sender?.name}
                                  {(msg as any).sender_label && <span className="ml-1 text-primary">• Official</span>}
                                </p>
                              )}
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <Input
                                    value={editText}
                                    onChange={(e) => setEditText(e.target.value)}
                                    className="h-7 text-sm bg-background text-foreground min-w-[120px]"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleEditSave();
                                      if (e.key === "Escape") { setEditingMsgId(null); setEditText(""); }
                                    }}
                                  />
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleEditSave}>
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setEditingMsgId(null); setEditText(""); }}>
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  {/* Attachment display */}
                                  {msg.attachment_url && (
                                    <div className="mb-1.5">
                                      {msg.attachment_type && IMAGE_TYPES.includes(msg.attachment_type) ? (
                                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                                          <img src={msg.attachment_url} alt={msg.attachment_name || "Image"} className="rounded-lg max-h-48 max-w-full object-cover hover:opacity-90 transition-opacity" />
                                        </a>
                                      ) : (
                                        <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer"
                                          className={cn("flex items-center gap-2 p-2 rounded-lg border transition-colors", isOwn ? "border-primary-foreground/20 hover:bg-primary-foreground/10" : "border-border hover:bg-background")}>
                                          <FileText className="h-4 w-4 shrink-0" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium truncate">{msg.attachment_name}</p>
                                            {msg.attachment_size && <p className="text-[10px] opacity-70">{formatFileSize(msg.attachment_size)}</p>}
                                          </div>
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  {msg.content && (
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                      {msg.is_deleted ? <span className="italic opacity-60">Message deleted</span> : renderWithLinks(msg.content, isOwn)}
                                    </p>
                                  )}
                                </>
                              )}
                              <p className={cn("text-[10px] mt-1", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>

                            {/* Actions for other's messages (right side) - block only */}
                            {!isOwn && !msg.is_deleted && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <BlockMenuItem targetUserId={msg.sender_id} />
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {/* Pulse bot loading indicator */}
                    {pulseLoading && isPulseActive && (
                      <div className="flex gap-2 justify-start">
                        <Avatar className="h-7 w-7 shrink-0 mt-1 ring-2 ring-green-500/30">
                          <AvatarFallback className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">🌱</AvatarFallback>
                        </Avatar>
                        <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-green-600" />
                          <span className="text-xs text-muted-foreground">Pulse is thinking...</span>
                        </div>
                      </div>
                    )}

                    {/* Enrichment suggestion cards */}
                    {pulseEnrichment && isPulseActive && (
                      <EnrichmentCards data={pulseEnrichment} onAccept={handleAcceptEnrichment} />
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Attachment preview */}
                {attachment && (
                  <div className="px-3 pt-2 flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-xs max-w-xs">
                      {attachment.preview ? (
                        <img src={attachment.preview} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="truncate">{attachment.file.name}</span>
                      <span className="text-muted-foreground shrink-0">({formatFileSize(attachment.file.size)})</span>
                      <button onClick={removeAttachment} className="shrink-0 hover:text-destructive transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Compose */}
                <div className="p-3 border-t border-border pb-[env(safe-area-inset-bottom,0.75rem)]">
                  <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md" />
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-2"
                  >
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} disabled={sendMessage.isPending || !!attachment} title="Attach file (max 25 MB)">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder={isPulseActive ? "Share your LinkedIn URL, describe yourself, or ask Pulse…" : "Type a message..."}
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="submit" size="icon" disabled={(!messageText.trim() && !attachment) || sendMessage.isPending || pulseLoading}>
                      {pulseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a conversation or start a new one</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
