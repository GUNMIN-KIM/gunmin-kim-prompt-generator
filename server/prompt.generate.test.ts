import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("prompt.generate", () => {
  it("rejects an empty scene description before calling the model", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.prompt.generate({
      subject: "",
      style: "",
      composition: "",
      lighting: "",
      exclude: "",
      directions: "",
    })).rejects.toThrow();
  });

  it("rejects unsupported reference image payloads over the limit", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.prompt.generate({
      subject: "유리 온실 속 작은 나무",
      style: "",
      composition: "",
      lighting: "",
      exclude: "",
      directions: "",
      referenceImage: "x".repeat(4_500_001),
    })).rejects.toThrow();
  });
});
