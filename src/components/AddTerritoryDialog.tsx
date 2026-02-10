import { useState } from "react";
import { Plus, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { TerritoryLevel } from "@/types/enums";
import { territories } from "@/data/mock";

interface Props {
  /** Called with the id of the newly created (or existing duplicate) territory */
  onCreated: (territoryId: string) => void;
}

export function AddTerritoryDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<TerritoryLevel>(TerritoryLevel.TOWN);
  const { toast } = useToast();

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Check for duplicate
    const existing = territories.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase() && t.level === level
    );
    if (existing) {
      onCreated(existing.id);
      toast({ title: "This territory already exists; it has been selected for you." });
      setOpen(false);
      setName("");
      return;
    }

    const newTerritory = {
      id: `tr-${Date.now()}`,
      name: trimmed,
      level,
    };
    territories.push(newTerritory);
    onCreated(newTerritory.id);
    toast({ title: `Territory "${trimmed}" created and selected!` });
    setOpen(false);
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add new Territory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Add new Territory
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Marseille"
              maxLength={80}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Level</label>
            <Select value={level} onValueChange={(v) => setLevel(v as TerritoryLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TerritoryLevel.TOWN}>Town</SelectItem>
                <SelectItem value={TerritoryLevel.REGION}>Region</SelectItem>
                <SelectItem value={TerritoryLevel.NATIONAL}>National</SelectItem>
                <SelectItem value={TerritoryLevel.OTHER}>Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={!name.trim()} className="w-full">
            Create Territory
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
