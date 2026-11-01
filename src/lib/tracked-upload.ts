import type { EpisodeVideo } from "./api";

const STORAGE_KEY = "drama-dashboard:last-upload:v1";

export function loadTrackedUpload(): EpisodeVideo | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    return isEpisodeVideo(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveTrackedUpload(video: EpisodeVideo | null): void {
  try {
    if (video) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(video));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in strict privacy modes; tracking is optional.
  }
}

function isEpisodeVideo(value: unknown): value is EpisodeVideo {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EpisodeVideo>;
  return typeof candidate.episodeId === "string"
    && typeof candidate.bunnyVideoId === "string"
    && typeof candidate.playbackUrl === "string"
    && Array.isArray(candidate.availableResolutions)
    && ["not_uploaded", "processing", "ready", "failed"].includes(candidate.videoIngestionStatus ?? "");
}
