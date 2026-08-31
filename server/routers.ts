import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const inputModes = ["text", "image", "video"] as const;
const outputModes = ["new_video", "reference_recreation", "source_edit", "vfx_overlay"] as const;
const modelPresets = ["general", "seedance", "kling", "veo", "hailuo"] as const;
const outputLengths = ["short", "standard", "detailed"] as const;

const timelineItemInput = z.object({
  time: z.string().min(1).max(60),
  description: z.string().min(1).max(1_000),
});

const videoFrameInput = z.object({
  timestamp: z.number().min(0).max(60 * 60),
  dataUrl: z.string().startsWith("data:image/").max(1_500_000),
});

const videoMetaInput = z.object({
  duration: z.number().min(0.1).max(60 * 60),
  width: z.number().int().min(1).max(10_000),
  height: z.number().int().min(1).max(10_000),
  aspectRatio: z.string().min(1).max(30),
});

const mediaReferenceInput = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(["image", "video"]),
  name: z.string().min(1).max(255),
  dataUrl: z.string().startsWith("data:").max(4_500_000).optional(),
  size: z.number().int().min(0).max(250 * 1024 * 1024),
  role: z.enum(["subject", "background", "outfit", "prop", "lighting", "motion", "camera", "first_frame", "last_frame", "fx"]),
  note: z.string().max(600).default(""),
  order: z.number().int().min(1).max(9),
  analysis: z.string().max(3_000).optional(),
  meta: videoMetaInput.optional(),
  frames: z.array(videoFrameInput).max(32).optional(),
});

const promptInput = z.object({
  subject: z.string().min(1).max(4_000),
  style: z.string().max(600),
  motion: z.string().max(600),
  camera: z.string().max(600),
  lighting: z.string().max(600),
  transition: z.string().max(600),
  pacing: z.string().max(600),
  exclude: z.string().max(1_200),
  directions: z.string().max(1_200),
  mediaReferences: z.array(mediaReferenceInput).max(9).default([]),
  inputMode: z.enum(inputModes).default("text"),
  outputMode: z.enum(outputModes).default("new_video"),
  modelPreset: z.enum(modelPresets).default("general"),
  outputLength: z.enum(outputLengths).default("standard"),
  analysisNotes: z.string().max(6_000).default(""),
  timeline: z.array(timelineItemInput).max(12).default([]),
}).superRefine(({ mediaReferences }, ctx) => {
  const imageCount = mediaReferences.filter((reference) => reference.type === "image").length;
  const videoCount = mediaReferences.filter((reference) => reference.type === "video").length;
  const totalBytes = mediaReferences.reduce((sum, reference) => sum + reference.size, 0);
  if (imageCount > 6) ctx.addIssue({ code: "custom", path: ["mediaReferences"], message: "이미지 참조는 최대 6개까지 사용할 수 있습니다." });
  if (videoCount > 3) ctx.addIssue({ code: "custom", path: ["mediaReferences"], message: "영상 참조는 최대 3개까지 사용할 수 있습니다." });
  if (totalBytes > 250 * 1024 * 1024) ctx.addIssue({ code: "custom", path: ["mediaReferences"], message: "멀티 참조 전체 용량이 너무 큽니다." });
});

const imageAnalysisInput = z.object({
  imageDataUrl: z.string().startsWith("data:image/").max(4_500_000),
});

const videoAnalysisInput = z.object({
  meta: videoMetaInput,
  frames: z.array(videoFrameInput).min(2).max(32),
}).superRefine(({ frames }, ctx) => {
  const totalSize = frames.reduce((sum, frame) => sum + frame.dataUrl.length, 0);
  if (totalSize > 42_000_000) {
    ctx.addIssue({ code: "custom", message: "추출된 프레임이 너무 큽니다. Fast 또는 Standard 샘플링으로 다시 분석해 주세요." });
  }
});

const visualAnalysisSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    fields: {
      type: "object",
      properties: {
        subject: { type: "string" },
        style: { type: "string" },
        motion: { type: "string" },
        camera: { type: "string" },
        lighting: { type: "string" },
        pacing: { type: "string" },
      },
      required: ["subject", "style", "motion", "camera", "lighting", "pacing"],
      additionalProperties: false,
    },
    scene: { type: "string" },
    person: { type: "string" },
    composition: { type: "string" },
    action: { type: "string" },
    colorMood: { type: "string" },
    timeline: {
      type: "array",
      items: {
        type: "object",
        properties: { time: { type: "string" }, description: { type: "string" } },
        required: ["time", "description"],
        additionalProperties: false,
      },
    },
    preservationNotes: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "fields", "scene", "person", "composition", "action", "colorMood", "timeline", "preservationNotes"],
  additionalProperties: false,
} as const;

