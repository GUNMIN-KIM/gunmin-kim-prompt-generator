import { useMemo, useRef, useState } from "react";
import { Camera, Check, Copy, Film, ImagePlus, Lightbulb, Loader2, Play, RefreshCw, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { extractVideoFrames, formatTimecode, frameCountFor, readVideoMeta, samplingDescription, type FrameSamplingMode, type VideoFrame, type VideoMeta } from "@/lib/videoFrames";
import { trpc } from "@/lib/trpc";

type InputMode = "text" | "image" | "video";
type OutputMode = "new_video" | "reference_recreation" | "source_edit" | "vfx_overlay";
type ModelPreset = "general" | "seedance" | "kling" | "veo" | "hailuo";
type OutputLength = "short" | "standard" | "detailed";

type DraftFields = {
  subject: string;
  style: string;
  motion: string;
  camera: string;
  lighting: string;
  transition: string;
  pacing: string;
  exclude: string;
  directions: string;
};

type TimelineItem = { time: string; description: string };
type AnalysisResult = {
  summary: string;
  fields: Pick<DraftFields, "subject" | "style" | "motion" | "camera" | "lighting" | "pacing">;
  scene: string;
  person: string;
  composition: string;
  action: string;
  colorMood: string;
  timeline: TimelineItem[];
  preservationNotes: string[];
};

type PromptResult = {
  prompt: string;
  negativePrompt: string;
  suggestions: string[];
  controlNotes: string[];
  analysisSummary: string;
  timeline: string[];
  preservationNotes: string[];
};

type ImageReference = { name: string; dataUrl: string; size: number };
type VideoReference = { name: string; file: File; size: number; meta: VideoMeta; previewUrl: string; frames: VideoFrame[] };

const initialFields: DraftFields = { subject: "", style: "", motion: "", camera: "", lighting: "", transition: "", pacing: "", exclude: "", directions: "" };
const quickChoices = {
  style: ["시네마틱 리얼리즘", "다큐멘터리", "뮤직비디오", "애니메이션"],
  motion: ["느린 인물의 이동", "바람에 흔들리는 오브젝트", "빠른 액션", "감정적인 미세 표정"],
  camera: ["돌리 인", "핸드헬드 추적", "360도 오비트", "고정 와이드 샷"],
  lighting: ["네온 야간 조명", "골든 아워", "하이 콘트라스트", "부드러운 확산광"],
  transition: ["하드 컷", "매치 컷", "슬로 모션 전환", "심리스 모프"],
  pacing: ["느리고 명상적인", "리드미컬한", "긴박한", "광고처럼 정교한"],
} as const;

const inputModeItems: Array<{ id: InputMode; label: string; description: string }> = [
  { id: "text", label: "Text", description: "직접 장면 설계" },
  { id: "image", label: "Image", description: "이미지 자동 분석" },
  { id: "video", label: "Video", description: "전체 흐름 분석" },
];
const outputModeItems: Array<{ id: OutputMode; label: string; description: string }> = [
  { id: "new_video", label: "새 영상 생성", description: "새 장면으로 확장" },
  { id: "reference_recreation", label: "레퍼런스 재현", description: "시각 언어 재현" },
  { id: "source_edit", label: "원본 영상 편집", description: "원본 흐름 유지" },
  { id: "vfx_overlay", label: "VFX 덧방", description: "지정 영역만 변경" },
];
const modelPresetItems: Array<{ id: ModelPreset; label: string }> = [
  { id: "general", label: "General" },
  { id: "seedance", label: "Seedance" },
  { id: "kling", label: "Kling" },
  { id: "veo", label: "Veo" },
  { id: "hailuo", label: "Hailuo" },
];
const lengthItems: Array<{ id: OutputLength; label: string }> = [
  { id: "short", label: "Short" },
  { id: "standard", label: "Standard" },
  { id: "detailed", label: "Detailed" },
];

function localDraft(fields: DraftFields, outputMode: OutputMode, model: ModelPreset): PromptResult {
  const subject = fields.subject.trim() || "분석된 레퍼런스 기반 장면";
  const preservation = outputMode === "vfx_overlay"
    ? ["원본 인물의 외형·얼굴 특징·의상·연기를 유지", "원본 모션 궤적과 카메라 움직임·프레이밍을 유지", "지정하지 않은 배경 영역을 변경하지 않음"]
    : outputMode === "source_edit"
      ? ["원본 시간 흐름과 피사체 동선을 유지", "카메라·구도·조명 연속성을 유지"]
      : [];
  const parts = [subject, fields.style && `스타일: ${fields.style}`, fields.motion && `움직임: ${fields.motion}`, fields.camera && `카메라: ${fields.camera}`, fields.lighting && `조명: ${fields.lighting}`, fields.transition && `전환: ${fields.transition}`, fields.pacing && `템포: ${fields.pacing}`, fields.directions && `변경 지시: ${fields.directions}`].filter(Boolean);
  return {
    prompt: `${parts.join(". ")}. ${outputMode === "vfx_overlay" ? "사용자가 지정한 VFX 대상에만 변화를 적용하고, 원본 인물·얼굴 특징·연기·모션·카메라·프레이밍·변경하지 않는 배경을 엄격하게 유지한다." : "시간의 흐름과 움직임이 자연스럽게 이어지고, 피사체의 동선·카메라 리듬·공간의 깊이가 명확하다."} ${model === "seedance" ? "시간대별 행동과 카메라 전개를 분명히 정리한다." : ""}`,
    negativePrompt: fields.exclude || "끊기는 움직임, 프레임 깜빡임, 왜곡된 신체 비율, 불안정한 카메라, 저화질, 워터마크, 갑작스러운 장면 변화",
    suggestions: ["피사체가 어디에서 어디로 이동하는지 시작점과 끝점을 지정해 보세요.", "카메라 이동 속도와 렌즈를 추가하면 영상의 리듬이 선명해집니다.", "첫 프레임과 마지막 프레임의 연결 방식을 정하면 전환이 안정됩니다."],
    controlNotes: [fields.motion || "움직임 미지정", fields.camera || "카메라 미지정", fields.pacing || "템포 미지정"],
    analysisSummary: "AI 결과를 불러오는 동안 표시하는 편집 가능한 로컬 초안입니다.",
    timeline: [],
    preservationNotes: preservation,
  };
}

function analysisNotesFrom(result: AnalysisResult) {
  return [
    `분석 요약: ${result.summary}`,
    `장면: ${result.scene}`,
    `인물/피사체: ${result.person}`,
    `구도: ${result.composition}`,
    `액션: ${result.action}`,
    `색감·무드: ${result.colorMood}`,
  ].join("\n");
}

export default function Home() {
  const [fields, setFields] = useState<DraftFields>(initialFields);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [outputMode, setOutputMode] = useState<OutputMode>("new_video");
  const [modelPreset, setModelPreset] = useState<ModelPreset>("general");
  const [outputLength, setOutputLength] = useState<OutputLength>("standard");
  const [sampling, setSampling] = useState<FrameSamplingMode>("standard");
  const [imageReference, setImageReference] = useState<ImageReference | null>(null);
  const [videoReference, setVideoReference] = useState<VideoReference | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisNotes, setAnalysisNotes] = useState("");
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [error, setError] = useState("");
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const applyAnalysis = (data: AnalysisResult) => {
    setAnalysis(data);
    setAnalysisNotes(analysisNotesFrom(data));
    setTimeline(data.timeline);
    setFields((current) => ({ ...current, ...data.fields }));
    setError("");
  };

  const analyzeImage = trpc.analysis.image.useMutation({
    onSuccess: (data) => { applyAnalysis(data); toast.success("이미지의 장면·스타일·카메라 분석을 입력값에 반영했습니다."); },
    onError: (mutationError) => setError(mutationError.message || "이미지 분석을 완료하지 못했습니다. 직접 입력으로 계속할 수 있습니다."),
  });
  const analyzeVideo = trpc.analysis.video.useMutation({
    onSuccess: (data) => { applyAnalysis(data); toast.success("영상의 전체 시간 흐름을 분석해 입력값과 타임라인에 반영했습니다."); },
    onError: (mutationError) => setError(mutationError.message || "영상 분석을 완료하지 못했습니다. 샘플링 방식을 바꾸어 다시 시도해 주세요."),
  });
  const generate = trpc.prompt.generate.useMutation({
    onSuccess: (data) => { setResult(data); setError(""); },
    onError: (mutationError) => { setError(mutationError.message || "AI 개선 제안을 불러오지 못했습니다. 로컬 초안을 표시합니다."); setResult(localDraft(fields, outputMode, modelPreset)); },
  });

  const progress = useMemo(() => Object.values(fields).filter((value) => value.trim()).length, [fields]);
  const updateField = (key: keyof DraftFields, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const applyChoice = (key: keyof typeof quickChoices, value: string) => updateField(key, fields[key] === value ? "" : value);
  const updateTimeline = (index: number, key: keyof TimelineItem, value: string) => setTimeline((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));

  const handleImageFile = (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("PNG, JPG, WEBP 형식의 이미지 파일만 사용할 수 있습니다."); return; }
    if (file.size > 3 * 1024 * 1024) { setError("이미지 분석은 안정적인 처리 위해 3MB 이하 파일을 지원합니다."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImageReference({ name: file.name, dataUrl, size: file.size });
      setAnalysis(null);
      setTimeline([]);
      setError("");
      analyzeImage.mutate({ imageDataUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const runVideoAnalysis = async (file: File, selectedSampling: FrameSamplingMode) => {
    try {
      setError("");
      const { meta, frames } = await extractVideoFrames(file, selectedSampling);
      setVideoReference((current) => current && current.file === file ? { ...current, meta, frames } : current);
      analyzeVideo.mutate({ meta, frames });
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "영상 프레임을 추출하지 못했습니다.");
    }
  };

  const handleVideoFile = async (file?: File) => {
    if (!file) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(file.type)) { setError("MP4, MOV, WebM 형식의 영상 파일만 사용할 수 있습니다."); return; }
    if (file.size > 250 * 1024 * 1024) { setError("브라우저 분석 안정성을 위해 250MB 이하 영상을 선택해 주세요."); return; }
    try {
      const meta = await readVideoMeta(file);
      if (videoReference) URL.revokeObjectURL(videoReference.previewUrl);
      const previewUrl = URL.createObjectURL(file);
      setVideoReference({ name: file.name, file, size: file.size, meta, previewUrl, frames: [] });
      setImageReference(null);
      setAnalysis(null);
      setTimeline([]);
      setError("");
      void runVideoAnalysis(file, sampling);
    } catch (metadataError) {
      setError(metadataError instanceof Error ? metadataError.message : "영상 정보를 읽을 수 없습니다. 브라우저가 재생할 수 있는 파일인지 확인해 주세요.");
    }
  };

  const handleGenerate = () => {
    if (inputMode === "text" && !fields.subject.trim()) { setError("먼저 만들고 싶은 비디오 장면을 입력해 주세요."); return; }
    if (inputMode === "image" && !imageReference) { setError("분석할 이미지를 업로드해 주세요."); return; }
    if (inputMode === "video" && !videoReference) { setError("분석할 영상을 업로드해 주세요."); return; }
    setError("");
    setResult(localDraft(fields, outputMode, modelPreset));
    generate.mutate({
      ...fields,
      subject: fields.subject.trim() || "업로드한 레퍼런스 기반 장면",
      inputMode,
      outputMode,
      modelPreset,
      outputLength,
      analysisNotes,
      timeline,
      referenceImage: inputMode === "image" ? imageReference?.dataUrl : undefined,
    });
  };

  const copyPrompt = async () => {
    if (!result) return;
    const timelineText = result.timeline.length ? `\n\n시간축:\n${result.timeline.join("\n")}` : "";
    const preservationText = result.preservationNotes.length ? `\n\n보존 조건:\n${result.preservationNotes.map((note) => `- ${note}`).join("\n")}` : "";
    await navigator.clipboard.writeText(`${result.prompt}\n\n제외 요소: ${result.negativePrompt}${timelineText}${preservationText}`);
    toast.success("완성형 비디오 프롬프트를 클립보드에 복사했습니다.");
  };

  const reset = () => {
    if (videoReference) URL.revokeObjectURL(videoReference.previewUrl);
    setFields(initialFields); setImageReference(null); setVideoReference(null); setAnalysis(null); setAnalysisNotes(""); setTimeline([]); setResult(null); setError(""); setInputMode("text"); setOutputMode("new_video"); setModelPreset("general"); setOutputLength("standard"); setSampling("standard");
  };

  const isAnalyzing = analyzeImage.isPending || analyzeVideo.isPending;
  const sourceReady = inputMode === "text" || Boolean(imageReference) || Boolean(videoReference);

  return (
    <main className="studio-shell">
      <header className="topbar"><a className="brand" href="/" aria-label="gunmin-kim 비디오 프롬프트 생성기 홈"><span className="brand-mark"><Sparkles size={16} /></span><span><strong>GUNMIN-KIM</strong><small>비디오 프롬프트 생성기</small></span></a><div className="topbar-meta"><span className="status-dot" />AI VIDEO WORKSHOP <span className="divider" /> v2.0</div></header>
      <section className="hero"><div><p className="kicker"><span /> A elegant and perfect style</p><h1>AI VIDEO<br /><em>PROMPT LAB</em></h1><p className="hero-copy">텍스트로 장면을 설계하거나 이미지와 영상의 시각 언어를 분석해, 모델이 이해할 수 있는 완성형 비디오 프롬프트로 정제합니다.</p></div><div className="hero-note"><span>01 / ANALYZE</span><p>SEE.<br />DIRECT.</p></div></section>
      <div className="workspace-grid">
        <section className="panel input-panel" aria-labelledby="input-heading">
          <div className="panel-heading"><div><span className="panel-index">01 / INPUT</span><h2 id="input-heading">비디오 설계</h2></div><span className="field-count">{progress} / 9 complete</span></div>
          <div className="form-stack">
            <div className="mode-block"><div className="field-label"><span>입력 방식</span><small>TEXT · IMAGE · VIDEO</small></div><div className="mode-grid">{inputModeItems.map((item) => <button key={item.id} type="button" className={`mode-choice ${inputMode === item.id ? "active" : ""}`} onClick={() => { setInputMode(item.id); setError(""); }}><strong>{item.id === "image" ? <ImagePlus size={15} /> : item.id === "video" ? <Film size={15} /> : <SlidersHorizontal size={15} />}{item.label}</strong><small>{item.description}</small></button>)}</div></div>

            {inputMode === "image" && <MediaImageBlock reference={imageReference} analyzing={analyzeImage.isPending} onChoose={() => imageFileRef.current?.click()} onDrop={handleImageFile} onRemove={() => { setImageReference(null); setAnalysis(null); setAnalysisNotes(""); }} />}
            {inputMode === "video" && <MediaVideoBlock reference={videoReference} sampling={sampling} analyzing={analyzeVideo.isPending} onSampling={setSampling} onChoose={() => videoFileRef.current?.click()} onDrop={handleVideoFile} onRemove={() => { if (videoReference) URL.revokeObjectURL(videoReference.previewUrl); setVideoReference(null); setAnalysis(null); setAnalysisNotes(""); setTimeline([]); }} onRetry={() => { if (videoReference) void runVideoAnalysis(videoReference.file, sampling); }} />}

            {analysis && <AnalysisReview analysis={analysis} notes={analysisNotes} timeline={timeline} onNotes={setAnalysisNotes} onTimelineChange={updateTimeline} />}

            <label className="field field-large"><span>{inputMode === "video" ? "이 영상에 어떤 변경을 적용할까요?" : "어떤 비디오를 만들고 싶나요?"} {inputMode === "text" && <b>*</b>}</span><Textarea value={fields.subject} onChange={(event) => updateField("subject", event.target.value)} placeholder={inputMode === "video" ? "예: 뒤 건물만 폭파하고 나머지는 원본 그대로 유지" : "예: 네온 도시를 달리는 탐험가, 카메라가 뒤에서 따라가는 장면"} rows={3} /></label>
            <FieldWithChips label="스타일" value={fields.style} onChange={(value) => updateField("style", value)} choices={quickChoices.style} onChoice={(value) => applyChoice("style", value)} placeholder="영상의 시각 언어를 직접 입력하세요" />
            <FieldWithChips label="움직임" value={fields.motion} onChange={(value) => updateField("motion", value)} choices={quickChoices.motion} onChoice={(value) => applyChoice("motion", value)} placeholder="피사체와 환경이 어떻게 움직이나요?" />
            <FieldWithChips label="카메라" value={fields.camera} onChange={(value) => updateField("camera", value)} choices={quickChoices.camera} onChoice={(value) => applyChoice("camera", value)} placeholder="카메라의 이동과 시점을 입력하세요" />
            <div className="split-fields"><FieldWithChips label="조명" value={fields.lighting} onChange={(value) => updateField("lighting", value)} choices={quickChoices.lighting} onChoice={(value) => applyChoice("lighting", value)} placeholder="빛의 방향과 색" /><FieldWithChips label="전환" value={fields.transition} onChange={(value) => updateField("transition", value)} choices={quickChoices.transition} onChoice={(value) => applyChoice("transition", value)} placeholder="장면 연결 방식" /></div>
            <FieldWithChips label="속도와 리듬" value={fields.pacing} onChange={(value) => updateField("pacing", value)} choices={quickChoices.pacing} onChoice={(value) => applyChoice("pacing", value)} placeholder="영상의 템포와 감정 곡선" />
            <div className="split-fields"><label className="field"><span>제외 요소</span><Textarea value={fields.exclude} onChange={(event) => updateField("exclude", event.target.value)} placeholder="원하지 않는 영상 결함, 분위기" rows={2} /></label><label className="field"><span>{outputMode === "vfx_overlay" ? "VFX 변경 지시" : "추가 지시"}</span><Textarea value={fields.directions} onChange={(event) => updateField("directions", event.target.value)} placeholder={outputMode === "vfx_overlay" ? "예: 뒤 건물만 폭파. 사람·카메라·배경의 나머지 부분은 유지" : "비율, 길이, 출력 목적"} rows={2} /></label></div>

            <div className="settings-block"><div className="field-label"><span>최종 출력 설정</span><small>MODE · MODEL · LENGTH</small></div><div className="setting-group"><span>출력 모드</span><div className="selectable-grid output-mode-grid">{outputModeItems.map((item) => <button type="button" className={`setting-choice ${outputMode === item.id ? "active" : ""}`} key={item.id} onClick={() => setOutputMode(item.id)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</div></div><div className="setting-group"><span>모델 프리셋</span><div className="compact-choice-row">{modelPresetItems.map((item) => <button type="button" className={`compact-choice ${modelPreset === item.id ? "active" : ""}`} key={item.id} onClick={() => setModelPreset(item.id)}>{modelPreset === item.id && <Check size={11} />}{item.label}</button>)}</div></div><div className="setting-group"><span>출력 길이</span><div className="compact-choice-row">{lengthItems.map((item) => <button type="button" className={`compact-choice ${outputLength === item.id ? "active" : ""}`} key={item.id} onClick={() => setOutputLength(item.id)}>{item.label}</button>)}</div></div>{outputMode === "vfx_overlay" && <p className="preservation-hint"><Sparkles size={14} />원본 인물·얼굴·액팅·모션·카메라·프레이밍·변경하지 않는 배경을 자동 보존하도록 지시합니다.</p>}</div>
          </div>
          <input ref={imageFileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleImageFile(event.target.files?.[0])} />
          <input ref={videoFileRef} className="visually-hidden" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={(event) => handleVideoFile(event.target.files?.[0])} />
          {error && <p className="error-message" role="alert">{error}</p>}
          <Button className="generate-button" onClick={handleGenerate} disabled={generate.isPending || isAnalyzing || !sourceReady}>{generate.isPending || isAnalyzing ? <Loader2 className="spin" size={17} /> : <Film size={17} />}{isAnalyzing ? "레퍼런스를 분석하는 중" : generate.isPending ? "프롬프트를 다듬는 중" : "비디오 프롬프트 생성하기"}<span>↗</span></Button>
        </section>
        <section className="panel output-panel" aria-labelledby="output-heading"><div className="panel-heading"><div><span className="panel-index">02 / OUTPUT</span><h2 id="output-heading">정제된 비디오 프롬프트</h2></div><button className="reset-button" type="button" onClick={reset}><RefreshCw size={14} /> 초기화</button></div>{!result ? <div className="empty-output"><div className="empty-orbit"><span /><span /><span /><Camera size={22} /></div><h3>다음 장면을 움직여 보세요.</h3><p>텍스트를 입력하거나 이미지·영상을 분석하면<br />완성된 영상 프롬프트가 이곳에 나타납니다.</p><div className="empty-rule" /></div> : <ResultPanel result={result} mode={outputMode} model={modelPreset} inputMode={inputMode} onCopy={copyPrompt} />}</section>
      </div><footer className="footer-note"><span>GUNMIN-KIM VIDEO PROMPT LAB</span><span>정확한 장면 · 살아있는 움직임 · 더 나은 영상</span></footer>
    </main>
  );
}

function MediaImageBlock({ reference, analyzing, onChoose, onDrop, onRemove }: { reference: ImageReference | null; analyzing: boolean; onChoose: () => void; onDrop: (file?: File) => void; onRemove: () => void }) {
  return <div className="reference-block"><div className="field-label"><span>분석할 이미지</span><small>PNG · JPG · WEBP / 최대 3MB</small></div>{reference ? <div className="reference-preview media-preview"><img src={reference.dataUrl} alt={`${reference.name} 미리보기`} /><div><strong>{reference.name}</strong><small>{(reference.size / 1024 / 1024).toFixed(2)} MB · {analyzing ? "Gemini Vision 분석 중" : "분석 준비 완료"}</small></div>{analyzing && <Loader2 className="spin preview-loader" size={16} />}<button className="icon-button" type="button" onClick={onRemove} aria-label="분석 이미지 제거"><X size={16} /></button></div> : <button className="upload-zone" type="button" onClick={onChoose} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDrop(event.dataTransfer.files?.[0]); }}><span className="upload-icon"><ImagePlus size={19} /></span><span><strong>이미지를 드래그하거나 선택하세요</strong><small>장면 · 인물 · 스타일 · 카메라 · 조명 · 구도를 자동 분석합니다.</small></span><Upload size={17} /></button>}</div>;
}

function MediaVideoBlock({ reference, sampling, analyzing, onSampling, onChoose, onDrop, onRemove, onRetry }: { reference: VideoReference | null; sampling: FrameSamplingMode; analyzing: boolean; onSampling: (mode: FrameSamplingMode) => void; onChoose: () => void; onDrop: (file?: File) => void; onRemove: () => void; onRetry: () => void }) {
  const duration = reference?.meta.duration ?? 30;
  return <div className="reference-block video-upload-block"><div className="field-label"><span>분석할 영상</span><small>MP4 · MOV · WEBM / 최대 250MB</small></div><div className="sampling-control"><div><span>키프레임 샘플링</span><small>{samplingDescription(duration, sampling)}</small></div><div className="compact-choice-row">{(["fast", "standard", "detailed"] as FrameSamplingMode[]).map((mode) => <button key={mode} type="button" className={`compact-choice ${sampling === mode ? "active" : ""}`} onClick={() => onSampling(mode)}>{mode === "fast" ? "Fast" : mode === "standard" ? "Standard" : "Detailed"}</button>)}</div></div>{reference ? <div className="video-preview"><video src={reference.previewUrl} muted playsInline controls preload="metadata" /><div className="video-meta"><div><strong>{reference.name}</strong><small>{formatTimecode(reference.meta.duration)} · {reference.meta.width}×{reference.meta.height} · {reference.meta.aspectRatio}</small><small>{reference.frames.length ? `${reference.frames.length}개 시간축 키프레임 추출 완료` : "키프레임을 추출하는 중"}</small></div><div className="video-actions"><button className="mini-action" type="button" disabled={analyzing} onClick={onRetry}>{analyzing ? <Loader2 className="spin" size={13} /> : <Play size={13} />} 다시 분석</button><button className="icon-button" type="button" onClick={onRemove} aria-label="분석 영상 제거"><X size={16} /></button></div></div>{reference.frames.length > 0 && <div className="frame-strip">{reference.frames.slice(0, 8).map((frame) => <div key={frame.timestamp} className="frame-thumb"><img src={frame.dataUrl} alt={`${formatTimecode(frame.timestamp)} 키프레임`} /><span>{formatTimecode(frame.timestamp)}</span></div>)}{reference.frames.length > 8 && <span className="frame-more">+{reference.frames.length - 8}</span>}</div>}</div> : <button className="upload-zone video-upload-zone" type="button" onClick={onChoose} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onDrop(event.dataTransfer.files?.[0]); }}><span className="upload-icon"><Film size={19} /></span><span><strong>영상을 드래그하거나 선택하세요</strong><small>처음부터 끝까지 여러 시간대의 키프레임을 추출해 인물·액션·카메라·조명·스타일 변화를 분석합니다.</small></span><Upload size={17} /></button>}<p className="video-sampling-note">{frameCountFor(duration, sampling)}개 프레임을 영상의 0%~95% 구간에서 고르게 읽습니다. 첫 프레임만으로 분석하지 않습니다.</p></div>;
}

function AnalysisReview({ analysis, notes, timeline, onNotes, onTimelineChange }: { analysis: AnalysisResult; notes: string; timeline: TimelineItem[]; onNotes: (value: string) => void; onTimelineChange: (index: number, key: keyof TimelineItem, value: string) => void }) {
  return <div className="analysis-card"><div className="analysis-card-head"><div><span className="result-label">GEMINI VISION / EDITABLE</span><h3>자동 분석 결과</h3></div><span className="analysis-status"><Check size={12} /> 반영됨</span></div><p className="analysis-summary">{analysis.summary}</p><label className="field"><span>분석 메모 직접 수정</span><Textarea value={notes} onChange={(event) => onNotes(event.target.value)} rows={5} /></label>{timeline.length > 0 && <div className="timeline-editor"><span>시간축 분석 직접 수정</span>{timeline.map((item, index) => <div className="timeline-edit-row" key={`${item.time}-${index}`}><input aria-label={`${index + 1}번째 시간 코드`} value={item.time} onChange={(event) => onTimelineChange(index, "time", event.target.value)} /><input aria-label={`${index + 1}번째 시간대 설명`} value={item.description} onChange={(event) => onTimelineChange(index, "description", event.target.value)} /></div>)}</div>}</div>;
}

function ResultPanel({ result, mode, model, inputMode, onCopy }: { result: PromptResult; mode: OutputMode; model: ModelPreset; inputMode: InputMode; onCopy: () => void }) {
  const modeLabel = ({ new_video: "새 영상 생성", reference_recreation: "레퍼런스 재현", source_edit: "원본 영상 편집", vfx_overlay: "VFX 덧방" } as const)[mode];
  return <div className="result-stack"><div className="result-context"><span><Sparkles size={12} /> {inputMode.toUpperCase()} 분석 반영</span><span>{modeLabel} · {model.toUpperCase()}</span></div><div className="result-card primary-result"><div className="result-card-head"><div><span className="result-label">VIDEO PROMPT / KO</span><h3>비디오 모델용 프롬프트</h3></div><button className="copy-button" type="button" onClick={onCopy}><Copy size={15} /> 복사</button></div><p className="prompt-text">{result.prompt}</p><div className="tag-row"><span>cinematic motion</span><span>camera rhythm</span><span>temporal continuity</span></div></div>{result.analysisSummary && <div className="result-card analysis-result"><span className="result-label">ANALYSIS APPLIED</span><p>{result.analysisSummary}</p></div>}{result.timeline.length > 0 && <div className="result-card"><span className="result-label">TIMELINE / TIME CODE</span><div className="result-timeline">{result.timeline.map((item) => <p key={item}>{item}</p>)}</div></div>}{result.preservationNotes.length > 0 && <div className="result-card preservation-result"><span className="result-label">PRESERVATION LOCK</span><ul>{result.preservationNotes.map((note) => <li key={note}><Check size={13} />{note}</li>)}</ul></div>}<div className="result-card"><span className="result-label">NEGATIVE / CONTROL</span><p className="negative-text">{result.negativePrompt}</p></div><div className="suggestion-card"><div className="suggestion-title"><span className="lightbulb"><Lightbulb size={15} /></span><div><span className="result-label">DIRECTOR'S NOTES</span><h3>더 좋아지기 위한 제안</h3></div></div><ul>{result.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div><div className="visual-note-row"><span className="result-label">MOTION CONTROL</span>{result.controlNotes.map((note) => <span className="visual-pill" key={note}>{note}</span>)}</div></div>;
}

function FieldWithChips({ label, value, onChange, choices, onChoice, placeholder }: { label: string; value: string; onChange: (value: string) => void; choices: readonly string[]; onChoice: (value: string) => void; placeholder: string }) { return <label className="field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /><div className="chip-row">{choices.map((choice) => <button className={`chip ${value === choice ? "active" : ""}`} key={choice} type="button" onClick={() => onChoice(choice)}>{choice}</button>)}</div></label>; }
