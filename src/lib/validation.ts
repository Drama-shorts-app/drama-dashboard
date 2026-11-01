export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SUPPORTED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);

export type UploadDraft = {
  dramaId: string;
  episodeNumber: string;
  title: string;
  isFree: boolean;
  coinPrice: string;
  thumbnailTimeSeconds: string;
  video: File | null;
};

export type UploadField = keyof UploadDraft;
export type UploadErrors = Partial<Record<UploadField, string>>;

export type ValidUpload = {
  dramaId: string;
  episodeNumber: number;
  title: string;
  isFree: boolean;
  coinPrice: number;
  thumbnailTimeMs: number | null;
  video: File;
};

export function validateVideoFile(file: File): string | null {
  if (!SUPPORTED_VIDEO_TYPES.has(file.type.toLowerCase())) {
    return "Use an MP4, MOV, WebM, or MKV video.";
  }
  if (file.size === 0) {
    return "This file is empty. Choose a video that contains data.";
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return "This video is larger than 2 GiB. Choose a smaller file.";
  }
  return null;
}

export function validateUploadDraft(
  draft: UploadDraft,
): { errors: UploadErrors; value: ValidUpload | null } {
  const errors: UploadErrors = {};
  const dramaId = draft.dramaId.trim();
  const title = draft.title.trim();
  const episodeNumber = Number(draft.episodeNumber);
  const coinPrice = Number(draft.coinPrice);
  const thumbnailTimeSeconds = draft.thumbnailTimeSeconds.trim() === ""
    ? null
    : Number(draft.thumbnailTimeSeconds);

  if (!UUID_PATTERN.test(dramaId)) {
    errors.dramaId = "Enter the drama UUID from the API or database.";
  }
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1 || episodeNumber > 100_000) {
    errors.episodeNumber = "Use a whole episode number from 1 to 100,000.";
  }
  if (title.length > 200) {
    errors.title = "Keep the title to 200 characters or fewer.";
  }
  if (
    !Number.isInteger(coinPrice)
    || coinPrice < (draft.isFree ? 0 : 1)
    || coinPrice > 1_000_000_000
  ) {
    errors.coinPrice = draft.isFree
      ? "Free episodes must use a coin price of 0."
      : "Paid episodes need a whole coin price of 1 or more.";
  } else if (draft.isFree && coinPrice !== 0) {
    errors.coinPrice = "Free episodes must use a coin price of 0.";
  }
  if (
    thumbnailTimeSeconds !== null
    && (!Number.isFinite(thumbnailTimeSeconds)
      || thumbnailTimeSeconds < 0
      || thumbnailTimeSeconds > 2_147_483.647)
  ) {
    errors.thumbnailTimeSeconds = "Use a timestamp from 0 to 2,147,483.647 seconds.";
  }
  if (!draft.video) {
    errors.video = "Choose one video to upload.";
  } else {
    const videoError = validateVideoFile(draft.video);
    if (videoError) errors.video = videoError;
  }

  if (Object.keys(errors).length > 0 || !draft.video) {
    return { errors, value: null };
  }

  return {
    errors,
    value: {
      dramaId,
      episodeNumber,
      title,
      isFree: draft.isFree,
      coinPrice,
      thumbnailTimeMs: thumbnailTimeSeconds === null
        ? null
        : Math.round(thumbnailTimeSeconds * 1000),
      video: draft.video,
    },
  };
}