const integratedAnalysisSchema = {
  type: "object",
  properties: {
    summary: { type: "string" },
    priorityOrder: { type: "array", items: { type: "string" } },
    conflicts: { type: "array", items: { type: "string" } },
    synthesisNotes: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "priorityOrder", "conflicts", "synthesisNotes"],
  additionalProperties: false,
} as const;

const promptOutputSchema = {
  type: "object",
  properties: {
    prompt: { type: "string", description: "선택한 모델과 출력 모드에 맞춘 자연스럽고 구체적인 한국어 비디오 프롬프트" },
    negativePrompt: { type: "string", description: "피해야 할 영상 결함과 원치 않는 요소를 쉼표로 구분한 문장" },
    suggestions: { type: "array", items: { type: "string" }, description: "움직임·카메라·시간 흐름을 보완하는 제안 3개" },
    controlNotes: { type: "array", items: { type: "string" }, description: "영상 제어에 반영된 핵심 움직임·카메라·템포 3개" },
    analysisSummary: { type: "string", description: "참조 이미지 또는 영상 분석을 최종 프롬프트에 반영한 짧은 요약" },
    timeline: { type: "array", items: { type: "string" }, description: "영상 기반일 때 유지하거나 생성할 시간축 핵심 흐름" },
    preservationNotes: { type: "array", items: { type: "string" }, description: "원본 영상 편집 또는 VFX 덧방에서 보존해야 할 요소" },
  },
  required: ["prompt", "negativePrompt", "suggestions", "controlNotes", "analysisSummary", "timeline", "preservationNotes"],
  additionalProperties: false,
} as const;

type AnalysisResult = {
  summary: string;
  fields: { subject: string; style: string; motion: string; camera: string; lighting: string; pacing: string };
  scene: string;
  person: string;
  composition: string;
  action: string;
  colorMood: string;
  timeline: Array<{ time: string; description: string }>;
  preservationNotes: string[];
};

function readJson<T>(response: { choices?: Array<{ message?: { content?: unknown } }> }): T {
  const raw = response.choices?.[0]?.message?.content;
  if (typeof raw !== "string") throw new Error("AI 응답을 읽을 수 없습니다.");
  return JSON.parse(raw) as T;
}

function presetInstruction(model: (typeof modelPresets)[number]): string {
  const instructions: Record<(typeof modelPresets)[number], string> = {
    general: "장면, 피사체, 액션, 카메라, 조명, 품질 제약을 균형 잡힌 하나의 제작용 프롬프트로 구성합니다.",
    seedance: "시간대별 장면 전개를 분명히 하고, 각 구간의 주체·행동·카메라를 짧고 연속적인 샷 언어로 정렬합니다. 프레임 간 일관성 제약을 명시합니다.",
    kling: "피사체의 행동 순서, 렌즈 관점, 카메라 동작, 물리적으로 자연스러운 모션을 선명한 명령형 문장으로 우선합니다. 장면마다 카메라 주동작은 하나만 둡니다.",
    veo: "시네마틱한 장면 설정, 행동의 원인과 결과, 명확한 시간 전개, 촬영 의도, 분위기와 환경음을 포함하는 서술형 프롬프트로 구성합니다.",
    hailuo: "핵심 피사체, 단일 행동 흐름, 시각 스타일, 카메라와 조명을 간결하고 직접적인 문장으로 우선 배치하고 불필요한 추상어는 줄입니다.",
  };
  return instructions[model];
}

