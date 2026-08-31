import { useMemo, useRef, useState } from "react";
import { Camera, Copy, Film, ImagePlus, Lightbulb, Loader2, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

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

type PromptResult = {
  prompt: string;
  negativePrompt: string;
  suggestions: string[];
  controlNotes: string[];
};

const initialFields: DraftFields = { subject: "", style: "", motion: "", camera: "", lighting: "", transition: "", pacing: "", exclude: "", directions: "" };
const quickChoices = {
  style: ["시네마틱 리얼리즘", "다큐멘터리", "뮤직비디오", "애니메이션"],
  motion: ["느린 인물의 이동", "바람에 흔들리는 오브젝트", "빠른 액션", "감정적인 미세 표정"],
  camera: ["돌리 인", "핸드헬드 추적", "360도 오비트", "고정 와이드 샷"],
  lighting: ["네온 야간 조명", "골든 아워", "하이 콘트라스트", "부드러운 확산광"],
  transition: ["하드 컷", "매치 컷", "슬로 모션 전환", "심리스 모프"],
  pacing: ["느리고 명상적인", "리드미컬한", "긴박한", "광고처럼 정교한"],
} as const;

function localDraft(fields: DraftFields): PromptResult {
  const subject = fields.subject.trim() || "주제와 장면을 입력해 주세요";
  const parts = [subject, fields.style && `스타일: ${fields.style}`, fields.motion && `움직임: ${fields.motion}`, fields.camera && `카메라: ${fields.camera}`, fields.lighting && `조명: ${fields.lighting}`, fields.transition && `전환: ${fields.transition}`, fields.pacing && `템포: ${fields.pacing}`, fields.directions && `연출: ${fields.directions}`].filter(Boolean);
  return {
    prompt: `${parts.join(". ")}. 시간의 흐름과 움직임이 자연스럽게 이어지고, 피사체의 동선·카메라 리듬·공간의 깊이가 명확한 비디오 생성용 프롬프트.`,
    negativePrompt: fields.exclude || "끊기는 움직임, 프레임 깜빡임, 왜곡된 신체 비율, 불안정한 카메라, 저화질, 워터마크, 갑작스러운 장면 변화",
    suggestions: ["피사체가 어디에서 어디로 이동하는지 시작점과 끝점을 지정해 보세요.", "카메라 이동 속도와 렌즈를 추가하면 영상의 리듬이 선명해집니다.", "첫 프레임과 마지막 프레임의 연결 방식을 정하면 전환이 안정됩니다."],
    controlNotes: [fields.motion || "움직임 미지정", fields.camera || "카메라 미지정", fields.pacing || "템포 미지정"],
  };
}

export default function Home() {
  const [fields, setFields] = useState<DraftFields>(initialFields);
  const [reference, setReference] = useState<{ name: string; dataUrl: string; size: number } | null>(null);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const generate = trpc.prompt.generate.useMutation({
    onSuccess: (data) => { setResult(data); setError(""); },
    onError: (mutationError) => { setError(mutationError.message || "AI 개선 제안을 불러오지 못했습니다. 로컬 초안을 표시합니다."); setResult(localDraft(fields)); },
  });
  const progress = useMemo(() => Object.values(fields).filter((value) => value.trim()).length, [fields]);
  const updateField = (key: keyof DraftFields, value: string) => setFields((current) => ({ ...current, [key]: value }));
  const applyChoice = (key: keyof typeof quickChoices, value: string) => updateField(key, fields[key] === value ? "" : value);
  const handleFile = (file?: File) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("PNG, JPG, WEBP 형식의 참조 이미지만 사용할 수 있습니다."); return; }
    if (file.size > 3 * 1024 * 1024) { setError("참조 이미지는 3MB 이하만 업로드할 수 있습니다."); return; }
    const reader = new FileReader();
    reader.onload = () => { setReference({ name: file.name, dataUrl: String(reader.result), size: file.size }); setError(""); };
    reader.readAsDataURL(file);
  };
  const handleGenerate = () => {
    if (!fields.subject.trim()) { setError("먼저 만들고 싶은 비디오 장면을 입력해 주세요."); return; }
    setError(""); setResult(localDraft(fields)); generate.mutate({ ...fields, referenceImage: reference?.dataUrl });
  };
  const copyPrompt = async () => { if (!result) return; await navigator.clipboard.writeText(`${result.prompt}\n\n제외 요소: ${result.negativePrompt}`); toast.success("비디오 프롬프트를 클립보드에 복사했습니다."); };
  const reset = () => { setFields(initialFields); setReference(null); setResult(null); setError(""); };

  return (
    <main className="studio-shell">
      <header className="topbar"><a className="brand" href="/" aria-label="gunmin-kim 비디오 프롬프트 생성기 홈"><span className="brand-mark"><Sparkles size={16} /></span><span><strong>GUNMIN-KIM</strong><small>비디오 프롬프트 생성기</small></span></a><div className="topbar-meta"><span className="status-dot" />AI VIDEO WORKSHOP <span className="divider" /> v1.0</div></header>
      <section className="hero"><div><p className="kicker"><span /> A elegant and perfect style</p><h1>AI VIDEO<br /><em>PROMPT LAB</em></h1><p className="hero-copy">장면의 의도와 움직임을 입력하면 영상 모델이 이해할 수 있는 언어로 정제하고, 카메라와 시간의 흐름까지 설계합니다.</p></div><div className="hero-note"><span>01 / MOTION</span><p>MAKE<br />IT MOVE.</p></div></section>
      <div className="workspace-grid">
        <section className="panel input-panel" aria-labelledby="input-heading"><div className="panel-heading"><div><span className="panel-index">01 / INPUT</span><h2 id="input-heading">비디오 설계</h2></div><span className="field-count">{progress} / 9 complete</span></div>
          <div className="form-stack">
            <label className="field field-large"><span>어떤 비디오를 만들고 싶나요? <b>*</b></span><Textarea value={fields.subject} onChange={(event) => updateField("subject", event.target.value)} placeholder="예: 네온 도시를 달리는 탐험가, 카메라가 뒤에서 따라가는 장면" rows={3} /></label>
            <FieldWithChips label="스타일" value={fields.style} onChange={(value) => updateField("style", value)} choices={quickChoices.style} onChoice={(value) => applyChoice("style", value)} placeholder="영상의 시각 언어를 직접 입력하세요" />
            <FieldWithChips label="움직임" value={fields.motion} onChange={(value) => updateField("motion", value)} choices={quickChoices.motion} onChoice={(value) => applyChoice("motion", value)} placeholder="피사체와 환경이 어떻게 움직이나요?" />
            <FieldWithChips label="카메라" value={fields.camera} onChange={(value) => updateField("camera", value)} choices={quickChoices.camera} onChoice={(value) => applyChoice("camera", value)} placeholder="카메라의 이동과 시점을 입력하세요" />
            <div className="split-fields"><FieldWithChips label="조명" value={fields.lighting} onChange={(value) => updateField("lighting", value)} choices={quickChoices.lighting} onChoice={(value) => applyChoice("lighting", value)} placeholder="빛의 방향과 색" /><FieldWithChips label="전환" value={fields.transition} onChange={(value) => updateField("transition", value)} choices={quickChoices.transition} onChoice={(value) => applyChoice("transition", value)} placeholder="장면 연결 방식" /></div>
            <FieldWithChips label="속도와 리듬" value={fields.pacing} onChange={(value) => updateField("pacing", value)} choices={quickChoices.pacing} onChoice={(value) => applyChoice("pacing", value)} placeholder="영상의 템포와 감정 곡선" />
            <div className="split-fields"><label className="field"><span>제외 요소</span><Textarea value={fields.exclude} onChange={(event) => updateField("exclude", event.target.value)} placeholder="원하지 않는 영상 결함, 분위기" rows={2} /></label><label className="field"><span>추가 지시</span><Textarea value={fields.directions} onChange={(event) => updateField("directions", event.target.value)} placeholder="비율, 길이, 출력 목적" rows={2} /></label></div>
            <div className="reference-block"><div className="field-label"><span>참조 이미지</span><small>PNG · JPG · WEBP / 최대 3MB</small></div>{reference ? <div className="reference-preview"><img src={reference.dataUrl} alt={`${reference.name} 미리보기`} /><div><strong>{reference.name}</strong><small>{(reference.size / 1024 / 1024).toFixed(2)} MB · 업로드 완료</small></div><button className="icon-button" type="button" onClick={() => setReference(null)} aria-label="참조 이미지 제거"><X size={16} /></button></div> : <button className="upload-zone" type="button" onClick={() => fileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files?.[0]); }}><span className="upload-icon"><ImagePlus size={19} /></span><span><strong>무드보드 이미지를 드래그하거나 선택하세요</strong><small>비디오의 시각적 무드와 첫 프레임 설계에 사용됩니다.</small></span><Upload size={17} /></button>}<input ref={fileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} /></div>
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}<Button className="generate-button" onClick={handleGenerate} disabled={generate.isPending}>{generate.isPending ? <Loader2 className="spin" size={17} /> : <Film size={17} />} {generate.isPending ? "장면을 다듬는 중" : "비디오 프롬프트 생성하기"}<span>↗</span></Button>
        </section>
        <section className="panel output-panel" aria-labelledby="output-heading"><div className="panel-heading"><div><span className="panel-index">02 / OUTPUT</span><h2 id="output-heading">정제된 비디오 프롬프트</h2></div><button className="reset-button" type="button" onClick={reset}><RefreshCw size={14} /> 초기화</button></div>{!result ? <div className="empty-output"><div className="empty-orbit"><span /><span /><span /><Camera size={22} /></div><h3>다음 장면을 움직여 보세요.</h3><p>왼쪽에 비디오 정보를 입력하면<br />완성된 영상 프롬프트가 이곳에 나타납니다.</p><div className="empty-rule" /></div> : <div className="result-stack"><div className="result-card primary-result"><div className="result-card-head"><div><span className="result-label">VIDEO PROMPT / KO</span><h3>비디오 모델용 프롬프트</h3></div><button className="copy-button" type="button" onClick={copyPrompt}><Copy size={15} /> 복사</button></div><p className="prompt-text">{result.prompt}</p><div className="tag-row"><span>cinematic motion</span><span>camera rhythm</span><span>temporal continuity</span></div></div><div className="result-card"><span className="result-label">NEGATIVE / CONTROL</span><p className="negative-text">{result.negativePrompt}</p></div><div className="suggestion-card"><div className="suggestion-title"><span className="lightbulb"><Lightbulb size={15} /></span><div><span className="result-label">DIRECTOR'S NOTES</span><h3>더 좋아지기 위한 제안</h3></div></div><ul>{result.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div><div className="visual-note-row"><span className="result-label">MOTION CONTROL</span>{result.controlNotes.map((note) => <span className="visual-pill" key={note}>{note}</span>)}</div></div>}</section>
      </div><footer className="footer-note"><span>GUNMIN-KIM VIDEO PROMPT LAB</span><span>정확한 장면 · 살아있는 움직임 · 더 나은 영상</span></footer>
    </main>
  );
}

function FieldWithChips({ label, value, onChange, choices, onChoice, placeholder }: { label: string; value: string; onChange: (value: string) => void; choices: readonly string[]; onChoice: (value: string) => void; placeholder: string }) { return <label className="field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /><div className="chip-row">{choices.map((choice) => <button className={`chip ${value === choice ? "active" : ""}`} key={choice} type="button" onClick={() => onChoice(choice)}>{choice}</button>)}</div></label>; }
