export type FrameSamplingMode = "fast" | "standard" | "detailed";

export type VideoFrame = {
  timestamp: number;
  dataUrl: string;
};

export type VideoMeta = {
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
};

const LAST_FRAME_RATIO = 0.95;
const METADATA_TIMEOUT = 8_000;

function waitForEvent(target: EventTarget, name: string, timeout = METADATA_TIMEOUT): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      target.removeEventListener(name, handleEvent);
      reject(new Error(`영상 ${name} 이벤트를 기다리는 시간이 초과되었습니다.`));
    }, timeout);

    const handleEvent = () => {
      window.clearTimeout(timer);
      target.removeEventListener(name, handleEvent);
      resolve();
    };

    target.addEventListener(name, handleEvent, { once: true });
  });
}

export function frameCountFor(duration: number, mode: FrameSamplingMode): number {
  if (mode === "fast") return 5;
  if (mode === "standard") {
    if (duration <= 10) return 6;
    if (duration <= 30) return 10;
    if (duration <= 60) return 14;
    return 16;
  }
  if (duration <= 10) return 10;
  if (duration <= 30) return 16;
  if (duration <= 60) return 24;
  return 32;
}

export function samplingDescription(duration: number, mode: FrameSamplingMode): string {
  const count = frameCountFor(duration, mode);
  if (mode === "fast") return `핵심 전개를 빠르게 확인하는 ${count}개 프레임`;
  if (mode === "standard") return `시간 흐름과 카메라 변화를 균형 있게 읽는 ${count}개 프레임`;
  return `세부 액팅과 연속성을 촘촘히 읽는 ${count}개 프레임`;
}

export function makeTimestamps(duration: number, count: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0 || count <= 0) return [];
  if (count === 1) return [0];
  const finalTime = Math.max(0, duration * LAST_FRAME_RATIO);
  const step = finalTime / (count - 1);
  return Array.from({ length: count }, (_, index) => Number((index === count - 1 ? finalTime : index * step).toFixed(3)));
}

export function formatTimecode(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(1).padStart(4, "0")}`;
}

function scaleToMaxSide(width: number, height: number, maxSide: number) {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxSide) return { width, height };
  const ratio = maxSide / longestSide;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

async function seek(video: HTMLVideoElement, timestamp: number) {
  if (Math.abs(video.currentTime - timestamp) <= 0.04) return;
  video.currentTime = timestamp;
  await waitForEvent(video, "seeked");
}

function drawFrame(video: HTMLVideoElement, mode: FrameSamplingMode): string {
  const maxSide = mode === "fast" ? 768 : 1024;
  const quality = mode === "fast" ? 0.78 : 0.84;
  const { width, height } = scaleToMaxSide(video.videoWidth || 1280, video.videoHeight || 720, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("프레임 캔버스를 만들 수 없습니다.");
  context.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function readVideoMeta(file: File): Promise<VideoMeta> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.src = url;
  try {
    await waitForEvent(video, "loadedmetadata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error("영상 길이를 읽을 수 없습니다.");
    const ratio = video.videoWidth / video.videoHeight;
    return {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      aspectRatio: ratio > 1.7 ? "16:9" : ratio < 0.8 ? "9:16" : "1:1 또는 4:5",
    };
  } finally {
    video.removeAttribute("src");
    URL.revokeObjectURL(url);
  }
}

export async function extractVideoFrames(file: File, mode: FrameSamplingMode): Promise<{ meta: VideoMeta; frames: VideoFrame[] }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await waitForEvent(video, "loadedmetadata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error("영상 길이를 읽을 수 없습니다.");
    await waitForEvent(video, "loadeddata");

    const meta: VideoMeta = {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      aspectRatio: video.videoWidth / video.videoHeight > 1.7 ? "16:9" : video.videoWidth / video.videoHeight < 0.8 ? "9:16" : "1:1 또는 4:5",
    };
    const timestamps = makeTimestamps(meta.duration, frameCountFor(meta.duration, mode));
    const frames: VideoFrame[] = [];

    for (const timestamp of timestamps) {
      try {
        await seek(video, timestamp);
        frames.push({ timestamp, dataUrl: drawFrame(video, mode) });
      } catch {
        // 일부 구간의 seek가 실패해도 나머지 시간대 프레임으로 분석을 계속한다.
      }
    }

    if (!frames.length) throw new Error("영상을 분석할 프레임을 추출하지 못했습니다. 다른 파일을 선택해 주세요.");
    return { meta, frames };
  } finally {
    video.pause();
    video.removeAttribute("src");
    URL.revokeObjectURL(url);
  }
}
