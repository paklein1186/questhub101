/** Helpers for detecting video providers and building embed URLs */

export interface VideoInfo {
  provider: "YOUTUBE" | "VIMEO";
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string;
}

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/;

export function parseVideoUrl(url: string): VideoInfo | null {
  for (const pat of YOUTUBE_PATTERNS) {
    const m = url.match(pat);
    if (m?.[1]) {
      return {
        provider: "YOUTUBE",
        videoId: m[1],
        embedUrl: `https://www.youtube-nocookie.com/embed/${m[1]}`,
        thumbnailUrl: `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg`,
      };
    }
  }

  const vm = url.match(VIMEO_PATTERN);
  if (vm?.[1]) {
    return {
      provider: "VIMEO",
      videoId: vm[1],
      embedUrl: `https://player.vimeo.com/video/${vm[1]}`,
      thumbnailUrl: "", // Vimeo thumbnails require API call
    };
  }

  return null;
}

export function isImageFile(mimeType: string): boolean {
  return /^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/i.test(mimeType);
}

export function isDocumentFile(mimeType: string): boolean {
  const docTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ];
  return docTypes.includes(mimeType);
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_ATTACHMENTS_PER_POST = 10;
export const MAX_LINKS_PER_POST = 1;

export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/gif";
export const ACCEPTED_DOC_TYPES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