function outputModeInstruction(mode: (typeof outputModes)[number]): string {
  const instructions: Record<(typeof outputModes)[number], string> = {
    new_video: "새 영상을 생성합니다. 분석된 시각 언어는 참고하되 장면 전체를 새로 생성할 수 있습니다.",
    reference_recreation: "레퍼런스의 장면 구성, 색감, 조명, 카메라 리듬을 재현하되, 사용자가 지정한 새 주제와 지시를 우선합니다.",
    source_edit: "원본 영상을 편집합니다. 원본의 시간적 흐름, 주체의 동선, 구도, 카메라 움직임을 유지하면서 사용자가 지시한 변경만 자연스럽게 적용합니다.",
    vfx_overlay: "VFX 덧방입니다. 사용자가 지정한 대상 이외에는 원본 인물의 식별 가능한 외형과 얼굴 특징, 헤어·의상·체형, 표정과 연기, 모션 궤적, 카메라 움직임, 프레이밍, 조명 연속성, 수정하지 않는 배경 영역을 최우선으로 보존합니다. 변경 효과는 대상 영역에만 공간적으로 한정하고, 원근·그림자·반사광·파편·연기·가림 관계를 원본 장면과 자연스럽게 합성합니다.",
  };
  return instructions[mode];
}

function lengthInstruction(length: (typeof outputLengths)[number]): string {
  if (length === "short") return "최종 프롬프트는 핵심 제작 지시만 담아 3~5문장으로 작성합니다.";
  if (length === "detailed") return "최종 프롬프트는 장면, 시간 흐름, 카메라, 조명, 연속성, 품질 제약을 빠짐없이 담은 10~16문장으로 작성합니다.";
  return "최종 프롬프트는 실무에서 바로 쓸 수 있도록 6~10문장으로 작성합니다.";
}

function modeLabel(mode: (typeof outputModes)[number]) {
  return ({ new_video: "새 영상 생성", reference_recreation: "레퍼런스 재현", source_edit: "원본 영상 편집", vfx_overlay: "VFX 덧방" } as const)[mode];
}

function modelLabel(model: (typeof modelPresets)[number]) {
  return ({ general: "General", seedance: "Seedance", kling: "Kling", veo: "Veo", hailuo: "Hailuo" } as const)[model];
}

