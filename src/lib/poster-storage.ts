import { supabase } from "./supabase";

const POSTER_BUCKET = "drama-posters";
const MAX_POSTER_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function uploadDramaPoster(file: File, dramaId: string): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase is not configured for poster uploads.");
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Posters must be JPG, PNG, or WebP images.");
  }
  if (file.size > MAX_POSTER_BYTES) {
    throw new Error("Posters must be 5 MB or smaller.");
  }

  const extension = file.type === "image/jpeg" ? "jpg" : file.type === "image/png" ? "png" : "webp";
  const path = `dramas/${dramaId}/poster.${extension}`;
  const { error } = await supabase.storage.from(POSTER_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });
  if (error) throw error;

  return supabase.storage.from(POSTER_BUCKET).getPublicUrl(path).data.publicUrl;
}
