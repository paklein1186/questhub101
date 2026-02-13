import { useState, useRef, useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { useConversations, useConversationMessages, useSendMessage, useCreateConversation } from "@/hooks/useMessages";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserSearchInput } from "@/components/UserSearchInput";
import { Send, Plus, ArrowLeft, Users, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

export default function InboxPage() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const isMobile = useIsMobile();
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; name: string }[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useConversations();
  const { data: messages = [] } = useConversationMessages(activeConvId);
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!messageText.trim() || !activeConvId) return;
    sendMessage.mutate({ conversationId: activeConvId, content: messageText.trim() });
    setMessageText("");
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

  const getConversationName = (conv: typeof conversations[0]) => {
    if (conv.title) return conv.title;
    const others = conv.participants.filter((p) => p.user_id !== userId);
    return others.map((p) => p.name).join(", ") || "Conversation";
  };

  const getConversationAvatar = (conv: typeof conversations[0]) => {
    const others = conv.participants.filter((p) => p.user_id !== userId);
    return others[0];
  };

  const showConvList = !isMobile || !activeConvId;
  const showThread = !isMobile || !!activeConvId;

  return (
    <PageShell>
      <div className="flex h-[calc(100vh-10rem)] rounded-xl border border-border overflow-hidden bg-card">
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
                    <UserSearchInput
                      onSelect={(user) => {
                        if (!selectedUsers.find((u) => u.id === user.user_id)) {
                          setSelectedUsers((prev) => [...prev, { id: user.user_id, name: user.display_name ?? "User" }]);
                        }
                      }}
                      placeholder="Search users..."
                    />
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
                          <p className={cn("text-sm truncate", conv.unread_count > 0 ? "font-semibold" : "font-medium")}>{getConversationName(conv)}</p>
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
                    const conv = conversations.find((c) => c.id === activeConvId);
                    if (!conv) return null;
                    const avatar = getConversationAvatar(conv);
                    return (
                      <>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={avatar?.avatar_url ?? undefined} />
                          <AvatarFallback>{conv.is_group ? <Users className="h-4 w-4" /> : (avatar?.name?.[0] ?? "?")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{getConversationName(conv)}</p>
                          {conv.is_group && (
                            <p className="text-[11px] text-muted-foreground">{conv.participants.length} members</p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_id === userId;
                      return (
                        <div key={msg.id} className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}>
                          {!isOwn && (
                            <Avatar className="h-7 w-7 shrink-0 mt-1">
                              <AvatarImage src={msg.sender?.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[10px]">{msg.sender?.name?.[0] ?? "?"}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={cn(
                            "max-w-[75%] rounded-2xl px-3.5 py-2",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted rounded-bl-md"
                          )}>
                            {!isOwn && conversations.find((c) => c.id === activeConvId)?.is_group && (
                              <p className="text-[10px] font-medium opacity-70 mb-0.5">{msg.sender?.name}</p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.is_deleted ? "Message deleted" : msg.content}</p>
                            <p className={cn("text-[10px] mt-1", isOwn ? "text-primary-foreground/60" : "text-muted-foreground")}>
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Compose */}
                <div className="p-3 border-t border-border">
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                      autoFocus
                    />
                    <Button type="submit" size="icon" disabled={!messageText.trim() || sendMessage.isPending}>
                      <Send className="h-4 w-4" />
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
