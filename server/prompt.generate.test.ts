import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

const baseInput = {
  subject: "유리 온실 속 작은 나무",
  style: "",
  motion: "",
  camera: "",
  lighting: "",
  transition: "",
  pacing: "",
  exclude: "",
  directions: "",
};

const imageReference = (order: number) => ({
  id: `image-${order}`,
  type: "image" as const,
  name: `reference-${order}.png`,
  dataUrl: "data:image/png;base64,AA==",
  size: 2_000,
  role: "subject" as const,
  note: "인물 외형 보존",
  order,
});

describe("prompt.generate", () => {
  it("rejects an empty scene description without references", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.prompt.generate({ ...baseInput, subject: "" })).rejects.toThrow();
  });

  it("rejects more than six image references", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.prompt.generate({ ...baseInput, mediaReferences: Array.from({ length: 7 }, (_, index) => imageReference(index + 1)) })).rejects.toThrow();
  });

  it("rejects more than nine total references", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.prompt.generate({ ...baseInput, mediaReferences: Array.from({ length: 10 }, (_, index) => imageReference(index + 1)) })).rejects.toThrow();
  });

  it("rejects video analyses that exceed the detailed sampling safety limit", async () => {
    const caller = appRouter.createCaller(createContext());
    const frames = Array.from({ length: 33 }, (_, index) => ({ timestamp: index, dataUrl: "data:image/jpeg;base64,AA==" }));
    await expect(caller.analysis.video({ meta: { duration: 33, width: 1920, height: 1080, aspectRatio: "16:9" }, frames })).rejects.toThrow();
  });
});


describe("media reference rules", () => {
  it("keeps mixed references in explicit order", async () => {
    const { orderMediaReferences } = await import("../shared/mediaRules");
    const references = [imageReference(3), { ...imageReference(1), id: "video-1", type: "video" as const, role: "motion" as const }];
    expect(orderMediaReferences(references).map((reference) => reference.id)).toEqual(["video-1", "image-3"]);
  });

  it("enforces image and video slot limits", async () => {
    const { validateMediaReferenceCounts } = await import("../shared/mediaRules");
    expect(validateMediaReferenceCounts(Array.from({ length: 7 }, (_, index) => imageReference(index + 1)))).toContain("최대 6개");
    expect(validateMediaReferenceCounts(Array.from({ length: 4 }, (_, index) => ({ ...imageReference(index + 1), id: `video-${index}`, type: "video" as const })))).toContain("최대 3개");
  });

  it("supports adding, replacing, removing, and preserving roles in mixed slots", async () => {
    const { nextMediaOrder, replaceMediaReference, removeMediaReference } = await import("../shared/mediaRules");
    const image = imageReference(1);
    const video = { ...imageReference(2), id: "video-2", type: "video" as const, role: "motion" as const };
    expect(nextMediaOrder([image])).toBe(2);
    const replaced = replaceMediaReference([image, video], image.id, { name: "subject.webp", role: "subject" });
    expect(replaced[0]).toMatchObject({ name: "subject.webp", role: "subject" });
    expect(removeMediaReference(replaced, video.id).map((reference) => reference.order)).toEqual([1]);
  });
});
