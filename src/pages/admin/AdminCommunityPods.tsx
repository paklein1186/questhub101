import { Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { SortableTableHead } from "@/components/ui/sortable-table-head";
import { usePods } from "@/hooks/useSupabaseData";
import { useTableSort } from "@/hooks/useTableSort";
import { useMemo } from "react";

export default function AdminCommunityPods() {
  const { data: allPods = [], isLoading } = usePods();

  const enriched = useMemo(() => allPods.map(pod => ({
    ...pod,
    _type: pod.type.toLowerCase().replace("_", " "),
    _status: pod.is_draft ? "Draft" : "Active",
  })), [allPods]);

  const { sorted, sort, toggle } = useTableSort(enriched);

  return (
    <div className="space-y-4">
      <h2 className="font-display text-2xl font-bold flex items-center gap-2">
        <Hash className="h-6 w-6 text-primary" /> Pods
      </h2>
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead sortKey="name" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Name</SortableTableHead>
              <SortableTableHead sortKey="_type" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Type</SortableTableHead>
              <SortableTableHead sortKey="_status" currentKey={sort.key} direction={sort.direction} onSort={toggle}>Status</SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((pod) => (
              <TableRow key={pod.id}>
                <TableCell className="font-medium">{pod.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs capitalize">{pod._type}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={pod.is_draft ? "outline" : "default"} className="text-xs">
                    {pod._status}
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
