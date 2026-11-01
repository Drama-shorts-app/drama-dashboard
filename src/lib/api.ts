import type { ValidUpload } from "./validation";

export type VideoIngestionStatus = "not_uploaded" | "processing" | "ready" | "failed";

export type EpisodeVideo = {
  episodeId: string;
  bunnyVideoId: string;
  videoIngestionStatus: VideoIngestionStatus;
  thumbnailFilename: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  availableResolutions: string[];
  playbackUrl: string;
  thumbnailUrl: string | null;
};

type EpisodeVideoEnvelope = { data: EpisodeVideo };
type ErrorEnvelope = { error?: { code?: string; message?: string } };

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type UploadEpisodeOptions = {
  apiUrl: string;
  accessToken: string;
  upload: ValidUpload;
  onProgress: (progress: number | null) => void;
  signal?: AbortSignal;
};

export function buildUploadFormData(upload: ValidUpload): FormData {
  const body = new FormData();
  body.append("dramaId", upload.dramaId);
  body.append("episodeNumber", String(upload.episodeNumber));
  if (upload.title) body.append("title", upload.title);
  body.append("isFree", String(upload.isFree));
  body.append("coinPrice", String(upload.coinPrice));
  if (upload.thumbnailTimeMs !== null) {
    body.append("thumbnailTimeMs", String(upload.thumbnailTimeMs));
  }
  // The backend streams the first file immediately, so the video must remain last.
  body.append("video", upload.video, upload.video.name);
  return body;
}

export function uploadEpisode({
  apiUrl,
  accessToken,
  upload,
  onProgress,
  signal,
}: UploadEpisodeOptions): Promise<EpisodeVideo> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();

    request.open("POST", `${apiUrl}/v1/admin/episodes/upload`);
    request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    request.setRequestHeader("Accept", "application/json");

    request.upload.addEventListener("progress", (event) => {
      onProgress(event.lengthComputable ? Math.round((event.loaded / event.total) * 100) : null);
    });
    request.addEventListener("load", () => {
      signal?.removeEventListener("abort", abort);
      const payload = readJson(request.responseText);
      if (request.status >= 200 && request.status < 300) {
        resolve((payload as EpisodeVideoEnvelope).data);
        return;
      }
      reject(toApiError(payload, request.status));
    });
    request.addEventListener("error", () => {
      signal?.removeEventListener("abort", abort);
      reject(new ApiError("The upload could not reach the Drama API. Check the API URL and CORS settings, then try again.", 0, "NETWORK_ERROR"));
    });
    request.addEventListener("abort", () => {
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("The upload was cancelled.", "AbortError"));
    });

    signal?.addEventListener("abort", abort, { once: true });
    request.send(buildUploadFormData(upload));
  });
}

export async function getEpisodeVideoStatus(
  apiUrl: string,
  episodeId: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<EpisodeVideo> {
  const response = await fetch(
    `${apiUrl}/v1/admin/episodes/${encodeURIComponent(episodeId)}/video-status`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    },
  );
  const payload = await response.json().catch(() => null) as unknown;
  if (!response.ok) throw toApiError(payload, response.status);
  return (payload as EpisodeVideoEnvelope).data;
}

function readJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function toApiError(payload: unknown, status: number): ApiError {
  const envelope = payload && typeof payload === "object" ? payload as ErrorEnvelope : null;
  const message = envelope?.error?.message?.trim();
  const code = envelope?.error?.code?.trim();
  return new ApiError(
    message || "The Drama API returned an unreadable response. Try again.",
    status,
    code || "UNKNOWN_API_ERROR",
  );
}