const mediaSystemInstruction = "당신은 Gemini Vision 기반의 영상·이미지 분석가입니다. 보이는 사실만 한국어로 기술합니다. 실제 인물의 신원, 이름, 민감한 속성은 식별하거나 추측하지 마세요. 대신 외형, 의상, 동작, 표정, 공간 관계처럼 프롬프트 제작에 필요한 시각적 특성은 구체적으로 묘사합니다. 응답은 지정된 JSON 형식만 사용합니다.";

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
  analysis: router({
    image: publicProcedure.input(imageAnalysisInput).mutation(async ({ input }) => {
      const response = await invokeLLM({
        model: "gemini-3-flash-preview",
        max_tokens: 4_000,
        messages: [
          { role: "system", content: mediaSystemInstruction },
          {
            role: "user",
            content: [
              { type: "text", text: "이 이미지를 비디오 프롬프트 제작 관점에서 분석하세요. 장면, 인물 또는 피사체의 시각적 특징, 스타일, 카메라 관점, 조명, 구도, 액션, 색감과 무드를 읽고, fields에는 기존 입력폼에 자동 반영할 짧고 편집 가능한 한국어 문구를 넣으세요. timeline은 정지 이미지이므로 빈 배열로 반환합니다. preservationNotes에는 이 이미지를 레퍼런스로 재현하거나 편집할 때 유지할 시각 요소를 3개 작성하세요." },
              { type: "image_url", image_url: { url: input.imageDataUrl, detail: "high" } },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: { name: "image_visual_analysis", strict: true, schema: visualAnalysisSchema } },
      });
      return readJson<AnalysisResult>(response);
    }),
    integrated: publicProcedure.input(z.object({
      subject: z.string().max(4_000).default(""),
      mediaReferences: z.array(mediaReferenceInput).min(1).max(9),
    })).mutation(async ({ input }) => {
      const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "auto" } }> = [{ type: "text", text: `사용자 장면 설명: ${input.subject || "없음"}\n모든 참조를 하나의 비디오 설계로 통합 분석하세요. 각 참조의 role과 order를 지키고, 충돌 시 subject/background/outfit 같은 시각 보존 참조를 우선한 뒤 motion/camera/lighting 참조를 움직임 규칙으로 정리하세요. 가장 먼저 들어온 참조를 primary reference로 보고, 사용자 note와 개별 분석을 근거로 예외를 명시하세요.` }];
      [...input.mediaReferences].sort((a, b) => a.order - b.order).forEach((reference) => {
        content.push({ type: "text", text: `${reference.type === "image" ? "Image" : "Video"} ${reference.order} | role=${reference.role} | note=${reference.note || "없음"} | analysis=${reference.analysis || "없음"}` });
        if (reference.type === "image" && reference.dataUrl) content.push({ type: "image_url", image_url: { url: reference.dataUrl, detail: "auto" } });
        reference.frames?.forEach((frame) => content.push({ type: "image_url", image_url: { url: frame.dataUrl, detail: "auto" } }));
      });
      const response = await invokeLLM({ model: "gemini-3-flash-preview", max_tokens: 4_000, messages: [{ role: "system", content: mediaSystemInstruction }, { role: "user", content }], response_format: { type: "json_schema", json_schema: { name: "integrated_multireference_analysis", strict: true, schema: integratedAnalysisSchema } } });
      return readJson<{ summary: string; priorityOrder: string[]; conflicts: string[]; synthesisNotes: string[] }>(response);
    }),
    video: publicProcedure.input(videoAnalysisInput).mutation(async ({ input }) => {
      const orderedFrames = [...input.frames].sort((a, b) => a.timestamp - b.timestamp);
      const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "auto" } }> = [
        {
          type: "text",
          text: `이것은 길이 ${input.meta.duration.toFixed(1)}초, ${input.meta.width}×${input.meta.height}, ${input.meta.aspectRatio} 비율의 한 영상에서 시간 순서대로 추출한 키프레임들입니다. 단일 프레임으로 결론 내리지 말고 모든 시간대의 변화와 연결을 비교하여 전체 영상 흐름을 분석하세요. fields는 기존 입력 폼에 자동 반영할 짧고 편집 가능한 문구입니다. timeline은 영상 길이에 맞춘 시간 코드별 전개를 2~8개 구간으로 요약하세요. preservationNotes에는 원본 영상 편집 또는 VFX 덧방 때 보존할 인물 외형·연기, 모션, 카메라, 프레이밍, 변경하지 않는 배경을 구체적으로 작성하세요.`,
        },
      ];
      orderedFrames.forEach((frame, index) => {
        content.push({ type: "text", text: `키프레임 ${index + 1}/${orderedFrames.length} — 시간 코드 ${frame.timestamp.toFixed(2)}초` });
        content.push({ type: "image_url", image_url: { url: frame.dataUrl, detail: "auto" } });
      });

      const response = await invokeLLM({
        model: "gemini-3-flash-preview",
        max_tokens: 8_000,
        messages: [
          { role: "system", content: mediaSystemInstruction },
          { role: "user", content },
        ],
        response_format: { type: "json_schema", json_schema: { name: "video_timeline_analysis", strict: true, schema: visualAnalysisSchema } },
      });
      return readJson<AnalysisResult>(response);
    }),
  }),
  prompt: router({
    generate: publicProcedure.input(promptInput).mutation(async ({ input }) => {
      const analysisTimeline = input.timeline.length
        ? input.timeline.map(item => `${item.time}: ${item.description}`).join("\n")
        : "분석된 타임라인 없음";
      const detailLines = [
        `입력 방식: ${input.inputMode} + 멀티미디어 혼합 참조`,
        `최종 출력 모드: ${modeLabel(input.outputMode)}`,
        `대상 모델 프리셋: ${modelLabel(input.modelPreset)}`,
        `만들거나 편집할 핵심 장면: ${input.subject}`,
        `스타일: ${input.style || "미지정 — 장면에 가장 어울리는 영상 스타일을 제안"}`,
        `움직임: ${input.motion || "미지정 — 피사체와 환경의 자연스러운 움직임을 제안"}`,
        `카메라: ${input.camera || "미지정 — 장면에 맞는 카메라 이동을 제안"}`,
        `조명: ${input.lighting || "미지정 — 시간의 흐름에 어울리는 조명을 제안"}`,
        `전환: ${input.transition || "미지정 — 장면 사이의 안정적인 연결을 제안"}`,
        `속도와 리듬: ${input.pacing || "미지정 — 영상의 감정 곡선에 맞는 템포를 제안"}`,
        `AI 분석 메모(사용자가 수정 가능): ${input.analysisNotes || "없음"}`,
        `시간축 분석(사용자가 수정 가능):\n${analysisTimeline}`,
        `제외 요소: ${input.exclude || "특별한 제외 요소 없음"}`,
        `사용자가 지정한 변경/추가 지시: ${input.directions || "없음"}`,
        `역할 기반 멀티 참조 목록:\n${input.mediaReferences.length ? input.mediaReferences.sort((a, b) => a.order - b.order).map((reference) => `${reference.type === "image" ? "Image" : "Video"} ${reference.order} | role=${reference.role} | name=${reference.name} | note=${reference.note || "없음"} | analysis=${reference.analysis || "개별 분석 없음"}`).join("\n") : "참조 없음"}`,
        `참조 우선순위 규칙: Image 1 또는 가장 낮은 order를 primary reference로 취급. subject/background/outfit/prop는 시각 보존 우선, first_frame/last_frame은 시간축 경계 우선, motion/camera/lighting/fx는 동작·연출 규칙으로 적용. 충돌 시 primary reference의 인물·환경·의상을 보존하고, motion/camera/lighting은 보존 범위 안에서 조정하며, 해결되지 않은 충돌은 결과의 제안과 보존 조건에 명시.`,
        `출력 모드 원칙: ${outputModeInstruction(input.outputMode)}`,
        `모델별 구조 원칙: ${presetInstruction(input.modelPreset)}`,
        `출력 분량: ${lengthInstruction(input.outputLength)}`,
      ].join("\n");

      const content: Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "auto" } }> = [
        { type: "text", text: `${detailLines}\n\n위 정보를 바탕으로 선택한 영상 모델에 바로 붙여 넣을 수 있는 한국어 제작 프롬프트를 디렉터처럼 작성하세요. 시간적 연속성, 피사체 동선, 카메라, 조명, 공간적 가림 관계를 구체적으로 다루세요. VFX 덧방일 때는 사용자가 지시한 수정 대상만 바꾸고, 보존 지시를 프롬프트의 앞부분과 품질 제약에 명확히 반복하세요.` },
      ];
      input.mediaReferences.filter((reference) => reference.type === "image" && reference.dataUrl).sort((a, b) => a.order - b.order).forEach((reference) => {
        content.push({ type: "text", text: `Image ${reference.order} / ${reference.role} / ${reference.name}` });
        content.push({ type: "image_url", image_url: { url: reference.dataUrl!, detail: "auto" } });
      });
      input.mediaReferences.filter((reference) => reference.type === "video" && reference.frames?.length).sort((a, b) => a.order - b.order).forEach((reference) => {
        content.push({ type: "text", text: `Video ${reference.order} / ${reference.role} / ${reference.name} — 시간 순서 키프레임` });
        reference.frames?.forEach((frame, index) => { content.push({ type: "text", text: `Video ${reference.order} keyframe ${index + 1} / ${frame.timestamp.toFixed(2)}초` }); content.push({ type: "image_url", image_url: { url: frame.dataUrl, detail: "auto" } }); });
      });

      const response = await invokeLLM({
        model: "gemini-3-flash-preview",
        max_tokens: input.outputLength === "detailed" ? 8_000 : input.outputLength === "standard" ? 4_500 : 2_500,
        messages: [
          { role: "system", content: "당신은 영상 디렉터이자 비디오 생성 프롬프트 에디터입니다. 한국어로 답하고 추상적인 표현보다 피사체의 동선·속도·카메라 움직임·렌즈·빛·전환·시간적 연속성을 구체적으로 보완합니다. 참조 이미지 또는 영상 분석이 있으면 보이는 시각적 특징만 활용하며 실제 인물의 신원을 식별하거나 추측하지 않습니다. 원본 영상 편집과 VFX 덧방에서는 수정 범위를 엄격히 분리하고, 사용자가 지정하지 않은 인물·카메라·프레이밍·배경을 보존합니다. JSON만 출력합니다." },
          { role: "user", content },
        ],
        response_format: { type: "json_schema", json_schema: { name: "video_prompt_result", strict: true, schema: promptOutputSchema } },
      });
      return readJson<{
        prompt: string;
        negativePrompt: string;
        suggestions: string[];
        controlNotes: string[];
        analysisSummary: string;
        timeline: string[];
        preservationNotes: string[];
      }>(response);
    }),
  }),
});

export type AppRouter = typeof appRouter;
