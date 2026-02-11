import { Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePods } from "@/hooks/useSupabaseData";

export default function AdminCommunityPods() {
  const { data: allPods = [], isLoading } = usePods();

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Hash className="h-6 w-6 text-primary" /> Pods
      </h2>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allPods.map((pod) => (
              <TableRow key={pod.id}>
                <TableCell className="font-medium">{pod.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs capitalize">{pod.type.toLowerCase().replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={pod.is_draft ? "outline" : "default"} className="text-xs">
                    {pod.is_draft ? "Draft" : "Active"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && allPods.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No pods.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
