import { useState, useEffect, useRef } from "react";

interface Props {
  name: string;
  logoUrl: string | null;
  className?: string;
}

/**
 * Renders a guild name whose text color is the average color
 * extracted from the guild's logo image. Falls back to muted-foreground.
 */
export function GuildColorLabel({ name, logoUrl, className = "" }: Props) {
  const [color, setColor] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (!logoUrl || attempted.current) return;
    attempted.current = true;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 32; // sample at small size for speed
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Skip near-white / near-transparent pixels
          if (data[i + 3] < 50) continue;
          if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        if (count > 0) {
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          setColor(`rgb(${r}, ${g}, ${b})`);
        }
      } catch {
        // CORS or canvas error — keep fallback
      }
    };
  }, [logoUrl]);

  return (
    <span
      className={`text-[10px] font-medium truncate ${className}`}
      style={color ? { color } : undefined}
    >
      {name}
    </span>
  );
}
