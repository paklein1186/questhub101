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
  __img?: HTMLImageElement;
  __imgLoaded?: boolean;
  __imgFailed?: boolean;
}

interface FGLink {
  id: string; source: string | FGNode; target: string | FGNode;
  relationType: string; weight: number;
}

// Image cache shared across renders
const imgCache = new Map<string, HTMLImageElement>();

function getOrLoadImage(url: string): HTMLImageElement | null {
  if (imgCache.has(url)) {
    const img = imgCache.get(url)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  imgCache.set(url, img);
  return null;
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
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const hoveredNodeRef = useRef<string | null>(null);

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

  // Preload images when graphData changes
  useEffect(() => {
    for (const node of graphData.nodes) {
      if (node.avatarUrl) getOrLoadImage(node.avatarUrl);
    }
  }, [graphData.nodes]);

  // Adjacency map for hover highlighting
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

  // ─── Node painting with avatar images ────────────────────
  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const style = NODE_STYLES[node.type] || DEFAULT_NODE_STYLE;
      const connections: number = node.__connections || 0;
      const baseSize = node.isCenter
        ? style.size * 1.8
        : style.size * (1 + Math.min(0.6, Math.log2(connections + 1) * 0.15));
      const x = node.x ?? 0;
      const y = node.y ?? 0;

      const isHovered = hoveredNode === node.id;
      const isNeighborOfHovered = hoveredNode ? adjacencyMap.get(hoveredNode)?.has(node.id) : false;
      const isFaded = hoveredNode !== null && !isHovered && !isNeighborOfHovered && !node.isCenter;

      const alpha = isFaded ? 0.12 : 1;
      const size = isHovered ? baseSize * 1.35 : baseSize;

      ctx.globalAlpha = alpha;

      // Try to draw avatar image
      const avatarUrl = node.avatarUrl;
      let img: HTMLImageElement | null = null;
      if (avatarUrl) {
        img = getOrLoadImage(avatarUrl);
      }

      // Glow for center or hovered
      if ((isHovered || node.isCenter) && !isFaded) {
        ctx.save();
        ctx.shadowColor = style.glow;
        ctx.shadowBlur = isHovered ? 20 : 12;
      }

      // Draw shape path (used for clipping image and as fallback fill)
      const drawShapePath = () => {
        ctx.beginPath();
        if (style.shape === "diamond") {
          const s = size * 1.05;
          ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y);
          ctx.closePath();
        } else if (style.shape === "square") {
          drawRoundedRect(ctx, x, y, size * 0.9, size * 0.25);
        } else if (style.shape === "hexagon") {
          drawHexagon(ctx, x, y, size);
        } else {
          ctx.arc(x, y, size, 0, 2 * Math.PI);
        }
      };

      if (img) {
        // Draw colored ring behind image
        drawShapePath();
        ctx.fillStyle = style.color;
        ctx.fill();

        // Clip to shape and draw image
        ctx.save();
        drawShapePath();
        ctx.clip();
        const imgSize = size * 1.8;
        ctx.drawImage(img, x - imgSize / 2, y - imgSize / 2, imgSize, imgSize);
        ctx.restore();

        // Border
        drawShapePath();
        if (node.isCenter) {
          ctx.strokeStyle = `hsla(0, 0%, 100%, ${0.9 * alpha})`;
          ctx.lineWidth = 2.5 / globalScale;
          ctx.stroke();
        } else if (isHovered) {
          ctx.strokeStyle = `hsla(0, 0%, 100%, 0.75)`;
          ctx.lineWidth = 2 / globalScale;
          ctx.stroke();
        } else {
          ctx.strokeStyle = style.color;
          ctx.lineWidth = 1.5 / globalScale;
          ctx.stroke();
        }
      } else {
        // No image: draw filled shape with type icon
        drawShapePath();
        ctx.fillStyle = style.color;
        ctx.fill();

        // Inner highlight
        if (!isFaded) {
          ctx.globalAlpha = 0.2 * alpha;
          const hl = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
          hl.addColorStop(0, "hsla(0, 0%, 100%, 1)");
          hl.addColorStop(1, "hsla(0, 0%, 100%, 0)");
          ctx.fillStyle = hl;
          drawShapePath();
          ctx.fill();
          ctx.globalAlpha = alpha;
        }

        // Type initial letter as fallback
        if (globalScale > 0.5) {
          const iconSize = Math.max(size * 0.9, 3);
          ctx.font = `600 ${iconSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = `hsla(0, 0%, 100%, ${0.85 * alpha})`;
          const initial = (node.name || style.label || "?").charAt(0).toUpperCase();
          ctx.fillText(initial, x, y);
        }

        // Border
        drawShapePath();
        if (node.isCenter) {
          ctx.strokeStyle = `hsla(0, 0%, 100%, ${0.85 * alpha})`;
          ctx.lineWidth = 2 / globalScale;
          ctx.stroke();
        } else if (isHovered) {
          ctx.strokeStyle = `hsla(0, 0%, 100%, 0.6)`;
          ctx.lineWidth = 1.5 / globalScale;
          ctx.stroke();
        }
      }

      if ((isHovered || node.isCenter) && !isFaded) ctx.restore();

      // Label: only on hover or for center node
      const showLabel = isHovered || node.isCenter;
      if (showLabel && !isFaded) {
        const fontSize = Math.max(10 / globalScale, 2.2);
        const weight = "600";
        ctx.font = `${weight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const label = node.name || "";
        const maxLen = 28;
        const display = label.length > maxLen ? label.slice(0, maxLen - 1) + "…" : label;
        const ty = y + size + 3;

        // Type badge
        const typeLabel = style.label;
        const fullDisplay = display;

        // Background pill
        const metrics = ctx.measureText(fullDisplay);
        const pw = metrics.width + 10;
        const ph = fontSize + 5;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "hsla(0, 0%, 6%, 0.9)";
        ctx.beginPath();
        ctx.roundRect(x - pw / 2, ty - 1.5, pw, ph, 4);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = "hsla(0, 0%, 100%, 1)";
        ctx.fillText(fullDisplay, x, ty + 1);

        // Small type label below
        const typeFontSize = Math.max(7 / globalScale, 1.8);
        ctx.font = `400 ${typeFontSize}px -apple-system, sans-serif`;
        ctx.fillStyle = style.color;
        ctx.fillText(typeLabel, x, ty + ph + 1);
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
      return 0.15;
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

  const handleNodeHover = useCallback((node: any, prevNode: any) => {
    const newId = node?.id || null;
    hoveredNodeRef.current = newId;
    setHoveredNode(newId);
    if (containerRef.current) {
      containerRef.current.style.cursor = node ? "pointer" : "grab";
    }
  }, []);

  // Track mouse position for tooltip
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      if (hoveredNodeRef.current) {
        const rect = el.getBoundingClientRect();
        setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        setTooltipPos(null);
      }
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
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

  // Find hovered node data for tooltip
  const hoveredNodeData = hoveredNode ? graphData.nodes.find((n) => n.id === hoveredNode) : null;
  const hoveredStyle = hoveredNodeData ? (NODE_STYLES[hoveredNodeData.type] || DEFAULT_NODE_STYLE) : null;
  const hoveredNeighborCount = hoveredNode ? (adjacencyMap.get(hoveredNode)?.size ?? 0) : 0;

  // Gather edge types for hovered node
  const hoveredEdgeTypes = hoveredNode
    ? [...new Set(graphData.links
        .filter((l) => {
          const s = typeof l.source === "object" ? l.source.id : l.source;
          const t = typeof l.target === "object" ? l.target.id : l.target;
          return s === hoveredNode || t === hoveredNode;
        })
        .map((l) => (EDGE_STYLES[l.relationType] || DEFAULT_EDGE_STYLE).label)
      )]
    : [];

  return (
    <div ref={containerRef} className="w-full relative">
      <GraphFilters
        filters={filters}
        onChange={setFilters}
        nodeCount={graphData.nodes.length}
        edgeCount={graphData.links.length}
      />

      {/* Cursor-following tooltip */}
      {hoveredNodeData && hoveredStyle && tooltipPos && (
        <div
          className="absolute z-50 text-xs bg-popover/95 backdrop-blur-sm text-popover-foreground border border-border rounded-lg px-3 py-2 shadow-lg pointer-events-none max-w-[220px]"
          style={{
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 10,
            transform: tooltipPos.x > containerWidth - 240 ? "translateX(-110%)" : undefined,
          }}
        >
          <div className="flex items-center gap-2">
            {hoveredNodeData.avatarUrl ? (
              <img
                src={hoveredNodeData.avatarUrl}
                alt=""
                className="w-6 h-6 rounded-full object-cover shrink-0 border"
                style={{ borderColor: hoveredStyle.color }}
              />
            ) : (
              <span
                className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: hoveredStyle.color }}
              >
                {(hoveredNodeData.name || "?").charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <div className="font-semibold truncate">{hoveredNodeData.name}</div>
              <div className="text-[10px] text-muted-foreground">
                {hoveredStyle.label} · {hoveredNeighborCount} connections
              </div>
            </div>
          </div>
          {hoveredEdgeTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {hoveredEdgeTypes.map((et) => (
                <span key={et} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">{et}</span>
              ))}
            </div>
          )}
          <div className="text-[9px] text-muted-foreground mt-1 opacity-60">Click to open</div>
        </div>
      )}

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
          linkCurvature={0.15}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
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
