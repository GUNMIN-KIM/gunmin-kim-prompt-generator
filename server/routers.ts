import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const promptInput = z.object({
  subject: z.string().min(1).max(4000),
  style: z.string().max(600),
  motion: z.string().max(600),
  camera: z.string().max(600),
  lighting: z.string().max(600),
  transition: z.string().max(600),
  pacing: z.string().max(600),
  exclude: z.string().max(1200),
  directions: z.string().max(1200),
  referenceImage: z.string().max(4_500_000).optional(),
});

const promptOutputSchema = {
  type: "object",
  properties: {
    prompt: { type: "string", description: "자연스럽고 구체적인 한국어 비디오 생성 프롬프트" },
    negativePrompt: { type: "string", description: "피해야 할 영상 결함과 원치 않는 요소를 쉼표로 구분한 문장" },
    suggestions: { type: "array", items: { type: "string" }, description: "움직임·카메라·시간 흐름을 보완하는 제안 3개" },
    controlNotes: { type: "array", items: { type: "string" }, description: "영상 제어에 반영된 핵심 움직임·카메라·템포 3개" },
  },
  required: ["prompt", "negativePrompt", "suggestions", "controlNotes"],
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
        `만들고 싶은 비디오 장면: ${input.subject}`,
        `스타일: ${input.style || "미지정 — 장면에 가장 어울리는 영상 스타일을 제안"}`,
        `움직임: ${input.motion || "미지정 — 피사체와 환경의 자연스러운 움직임을 제안"}`,
        `카메라: ${input.camera || "미지정 — 장면에 맞는 카메라 이동을 제안"}`,
        `조명: ${input.lighting || "미지정 — 시간의 흐름에 어울리는 조명을 제안"}`,
        `전환: ${input.transition || "미지정 — 장면 사이의 안정적인 연결을 제안"}`,
        `속도와 리듬: ${input.pacing || "미지정 — 영상의 감정 곡선에 맞는 템포를 제안"}`,
        `제외 요소: ${input.exclude || "특별한 제외 요소 없음"}`,
        `추가 지시: ${input.directions || "없음"}`,
      ].join("\n");
      const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "auto" } }> = [
        { type: "text", text: `${detailLines}\n\n이 정보를 바탕으로 영상 모델이 바로 이해할 수 있는 자연스러운 비디오 프롬프트를 디렉터처럼 다듬어 주세요. 피사체의 동선, 카메라의 시간적 움직임, 장면 전환과 연속성을 구체적으로 보완하세요.` },
      ];
      if (input.referenceImage) content.push({ type: "image_url", image_url: { url: input.referenceImage, detail: "auto" } });

      const response = await invokeLLM({
        model: "gemini-3-flash-preview",
        messages: [
          { role: "system", content: "당신은 영상 디렉터이자 비디오 생성 프롬프트 에디터입니다. 한국어로 답하고 추상적인 표현보다 피사체의 동선·속도·카메라 움직임·렌즈·빛·전환·시간적 연속성을 구체적으로 보완합니다. 참조 이미지가 있으면 영상의 첫 프레임과 무드에 활용할 시각적 특징을 안전하게 묘사하되 인물을 식별하거나 추측하지 않습니다. JSON만 출력합니다." },
          { role: "user", content },
        ],
        response_format: { type: "json_schema", json_schema: { name: "video_prompt_result", strict: true, schema: promptOutputSchema } },
      });
      const raw = response.choices?.[0]?.message?.content;
      if (typeof raw !== "string") throw new Error("AI 응답을 읽을 수 없습니다.");
      return JSON.parse(raw) as { prompt: string; negativePrompt: string; suggestions: string[]; controlNotes: string[] };
    }),
  }),
});

export type AppRouter = typeof appRouter;
