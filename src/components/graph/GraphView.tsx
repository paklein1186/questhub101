import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { Loader2, AlertCircle } from "lucide-react";
import { useGraphData, type GraphNode } from "@/hooks/useGraphData";
import {
  NODE_STYLES,
  EDGE_STYLES,
  DEFAULT_NODE_STYLE,
  DEFAULT_EDGE_STYLE,
  weightToWidth,
  drawHexagon,
  drawRoundedRect,
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
  __connections?: number;
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
      follows: true, member_of: true, steward_of: true, quest_owner: true,
      partner: true, funds: true, trust: true, located_in: true,
    },
  });

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<FGLink | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Build graph data with connection counts for adaptive sizing
  const graphData = useMemo(() => {
    if (!data) return { nodes: [] as FGNode[], links: [] as FGLink[] };

    const allNodes: GraphNode[] = [data.center, ...data.nodes];
    const visibleNodeTypes = new Set(
      Object.entries(filters.nodeTypes).filter(([, v]) => v).map(([k]) => k)
    );
    visibleNodeTypes.add(centerType);

    const visibleRelations = new Set(
      Object.entries(filters.relationTypes).filter(([, v]) => v).map(([k]) => k)
    );

    const filteredEdges = data.edges.filter((e) => visibleRelations.has(e.relationType));

    const connectedIds = new Set<string>([centerId]);
    for (const e of filteredEdges) {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    }

    // Count connections per node
    const connectionCount: Record<string, number> = {};
    for (const e of filteredEdges) {
      connectionCount[e.source] = (connectionCount[e.source] || 0) + 1;
      connectionCount[e.target] = (connectionCount[e.target] || 0) + 1;
    }

    const nodes: FGNode[] = allNodes
      .filter((n) => visibleNodeTypes.has(n.type) && connectedIds.has(n.id))
      .map((n) => ({
        ...n,
        isCenter: n.id === centerId,
        __connections: connectionCount[n.id] || 0,
      }));

    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const links: FGLink[] = filteredEdges
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map((e) => ({
        id: e.id, source: e.source, target: e.target,
        relationType: e.relationType, weight: e.weight,
      }));

    return { nodes, links };
  }, [data, filters, centerId, centerType]);

  // Adaptive force params based on data size
  const isLargeGraph = graphData.nodes.length > 40;
  const chargeStrength = isLargeGraph ? -120 : -200;

  // Zoom to fit after data loads
  useEffect(() => {
    if (graphData.nodes.length && graphRef.current) {
      setTimeout(() => graphRef.current?.zoomToFit(400, 60), 600);
    }
  }, [graphData.nodes.length]);

  // Node canvas drawing with glow, shapes, adaptive labels
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const style = NODE_STYLES[node.type] || DEFAULT_NODE_STYLE;
      const connections = node.__connections || 0;
      // Adaptive size: base + sqrt of connections (caps at 2x)
      const sizeMultiplier = node.isCenter ? 1.6 : Math.min(2, 1 + Math.sqrt(connections) * 0.15);
      const size = style.size * sizeMultiplier;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const isHovered = hoveredNode === node.id;
      const isConnectedToHover = false; // could be extended

      // Glow for center or hovered
      if (node.isCenter || isHovered) {
        ctx.save();
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = isHovered ? 20 : 14;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Draw shape
      ctx.beginPath();
      if (style.shape === "diamond") {
        const s = size * 1.1;
        ctx.moveTo(x, y - s);
        ctx.lineTo(x + s, y);
        ctx.lineTo(x, y + s);
        ctx.lineTo(x - s, y);
        ctx.closePath();
      } else if (style.shape === "square") {
        drawRoundedRect(ctx, x, y, size, size * 0.25);
      } else if (style.shape === "hexagon") {
        drawHexagon(ctx, x, y, size);
      } else {
        ctx.arc(x, y, size, 0, 2 * Math.PI);
      }

      // Fill with gradient
      const grad = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size * 1.3);
      grad.addColorStop(0, style.color.replace(")", ", 1)").replace("hsl(", "hsla("));
      grad.addColorStop(1, style.color);
      ctx.fillStyle = grad;
      ctx.fill();

      // Border
      if (node.isCenter) {
        ctx.strokeStyle = "hsla(0, 0%, 100%, 0.9)";
        ctx.lineWidth = 2.5 / globalScale;
        ctx.stroke();
      } else if (isHovered) {
        ctx.strokeStyle = "hsla(0, 0%, 100%, 0.6)";
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      if (node.isCenter || isHovered) ctx.restore();

      // Label — only show when zoomed in enough, or for center/hovered
      const showLabel = globalScale > 0.8 || node.isCenter || isHovered;
      const showAlways = node.isCenter || isHovered || connections > 3;

      if (showLabel || (globalScale > 0.5 && showAlways)) {
        const fontSize = Math.max(11 / globalScale, 2.5);
        ctx.font = `${node.isCenter || isHovered ? "600" : "400"} ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const label = node.name || "";
        const maxChars = globalScale < 1.2 ? 16 : 30;
        const displayLabel = label.length > maxChars ? label.slice(0, maxChars - 1) + "…" : label;

        // Text shadow for readability
        ctx.fillStyle = "hsla(0, 0%, 0%, 0.55)";
        ctx.fillText(displayLabel, x + 0.5, y + size + 3 + 0.5);
        ctx.fillStyle =
          node.isCenter || isHovered ? "hsla(0, 0%, 100%, 0.95)" : "hsla(0, 0%, 85%, 0.85)";
        ctx.fillText(displayLabel, x, y + size + 3);
      }
    },
    [hoveredNode]
  );

  // Link rendering
  const linkColor = useCallback(
    (link: any) => {
      const style = EDGE_STYLES[link.relationType] || DEFAULT_EDGE_STYLE;
      if (hoveredNode) {
        const src = typeof link.source === "object" ? link.source.id : link.source;
        const tgt = typeof link.target === "object" ? link.target.id : link.target;
        if (src === hoveredNode || tgt === hoveredNode) return style.activeColor;
        return "hsla(0, 0%, 40%, 0.08)";
      }
      return style.color;
    },
    [hoveredNode]
  );

  const linkWidth = useCallback(
    (link: any) => {
      const base = weightToWidth(link.weight);
      if (hoveredNode) {
        const src = typeof link.source === "object" ? link.source.id : link.source;
        const tgt = typeof link.target === "object" ? link.target.id : link.target;
        if (src === hoveredNode || tgt === hoveredNode) return base * 1.5;
        return base * 0.4;
      }
      return base;
    },
    [hoveredNode]
  );

  const linkDashArray = useCallback((link: any) => {
    const style = EDGE_STYLES[link.relationType] as any;
    return style?.dashArray ? (style.dashArray as string).split(",").map(Number) : undefined;
  }, []);

  const handleNodeClick = useCallback(
    (node: any) => {
      if (node.slug) navigate(node.slug);
    },
    [navigate]
  );

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node?.id || null);
  }, []);

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
      <GraphFilters
        filters={filters}
        onChange={setFilters}
        nodeCount={graphData.nodes.length}
        edgeCount={graphData.links.length}
      />

      {/* Tooltip for hovered link */}
      {hoveredLink && typeof hoveredLink.source === "object" && (
        <div className="text-xs bg-popover text-popover-foreground border border-border rounded-md px-3 py-1.5 text-center shadow-md mb-2 mx-auto w-fit">
          <span className="font-medium">{(hoveredLink.source as FGNode).name}</span>
          <span className="text-muted-foreground mx-1.5">→</span>
          <span className="text-primary">
            {(EDGE_STYLES[hoveredLink.relationType] || DEFAULT_EDGE_STYLE).label}
          </span>
          <span className="text-muted-foreground mx-1.5">→</span>
          <span className="font-medium">{(hoveredLink.target as FGNode).name}</span>
          <span className="text-muted-foreground ml-2">Trust: {hoveredLink.weight.toFixed(2)}</span>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden bg-card/30 backdrop-blur-sm">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={containerWidth}
          height={height}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const style = NODE_STYLES[node.type] || DEFAULT_NODE_STYLE;
            const size = (node.isCenter ? style.size * 1.6 : style.size) + 3;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkLineDash={linkDashArray}
          linkDirectionalParticles={0}
          linkCurvature={0.15}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onLinkHover={(link: any) => setHoveredLink(link)}
          backgroundColor="transparent"
          cooldownTicks={isLargeGraph ? 200 : 100}
          d3AlphaDecay={isLargeGraph ? 0.02 : 0.04}
          d3VelocityDecay={isLargeGraph ? 0.4 : 0.3}
          d3AlphaMin={0.001}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          nodeLabel=""
          dagMode={undefined}
        />
      </div>
    </div>
  );
}
