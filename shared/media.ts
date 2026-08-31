export type MediaType = "image" | "video";

export type MediaRole =
  | "subject"
  | "background"
  | "outfit"
  | "prop"
  | "lighting"
  | "motion"
  | "camera"
  | "first_frame"
  | "last_frame"
  | "fx";

export type MediaMeta = {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
};

export type MediaFrame = {
  timestamp: number;
  dataUrl: string;
};

export type MediaReference = {
  id: string;
  type: MediaType;
  name: string;
  dataUrl?: string;
  size: number;
  role: MediaRole;
  note: string;
  order: number;
  analysis?: string;
  previewUrl?: string;
  meta?: MediaMeta;
  frames?: MediaFrame[];
};

export type GenerationJobStatus = "idle" | "queued" | "processing" | "completed" | "failed";

export type VideoGenerationParams = {
  durationSeconds?: number;
  aspectRatio?: string;
  resolution?: string;
  seed?: number;
  fps?: number;
};

export type VideoGenerationJob = {
  provider: string;
  model: string;
  params: VideoGenerationParams;
  status: GenerationJobStatus;
  resultUrl?: string;
  error?: string;
};

export const idleVideoGenerationJob: VideoGenerationJob = {
  provider: "",
  model: "",
  params: {},
  status: "idle",
};

export const MEDIA_ROLE_LABELS: Record<MediaRole, string> = {
  subject: "Subject / Character",
  background: "Background / Environment",
  outfit: "Outfit / Style",
  prop: "Object / Prop",
  lighting: "Lighting Reference",
  motion: "Motion Reference",
  camera: "Camera Reference",
  first_frame: "First Frame",
  last_frame: "Last Frame",
  fx: "FX Reference",
};

export const MEDIA_ROLE_OPTIONS = Object.entries(MEDIA_ROLE_LABELS) as Array<[MediaRole, string]>;
