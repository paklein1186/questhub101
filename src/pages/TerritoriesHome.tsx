/**
 * TerritoriesHome.tsx — Guest-friendly homepage for browsing territories.
 * Route: /territories
 * Features: geocoding search for any location, grid/map toggle, app nav via PageShell.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Search, LayoutGrid, Map, Globe2, Loader2,
  Mountain, ArrowUpDown, Sparkles, Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/PageShell";
import { TerritoryBrowseSection } from "@/components/explore/TerritoryBrowseSection";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/* ── Geocoding search (Nominatim) ── */
interface GeoResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  address?: Record<string, string>;
}

function useGeoSearch(query: string) {
  return useQuery<GeoResult[]>({
    queryKey: ["geo-search", query],
    enabled: query.length >= 3,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8`,
        { headers: { "User-Agent": "changethegame-app" } }
      );
      if (!res.ok) return [];
      return res.json();
    },
  });
}

/* ── Check if location exists in our territories ── */
function useMatchTerritory(name: string | null) {
  return useQuery({
    queryKey: ["match-territory", name],
    enabled: !!name && name.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("territories")
        .select("id, name, slug, level")
        .ilike("name", `%${name}%`)
        .eq("is_deleted", false)
        .limit(5);
      return data ?? [];
    },
  });
}

export default function TerritoriesHome() {
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGeo, setSelectedGeo] = useState<GeoResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: geoResults = [], isLoading: geoLoading } = useGeoSearch(searchQuery);
  const { data: matchedTerritories = [] } = useMatchTerritory(
    selectedGeo?.display_name?.split(",")[0] ?? (searchQuery.length >= 3 ? searchQuery : null)
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.parentElement?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectGeo = useCallback((result: GeoResult) => {
    setSelectedGeo(result);
    setSearchQuery(result.display_name.split(",")[0]);
    setShowDropdown(false);
  }, []);

  const handleNavigateToTerritory = useCallback((slug: string | null, id: string) => {
    navigate(`/territories/${slug ?? id}`);
  }, [navigate]);

  return (
    <div className="space-y-8">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-border p-6 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Globe2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
              Territories
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
            Explore living places across the world. Search for any location — even if it's not yet on the platform, you can pioneer it.
          </p>

          {/* ── Location search with geocoding ── */}
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setSelectedGeo(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search any city, region, country…"
              className="pl-9 h-11 text-sm bg-background/80 backdrop-blur-sm"
            />

            {/* Dropdown results */}
            {showDropdown && searchQuery.length >= 3 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                {/* Matched platform territories */}
                {matchedTerritories.length > 0 && (
                  <div className="p-2 border-b border-border">
                    <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">On the platform</p>
                    {matchedTerritories.map((t: any) => (
                      <button
                        key={t.id}
                        onClick={() => handleNavigateToTerritory(t.slug, t.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-primary/5 text-left transition-colors"
                      >
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.name}</p>
                          <p className="text-[11px] text-muted-foreground">{t.level}</p>
                        </div>
                        <Badge variant="secondary" className="text-[9px]">Explore</Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Geocoding results */}
                {geoLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : geoResults.length > 0 ? (
                  <div className="p-2">
                    <p className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Locations worldwide</p>
                    {geoResults.map(r => {
                      const shortName = r.display_name.split(",")[0];
                      const rest = r.display_name.split(",").slice(1, 3).join(",").trim();
                      return (
                        <button
                          key={r.place_id}
                          onClick={() => handleSelectGeo(r)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 text-left transition-colors"
                        >
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{shortName}</p>
                            {rest && <p className="text-[11px] text-muted-foreground truncate">{rest}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : searchQuery.length >= 3 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No locations found</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Selected location — show "Pioneer" CTA if not on platform */}
          {selectedGeo && matchedTerritories.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl border border-primary/20 bg-primary/5"
            >
              <div className="flex items-start gap-3">
                <Mountain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {selectedGeo.display_name.split(",")[0]} isn't on the platform yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Be the first to pioneer this territory and build its ecological community.
                  </p>
                </div>
                {currentUser.id && (
                  <Button size="sm" className="shrink-0 gap-1.5" asChild>
                    <Link to={`/explore?tab=territories`}>
                      <Sparkles className="h-3.5 w-3.5" /> Pioneer
                    </Link>
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Quick actions */}
          <div className="flex items-center gap-2 mt-4">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
              <Link to="/create/bioregion">
                <Plus className="h-3.5 w-3.5" /> Create Bioregion
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* ── Territory grid/map ── */}
      <TerritoryBrowseSection />
    </div>
  );
}
