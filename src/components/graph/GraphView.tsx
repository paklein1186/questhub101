import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { Loader2, AlertCircle } from "lucide-react";
import { useGraphData, type GraphNode, type GraphEdge } from "@/hooks/useGraphData";
import {
  NODE_STYLES,
  EDGE_STYLES,
  DEFAULT_NODE_STYLE,
  DEFAULT_EDGE_STYLE,
  weightToWidth,
} from "./graphConfig";
import { GraphFilters, type FilterState } from "./GraphFilters";

export type GraphViewProps = {
  centerType: "user" | "guild" | "quest" | "territory" | "org" | "pod";
  centerId: string;
  height?: number;
};

interface FGNode {
  id: string;
  type: string;
  name: string;
  avatarUrl?: string;
  slug: string;
  isCenter?: boolean;
  x?: number;
  y?: number;
}

interface FGLink {
  id: string;
  source: string | FGNode;
  target: string | FGNode;
  relationType: string;
  weight: number;
}

export function GraphView({ centerType, centerId, height = 500 }: GraphViewProps) {
  const navigate = useNavigate();
  const graphRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const { data, isLoading, error } = useGraphData(centerType, centerId);

  const [filters, setFilters] = useState<FilterState>({
    nodeTypes: { user: true, guild: true, quest: true, territory: true, org: true, pod: true },
    relationTypes: {
      follows: true,
      member_of: true,
      steward_of: true,
      quest_owner: true,
      partner: true,
      funds: true,
      trust: true,
      located_in: true,
    },
  });

  const [hoveredLink, setHoveredLink] = useState<FGLink | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Build graph data
  const graphData = useMemo(() => {
    if (!data) return { nodes: [] as FGNode[], links: [] as FGLink[] };

    const allNodes: GraphNode[] = [data.center, ...data.nodes];
    const visibleNodeTypes = new Set(
      Object.entries(filters.nodeTypes)
        .filter(([, v]) => v)
        .map(([k]) => k)
    );
    // Always show center
    visibleNodeTypes.add(centerType);

    const visibleRelations = new Set(
      Object.entries(filters.relationTypes)
        .filter(([, v]) => v)
        .map(([k]) => k)
    );

    // Filter edges
    const filteredEdges = data.edges.filter(
      (e) => visibleRelations.has(e.relationType)
    );

    // Collect visible node IDs from visible edges
    const connectedIds = new Set<string>();
    connectedIds.add(centerId);
    for (const e of filteredEdges) {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    }

    const nodes: FGNode[] = allNodes
      .filter((n) => visibleNodeTypes.has(n.type) && connectedIds.has(n.id))
      .map((n) => ({
        ...n,
        isCenter: n.id === centerId,
      }));

    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const links: FGLink[] = filteredEdges
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        relationType: e.relationType,
        weight: e.weight,
      }));

    return { nodes, links };
  }, [data, filters, centerId, centerType]);

  // Zoom to fit after data loads
  useEffect(() => {
    if (graphData.nodes.length && graphRef.current) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 60);
      }, 500);
    }
  }, [graphData.nodes.length]);

  // Node canvas drawing
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const style = NODE_STYLES[node.type] || DEFAULT_NODE_STYLE;
      const size = node.isCenter ? style.size * 1.4 : style.size;
      const fontSize = Math.max(10 / globalScale, 2);
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      ctx.beginPath();
      if (style.shape === "diamond") {
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
      } else if (style.shape === "square") {
        ctx.rect(x - size, y - size, size * 2, size * 2);
      } else {
        ctx.arc(x, y, size, 0, 2 * Math.PI);
      }
      ctx.fillStyle = style.color;
      ctx.fill();

      if (node.isCenter) {
        ctx.strokeStyle = "hsl(0,0%,100%)";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // Label
      if (globalScale > 0.6) {
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "hsl(0,0%,85%)";
        ctx.fillText(node.name || "", x, y + size + 2);
      }
    },
    []
  );

  // Link rendering
  const linkColor = useCallback((link: any) => {
    const style = EDGE_STYLES[link.relationType] || DEFAULT_EDGE_STYLE;
    return style.color;
  }, []);

  const linkWidth = useCallback((link: any) => {
    return weightToWidth(link.weight);
  }, []);

  const linkDashArray = useCallback((link: any) => {
    const style = EDGE_STYLES[link.relationType] as any;
    return style?.dashArray
      ? (style.dashArray as string).split(",").map(Number)
      : undefined;
  }, []);

  const handleNodeClick = useCallback(
    (node: any) => {
      if (node.slug) navigate(node.slug);
    },
    [navigate]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading graph…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-destructive gap-2">
        <AlertCircle className="h-5 w-5" />
        <span className="text-sm">Failed to load graph</span>
      </div>
    );
  }

  if (!data || (data.nodes.length === 0 && data.edges.length === 0)) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <span className="text-sm">No connections found yet.</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <GraphFilters filters={filters} onChange={setFilters} />

      {/* Tooltip */}
      {hoveredLink && typeof hoveredLink.source === "object" && (
        <div className="text-xs text-muted-foreground text-center py-1">
          {(hoveredLink.source as FGNode).name} →{" "}
          {(EDGE_STYLES[hoveredLink.relationType] || DEFAULT_EDGE_STYLE).label} →{" "}
          {(hoveredLink.target as FGNode).name} — Trust: {hoveredLink.weight.toFixed(2)}
        </div>
      )}

      <div className="rounded-lg border border-border overflow-hidden bg-card/50">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={containerWidth}
          height={height}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const style = NODE_STYLES[node.type] || DEFAULT_NODE_STYLE;
            const size = node.isCenter ? style.size * 1.5 : style.size;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, size + 2, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkLineDash={linkDashArray}
          linkDirectionalParticles={0}
          onNodeClick={handleNodeClick}
          onLinkHover={(link: any) => setHoveredLink(link)}
          backgroundColor="transparent"
          cooldownTicks={100}
          d3AlphaDecay={0.04}
          d3VelocityDecay={0.3}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      </div>
    </div>
  );
}
