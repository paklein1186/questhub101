import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Send, MessageCircle, Sparkles, Megaphone, BookOpen, MoreHorizontal, Pencil, Calendar, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { CommentThread } from "@/components/CommentThread";
import { AttachmentList } from "@/components/AttachmentUpload";
import { GuildDiscussionTab } from "@/components/guild/GuildDiscussionTab";
import { GuildRitualsTab } from "@/components/guild/GuildRitualsTab";
import { CommentTargetType, AttachmentTargetType } from "@/types/enums";
import { formatDistanceToNow } from "date-fns";

const updateIcons: Record<string, typeof Sparkles> = {
  MILESTONE: Sparkles,
  CALL_FOR_HELP: Megaphone,
  REFLECTION: BookOpen,
  GENERAL: MessageCircle,
};

interface QuestActivityTabProps {
  quest: any;
  updates: any[];
  participants: any[];
  topics: any[];
  territories: any[];
  currentUser: any;
  isOwner: boolean;
  isParticipant: boolean;
  canPostUpdate: boolean;
  qfc: { rituals: boolean; subtasks: boolean; discussion: boolean };
  onOpenUpdateDialog: () => void;
  onEditUpdate: (update: any) => void;
  onDeleteUpdate: (updateId: string) => void;
  onTogglePin: (updateId: string, currentPinned: boolean) => void;
}

export function QuestActivityTab({
  quest,
  updates,
  participants,
  topics,
  territories,
  currentUser,
  isOwner,
  isParticipant,
  canPostUpdate,
  qfc,
  onOpenUpdateDialog,
  onEditUpdate,
  onDeleteUpdate,
  onTogglePin,
}: QuestActivityTabProps) {
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [ritualsOpen, setRitualsOpen] = useState(false);

  const guild = quest.guilds;

  return (
    <div className="mt-6 space-y-4">
      {/* ─── Side Panel Buttons ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        {canPostUpdate && (
          <Button size="sm" onClick={onOpenUpdateDialog}>
            <Send className="h-4 w-4 mr-1" /> Post Update
          </Button>
        )}

        <Sheet open={discussionOpen} onOpenChange={setDiscussionOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline">
              <MessageCircle className="h-4 w-4 mr-1" /> Discussion
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Discussion</SheetTitle>
              <SheetDescription>Quest discussion rooms and threads</SheetDescription>
            </SheetHeader>
            <div className="mt-4">
              <GuildDiscussionTab
                guildId={quest.guild_id || quest.id}
                guildName={guild?.name || quest.title}
                isAdmin={isOwner}
                isMember={isParticipant || false}
                canPost={isOwner || isParticipant || false}
                initialTerritoryIds={territories.map((t: any) => t.id)}
                initialTopicIds={topics.map((t: any) => t.id)}
                scopeType="QUEST"
                scopeId={quest.id}
                membership={isOwner ? { role: "ADMIN" } : isParticipant ? { role: "MEMBER" } : undefined}
                currentUserId={currentUser.id}
              />
              <div className="mt-4">
                <CommentThread targetType={CommentTargetType.QUEST} targetId={quest.id} />
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {qfc.rituals && (
          <Sheet open={ritualsOpen} onOpenChange={setRitualsOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline">
                <Calendar className="h-4 w-4 mr-1" /> Rituals
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Rituals</SheetTitle>
                <SheetDescription>Recurring meetings and ceremonies</SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <GuildRitualsTab questId={quest.id} isAdmin={isOwner} isMember={isParticipant || false} />
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* ─── Updates Feed ─── */}
      {(updates || []).length === 0 && (
        <div className="text-center py-10">
          <p className="text-muted-foreground">No updates yet.</p>
          {canPostUpdate && <p className="text-sm text-muted-foreground mt-1">Share your first progress update.</p>}
        </div>
      )}

      {(updates || []).map((update: any, i: number) => {
        const Icon = updateIcons[update.type] || MessageCircle;
        const isUpdateAuthor = currentUser.id === update.author_id;
        const canEdit = isUpdateAuthor || isOwner;

        return (
          <motion.div
            key={update.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl border bg-card p-5 space-y-3 ${update.pinned ? "border-primary/40 bg-primary/5" : "border-border"}`}
          >
            <div className="flex items-start gap-3">
              {update.author && (
                <Link to={`/users/${update.author.user_id}`}>
                  <Avatar className="h-9 w-9"><AvatarImage src={update.author.avatar_url} /><AvatarFallback>{update.author.name?.[0]}</AvatarFallback></Avatar>
                </Link>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  {update.author && <Link to={`/users/${update.author.user_id}`} className="font-medium hover:text-primary">{update.author.name}</Link>}
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <Badge variant="secondary" className="text-[10px] capitalize">{update.type.toLowerCase().replace(/_/g, " ")}</Badge>
                  {update.pinned && <Badge className="text-[10px] bg-primary/10 text-primary border-0">Pinned</Badge>}
                  {update.visibility && update.visibility !== "PUBLIC" && (
                    <Badge variant="outline" className="text-[10px] capitalize">{update.visibility === "FOLLOWERS" ? "Followers" : "Internal"}</Badge>
                  )}
                  <span className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}</span>
                </div>
                <h4 className="font-display font-semibold mt-1">{update.title}</h4>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{update.content}</p>
                {update.image_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border max-w-lg">
                    <img src={update.image_url} alt="" className="w-full h-auto" />
                  </div>
                )}
                <div className="mt-2"><AttachmentList targetType={AttachmentTargetType.QUEST_UPDATE} targetId={update.id} /></div>
              </div>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditUpdate(update)}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                    {isOwner && <DropdownMenuItem onClick={() => onTogglePin(update.id, update.pinned)}>{update.pinned ? "Unpin" : "Pin"}</DropdownMenuItem>}
                    <DropdownMenuItem className="text-destructive" onClick={() => onDeleteUpdate(update.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {update.comments_enabled !== false && (
              <div className="ml-12 pt-3 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground mb-2">Comments on this update</p>
                <CommentThread targetType={CommentTargetType.QUEST_UPDATE} targetId={update.id} />
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
