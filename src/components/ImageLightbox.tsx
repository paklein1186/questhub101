import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, X } from "lucide-react";

interface ImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

const ImageLightbox = ({ src, alt = "Image", onClose }: ImageLightboxProps) => {
  if (!src) return null;

  const handleDownload = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = alt || "image";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(src, "_blank");
    }
  };

  return (
    <Dialog open={!!src} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 border-none bg-transparent shadow-none overflow-hidden [&>button]:hidden">
        <div className="relative flex items-center justify-center">
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <button
              onClick={handleDownload}
              className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
              aria-label="Download"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageLightbox;
