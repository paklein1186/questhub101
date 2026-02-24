import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";
import { Loader2, AlertCircle } from "lucide-react";
import { useGraphData, type GraphNode } from "@/hooks/useGraphData";
import {
  NODE_STYLES, EDGE_STYLES, DEFAULT_NODE_STYLE, DEFAULT_EDGE_STYLE,
  weightToWidth, drawHexagon, drawRoundedRect,
} from "./graphConfig";
import { GraphFilters, type FilterState } from "./GraphFilters";

export type GraphViewProps = {
  centerType: "user" | "guild" | "quest" | "territory" | "org" | "pod";
  centerId: string;
  height?: number;
};

interface FGNode {
  id: string; type: string; name: string; avatarUrl?: string;
  slug: string; isCenter?: boolean; x?: number; y?: number;
  __connections?: number;
}

interface FGLink {
  id: string; source: string | FGNode; target: string | FGNode;
  relationType: string; weight: number;
}

export function GraphView({ centerType, centerId, height = 600 }: GraphViewProps) {
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

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Build graph data
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
    for (const e of filteredEdges) { connectedIds.add(e.source); connectedIds.add(e.target); }

    const connectionCount: Record<string, number> = {};
    for (const e of filteredEdges) {
      connectionCount[e.source] = (connectionCount[e.source] || 0) + 1;
      connectionCount[e.target] = (connectionCount[e.target] || 0) + 1;
    }

    const nodes: FGNode[] = allNodes
      .filter((n) => visibleNodeTypes.has(n.type) && connectedIds.has(n.id))
      .map((n) => ({ ...n, isCenter: n.id === centerId, __connections: connectionCount[n.id] || 0 }));

    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const links: FGLink[] = filteredEdges
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map((e) => ({ id: e.id, source: e.source, target: e.target, relationType: e.relationType, weight: e.weight }));

    return { nodes, links };
  }, [data, filters, centerId, centerType]);

  // Build adjacency map for hover highlighting
  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of graphData.links) {
      const src = typeof link.source === "object" ? link.source.id : link.source;
      const tgt = typeof link.target === "object" ? link.target.id : link.target;
      if (!map.has(src)) map.set(src, new Set());
      if (!map.has(tgt)) map.set(tgt, new Set());
      map.get(src)!.add(tgt);
      map.get(tgt)!.add(src);
    }
    return map;
  }, [graphData.links]);

  const isLargeGraph = graphData.nodes.length > 30;

  useEffect(() => {
    if (graphData.nodes.length && graphRef.current) {
      setTimeout(() => graphRef.current?.zoomToFit(500, 80), 700);
    }
  }, [graphData.nodes.length]);

  // ─── Node painting ───────────────────────────────────────
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const style = NODE_STYLES[node.type] || DEFAULT_NODE_STYLE;
      const connections: number = node.__connections || 0;
      // Subtle adaptive sizing: center is bigger, hubs slightly bigger
      const baseSize = node.isCenter
        ? style.size * 1.8
        : style.size * (1 + Math.min(0.6, Math.log2(connections + 1) * 0.15));
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      const isHovered = hoveredNode === node.id;
      const isNeighborOfHovered = hoveredNode ? adjacencyMap.get(hoveredNode)?.has(node.id) : false;
      const isFaded = hoveredNode !== null && !isHovered && !isNeighborOfHovered && !node.isCenter;

      const alpha = isFaded ? 0.15 : 1;
      const size = isHovered ? baseSize * 1.3 : baseSize;

      // Glow
      if (isHovered || node.isCenter) {
        ctx.save();
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = isHovered ? 18 : 10;
      }

      // Shape path
      ctx.beginPath();
      if (style.shape === "diamond") {
        const s = size * 1.05;
        ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y);
        ctx.closePath();
      } else if (style.shape === "square") {
        drawRoundedRect(ctx, x, y, size * 0.9, size * 0.2);
      } else if (style.shape === "hexagon") {
        drawHexagon(ctx, x, y, size);
      } else {
        ctx.arc(x, y, size, 0, 2 * Math.PI);
      }

      // Fill
      ctx.globalAlpha = alpha;
      ctx.fillStyle = style.color;
      ctx.fill();

      // Inner highlight (top-left light)
      if (!isFaded) {
        ctx.globalAlpha = 0.25 * alpha;
        const hl = ctx.createRadialGradient(x - size * 0.3, y - size * 0.35, 0, x, y, size);
        hl.addColorStop(0, "hsla(0, 0%, 100%, 1)");
        hl.addColorStop(1, "hsla(0, 0%, 100%, 0)");
        ctx.fillStyle = hl;
        ctx.fill();
        ctx.globalAlpha = alpha;
      }

      // Border
      if (node.isCenter) {
        ctx.strokeStyle = `hsla(0, 0%, 100%, ${0.85 * alpha})`;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      } else if (isHovered) {
        ctx.strokeStyle = `hsla(0, 0%, 100%, 0.7)`;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      if (isHovered || node.isCenter) ctx.restore();

      // Label: only center, hovered, or neighbors of hovered
      const showLabel = node.isCenter || isHovered || isNeighborOfHovered;
      if (showLabel && !isFaded) {
        const fontSize = Math.max(10 / globalScale, 2.2);
        const weight = (node.isCenter || isHovered) ? "600" : "400";
        ctx.font = `${weight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const label = node.name || "";
        const maxLen = isHovered ? 28 : 18;
        const display = label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label;
        const ty = y + size + 2.5;

        // Background pill behind label
        const metrics = ctx.measureText(display);
        const pw = metrics.width + 6;
        const ph = fontSize + 3;
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "hsla(0, 0%, 8%, 0.85)";
        ctx.beginPath();
        ctx.roundRect(x - pw / 2, ty - 1, pw, ph, 3);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = isHovered ? "hsla(0, 0%, 100%, 1)" : "hsla(0, 0%, 90%, 0.95)";
        ctx.fillText(display, x, ty + 1);
      }

      ctx.globalAlpha = 1;
    },
    [hoveredNode, adjacencyMap]
  );

  // ─── Link rendering ──────────────────────────────────────
  const linkColor = useCallback(
    (link: any) => {
      const style = EDGE_STYLES[link.relationType] || DEFAULT_EDGE_STYLE;
      if (!hoveredNode) return style.color;
      const src = typeof link.source === "object" ? link.source.id : link.source;
      const tgt = typeof link.target === "object" ? link.target.id : link.target;
      if (src === hoveredNode || tgt === hoveredNode) return style.activeColor;
      return "hsla(0, 0%, 30%, 0.03)";
    },
    [hoveredNode]
  );

  const linkWidth = useCallback(
    (link: any) => {
      const base = weightToWidth(link.weight);
      if (!hoveredNode) return base;
      const src = typeof link.source === "object" ? link.source.id : link.source;
      const tgt = typeof link.target === "object" ? link.target.id : link.target;
      if (src === hoveredNode || tgt === hoveredNode) return base * 2;
      return 0.2;
    },
    [hoveredNode]
  );

  const linkDashArray = useCallback((link: any) => {
    const style = EDGE_STYLES[link.relationType] as any;
    return style?.dashArray ? (style.dashArray as string).split(",").map(Number) : undefined;
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    if (node.slug) navigate(node.slug);
  }, [navigate]);

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node?.id || null);
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? "pointer" : "default";
    }
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

      {/* Floating tooltip for hovered node */}
      {hoveredNode && (() => {
        const n = graphData.nodes.find((nd) => nd.id === hoveredNode);
        if (!n) return null;
        const style = NODE_STYLES[n.type] || DEFAULT_NODE_STYLE;
        const neighbors = adjacencyMap.get(n.id);
        return (
          <div className="text-xs bg-popover/95 backdrop-blur-sm text-popover-foreground border border-border rounded-lg px-3 py-2 shadow-lg mb-2 mx-auto w-fit max-w-sm">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: style.color }}
              />
              <span className="font-semibold truncate">{n.name}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{style.label}</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              {neighbors?.size ?? 0} connections · Click to open
            </div>
          </div>
        );
      })()}

      <div className="rounded-xl border border-border overflow-hidden bg-background/50">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={containerWidth}
          height={height}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const style = NODE_STYLES[node.type] || DEFAULT_NODE_STYLE;
            const size = (node.isCenter ? style.size * 2 : style.size * 1.2) + 4;
            ctx.beginPath();
            ctx.arc(node.x ?? 0, node.y ?? 0, size, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkLineDash={linkDashArray}
          linkDirectionalParticles={0}
          linkCurvature={0.12}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onLinkHover={(link: any) => setHoveredLink(link)}
          backgroundColor="transparent"
          cooldownTicks={isLargeGraph ? 250 : 120}
          d3AlphaDecay={isLargeGraph ? 0.015 : 0.035}
          d3VelocityDecay={isLargeGraph ? 0.35 : 0.3}
          d3AlphaMin={0.001}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          nodeLabel=""
          minZoom={0.3}
          maxZoom={8}
        />
      </div>
    </div>
  );
}
