import { useState, useCallback } from "react";

export type GridDensity = "3" | "4";

const STORAGE_KEY = "explore-grid-density";

function getInitial(): GridDensity {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "3" || v === "4") return v;
  } catch {}
  return "3";
}

export function useGridDensity() {
  const [density, setDensityRaw] = useState<GridDensity>(getInitial);

  const setDensity = useCallback((d: GridDensity) => {
    setDensityRaw(d);
    try { localStorage.setItem(STORAGE_KEY, d); } catch {}
  }, []);

  const gridClassName = density === "4"
    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

  return { density, setDensity, gridClassName };
}
