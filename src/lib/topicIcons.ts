import {
  Brain,
  Palette,
  Mountain,
  Leaf,
  Users,
  Network,
  HeartHandshake,
  Zap,
  Landmark,
  Stethoscope,
  Mic2,
  Gem,
  Sun,
  Drama,
  TreePine,
  Sparkles,
  Building,
  Banknote,
  Newspaper,
  Sprout,
  GraduationCap,
  Lightbulb,
  BarChart3,
  BookOpen,
  Wheat,
  TrendingUp,
  PartyPopper,
  Globe,
  Bitcoin,
  Bug,
  MapPinned,
  DoorOpen,
  Droplets,
  type LucideIcon,
  Hash,
  Music,
  Footprints,
  PenTool,
  Tent,
} from "lucide-react";

/**
 * Maps topic/house slugs to Lucide icons for display on pages and tiles.
 */
const TOPIC_ICON_MAP: Record<string, LucideIcon> = {
  // ── Impact Topics ──
  "ai": Brain,
  "arts-culture": Palette,
  "bioregions": Mountain,
  "carbon-capture": Leaf,
  "commons-dao": Users,
  "complex-systems": Network,
  "csr": HeartHandshake,
  "energy": Zap,
  "governance": Landmark,
  "healthcare": Stethoscope,
  "hosting-facilitation": Mic2,
  "impact-real-estate": Building,
  "investments-philanthropy": Banknote,
  "journalism-medias": Newspaper,
  "land-regeneration": Sprout,
  "leadership": GraduationCap,
  "metrics": BarChart3,
  "narratives-storytelling": BookOpen,
  "new-agriculture": Wheat,
  "new-economic-models": TrendingUp,
  "new-gatherings": PartyPopper,
  "open-data-technology": Globe,
  "regenerative-crypto": Bitcoin,
  "symbiotic-living": Bug,
  "territorial-innovation": MapPinned,
  "third-spaces": DoorOpen,
  "transformative-education": Lightbulb,
  "water-soils": Droplets,

  // ── Creative Houses ──
  "house-of-light": Sun,
  "house-of-sound": Music,
  "house-of-story": Drama,
  "house-of-movement": Footprints,
  "house-of-form": PenTool,
  "house-of-nature": TreePine,
  "house-of-ritual": Tent,
};

/**
 * Get the Lucide icon component for a topic/house by slug.
 * Falls back to Hash for unknown slugs.
 */
export function getTopicIcon(slug: string): LucideIcon {
  return TOPIC_ICON_MAP[slug] ?? Hash;
}
