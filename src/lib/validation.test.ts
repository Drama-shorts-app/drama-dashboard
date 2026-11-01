import { describe, expect, it } from "vitest";

import { validateUploadDraft, validateVideoFile, type UploadDraft } from "./validation";

const video = new File([new Uint8Array([1, 2, 3])], "episode.mp4", { type: "video/mp4" });

function draft(overrides: Partial<UploadDraft> = {}): UploadDraft {
  return {
    dramaId: "7a7f2f56-2f06-4cd3-9d54-7f287b2d935e",
    episodeNumber: "12",
    title: "The arrival",
    isFree: false,
    coinPrice: "18",
    thumbnailTimeSeconds: "3.5",
    video,
    ...overrides,
  };
}

describe("validateUploadDraft", () => {
  it("normalizes a paid episode and converts thumbnail seconds to milliseconds", () => {
    const result = validateUploadDraft(draft());

    expect(result.errors).toEqual({});
    expect(result.value).toMatchObject({
      episodeNumber: 12,
      coinPrice: 18,
      thumbnailTimeMs: 3500,
      isFree: false,
    });
  });

  it("requires a zero coin price for a free episode", () => {
    const result = validateUploadDraft(draft({ isFree: true, coinPrice: "5" }));

    expect(result.value).toBeNull();
    expect(result.errors.coinPrice).toContain("0");
  });

  it("reports invalid identifiers, episode numbers, and missing files", () => {
    const result = validateUploadDraft(draft({
      dramaId: "not-a-uuid",
      episodeNumber: "0",
      video: null,
    }));

    expect(result.value).toBeNull();
    expect(result.errors).toMatchObject({
      dramaId: expect.any(String),
      episodeNumber: expect.any(String),
      video: expect.any(String),
    });
  });
});

describe("validateVideoFile", () => {
  it("rejects file types the backend does not accept", () => {
    const invalid = new File([new Uint8Array([1])], "episode.avi", { type: "video/x-msvideo" });
    expect(validateVideoFile(invalid)).toContain("MP4");
  });
});
