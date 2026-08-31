import type { MediaReference } from "./media";

export const MAX_IMAGE_REFERENCES = 6;
export const MAX_VIDEO_REFERENCES = 3;

export function orderMediaReferences(references: MediaReference[]): MediaReference[] {
  return [...references].sort((a, b) => a.order - b.order);
}

export function nextMediaOrder(references: MediaReference[]): number {
  return references.reduce((highest, reference) => Math.max(highest, reference.order), 0) + 1;
}

export function replaceMediaReference(references: MediaReference[], id: string, patch: Partial<MediaReference>): MediaReference[] {
  return references.map((reference) => reference.id === id ? { ...reference, ...patch } : reference);
}

export function removeMediaReference(references: MediaReference[], id: string): MediaReference[] {
  return orderMediaReferences(references.filter((reference) => reference.id !== id)).map((reference, index) => ({ ...reference, order: index + 1 }));
}

export function validateMediaReferenceCounts(references: MediaReference[]): string | null {
  const imageCount = references.filter((reference) => reference.type === "image").length;
  const videoCount = references.filter((reference) => reference.type === "video").length;
  if (imageCount > MAX_IMAGE_REFERENCES) return `이미지 참조는 최대 ${MAX_IMAGE_REFERENCES}개까지 사용할 수 있습니다.`;
  if (videoCount > MAX_VIDEO_REFERENCES) return `영상 참조는 최대 ${MAX_VIDEO_REFERENCES}개까지 사용할 수 있습니다.`;
  return null;
}
