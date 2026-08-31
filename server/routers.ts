import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const promptInput = z.object({
  subject: z.string().min(1).max(4000),
  style: z.string().max(600),
  composition: z.string().max(600),
  lighting: z.string().max(600),
  exclude: z.string().max(1200),
  directions: z.string().max(1200),
  referenceImage: z.string().max(4_500_000).optional(),
});

const promptOutputSchema = {
  type: "object",
  properties: {
    prompt: { type: "string", description: "자연스럽고 구체적인 한국어 이미지 생성 프롬프트" },
    negativePrompt: { type: "string", description: "제외해야 할 시각적 요소를 쉼표로 구분한 문장" },
    suggestions: { type: "array", items: { type: "string" }, description: "누락된 시각 요소를 보완하는 제안 3개" },
    visualNotes: { type: "array", items: { type: "string" }, description: "프롬프트에 반영된 핵심 시각 요소 3개" },
  },
  required: ["prompt", "negativePrompt", "suggestions", "visualNotes"],
  additionalProperties: false,
} as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  prompt: router({
    generate: publicProcedure.input(promptInput).mutation(async ({ input }) => {
      const detailLines = [
        `만들고 싶은 장면: ${input.subject}`,
        `스타일: ${input.style || "미지정 — 장면에 가장 어울리는 스타일을 제안"}`,
        `구도: ${input.composition || "미지정 — 안정적인 카메라 구도를 제안"}`,
        `조명: ${input.lighting || "미지정 — 장면의 감정에 맞는 조명을 제안"}`,
        `제외 요소: ${input.exclude || "특별한 제외 요소 없음"}`,
        `추가 지시: ${input.directions || "없음"}`,
      ].join("\n");
      const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "auto" } }> = [
        { type: "text", text: `${detailLines}\n\n이 정보를 바탕으로 이미지 모델이 바로 이해할 수 있는 자연스러운 프롬프트를 큐레이터처럼 다듬어 주세요.` },
      ];
      if (input.referenceImage) content.push({ type: "image_url", image_url: { url: input.referenceImage, detail: "auto" } });

      const response = await invokeLLM({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: "당신은 시각 디렉터이자 이미지 생성 프롬프트 에디터입니다. 한국어로 답하고, 추상적인 표현보다 피사체·재질·공간·카메라·빛·색·분위기를 구체적으로 보완합니다. 참조 이미지가 있으면 보이는 시각적 특징을 안전하게 묘사하되 인물을 식별하거나 추측하지 않습니다. JSON만 출력합니다." },
          { role: "user", content },
        ],
        response_format: { type: "json_schema", json_schema: { name: "prompt_result", strict: true, schema: promptOutputSchema } },
      });
      const raw = response.choices?.[0]?.message?.content;
      if (typeof raw !== "string") throw new Error("AI 응답을 읽을 수 없습니다.");
      return JSON.parse(raw) as { prompt: string; negativePrompt: string; suggestions: string[]; visualNotes: string[] };
    }),
  }),
});

export type AppRouter = typeof appRouter;
