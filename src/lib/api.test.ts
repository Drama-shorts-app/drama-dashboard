import { describe, expect, it } from "vitest";

import { buildUploadFormData, toApiError } from "./api";

describe("buildUploadFormData", () => {
  it("keeps every metadata field before the streamed video file", () => {
    const body = buildUploadFormData({
      dramaId: "7a7f2f56-2f06-4cd3-9d54-7f287b2d935e",
      episodeNumber: 7,
      title: "Night train",
      isFree: false,
      coinPrice: 12,
      thumbnailTimeMs: 2500,
      video: new File([new Uint8Array([1, 2])], "episode.webm", { type: "video/webm" }),
    });

    expect([...body.keys()]).toEqual([
      "dramaId",
      "episodeNumber",
      "title",
      "isFree",
      "coinPrice",
      "thumbnailTimeMs",
      "video",
    ]);
  });

  it("omits optional empty fields", () => {
    const body = buildUploadFormData({
      dramaId: "7a7f2f56-2f06-4cd3-9d54-7f287b2d935e",
      episodeNumber: 1,
      title: "",
      isFree: true,
      coinPrice: 0,
      thumbnailTimeMs: null,
      video: new File([new Uint8Array([1])], "episode.mp4", { type: "video/mp4" }),
    });

    expect([...body.keys()]).toEqual([
      "dramaId",
      "episodeNumber",
      "isFree",
      "coinPrice",
      "video",
    ]);
  });
});

describe("toApiError", () => {
  it("preserves safe backend errors", () => {
    const error = toApiError({
      error: { code: "EPISODE_ALREADY_EXISTS", message: "An episode with this number already exists." },
    }, 409);

    expect(error.status).toBe(409);
    expect(error.code).toBe("EPISODE_ALREADY_EXISTS");
    expect(error.message).toContain("already exists");
  });
});
