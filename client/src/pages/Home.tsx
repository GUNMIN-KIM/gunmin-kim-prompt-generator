import { useMemo, useRef, useState } from "react";
import { Copy, ImagePlus, Lightbulb, Loader2, RefreshCw, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

type DraftFields = {
  subject: string;
  style: string;
  composition: string;
  lighting: string;
  exclude: string;
  directions: string;
};

type PromptResult = {
  prompt: string;
  negativePrompt: string;
  suggestions: string[];
  visualNotes: string[];
};

const initialFields: DraftFields = {
  subject: "",
  style: "",
  composition: "",
  lighting: "",
  exclude: "",
  directions: "",
};

const quickChoices = {
  style: ["시네마틱 리얼리즘", "에디토리얼 패션", "몽환적 일러스트", "미니멀 제품 사진"],
  composition: ["아이 레벨 미디엄 샷", "대칭적 와이드 샷", "로우 앵글 클로즈업", "여백이 있는 중앙 구도"],
  lighting: ["소프트 윈도 라이트", "골든 아워 백라이트", "극적인 키아로스쿠로", "확산된 스튜디오 라이트"],
} as const;

function localDraft(fields: DraftFields): PromptResult {
  const subject = fields.subject.trim() || "주제와 장면을 입력해 주세요";
  const parts = [
    subject,
    fields.style && `스타일: ${fields.style}`,
    fields.composition && `구도: ${fields.composition}`,
    fields.lighting && `조명: ${fields.lighting}`,
    fields.directions && `연출: ${fields.directions}`,
  ].filter(Boolean);
  return {
    prompt: `${parts.join(". ")}. 섬세한 질감과 명확한 피사체 계층, 자연스러운 색감, 높은 디테일, 완성도 높은 이미지 생성용 묘사.`,
    negativePrompt: fields.exclude || "저해상도, 흐릿한 디테일, 부자연스러운 손과 얼굴, 과도한 채도, 어수선한 배경",
    suggestions: [
      "피사체의 재질과 표면 질감을 한 단계 더 구체화해 보세요.",
      "카메라 렌즈와 피사계 심도를 추가하면 공간감이 선명해집니다.",
      "장면의 시간대나 감정적 온도를 지정하면 분위기가 안정됩니다.",
    ],
    visualNotes: ["주 피사체", fields.composition || "구도 미지정", fields.lighting || "조명 미지정"],
  };
}

export default function Home() {
  const [fields, setFields] = useState<DraftFields>(initialFields);
  const [reference, setReference] = useState<{ name: string; dataUrl: string; size: number } | null>(null);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const generate = trpc.prompt.generate.useMutation({
    onSuccess: (data) => {
      setResult(data);
      setError("");
    },
    onError: (mutationError) => {
      setError(mutationError.message || "AI 개선 제안을 불러오지 못했습니다. 로컬 초안을 표시합니다.");
      setResult(localDraft(fields));
    },
  });

  const progress = useMemo(() => Object.values(fields).filter((value) => value.trim()).length, [fields]);
  const updateField = (key: keyof DraftFields, value: string) => setFields((current) => ({ ...current, [key]: value }));

  const applyChoice = (key: "style" | "composition" | "lighting", value: string) => {
    updateField(key, fields[key] === value ? "" : value);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("PNG, JPG, WEBP 형식의 참조 이미지만 사용할 수 있습니다.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("참조 이미지는 3MB 이하만 업로드할 수 있습니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReference({ name: file.name, dataUrl: String(reader.result), size: file.size });
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = () => {
    if (!fields.subject.trim()) {
      setError("먼저 만들고 싶은 장면을 입력해 주세요.");
      return;
    }
    setError("");
    setResult(localDraft(fields));
    generate.mutate({ ...fields, referenceImage: reference?.dataUrl });
  };

  const copyPrompt = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(`${result.prompt}\n\n제외 요소: ${result.negativePrompt}`);
    toast.success("프롬프트를 클립보드에 복사했습니다.");
  };

  return (
    <main className="studio-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="gunmin-kim 프롬프트 생성기 홈">
          <span className="brand-mark"><Sparkles size={16} /></span>
          <span><strong>GUNMIN-KIM</strong><small>프롬프트 생성기</small></span>
        </a>
        <div className="topbar-meta"><span className="status-dot" />AI IMAGE WORKSHOP <span className="divider" /> v1.0</div>
      </header>

      <section className="hero">
        <div>
          <p className="kicker"><span /> A elegant and perfect style</p>
          <h1>AI PROMPT<br /><em>GENERATOR</em></h1>
          <p className="hero-copy">장면의 핵심을 입력하면 이미지 모델이 이해할 수 있는 언어로 정제하고, 아직 비어 있는 시각적 디테일까지 제안합니다.</p>
        </div>
        <div className="hero-note"><span>01</span><p>Describe<br />your vision.</p></div>
      </section>

      <div className="workspace-grid">
        <section className="panel input-panel" aria-labelledby="input-heading">
          <div className="panel-heading"><div><span className="panel-index">01 / INPUT</span><h2 id="input-heading">장면 설계</h2></div><span className="field-count">{progress} / 6 complete</span></div>

          <div className="form-stack">
            <label className="field field-large"><span>무엇을 만들고 싶나요? <b>*</b></span><Textarea value={fields.subject} onChange={(event) => updateField("subject", event.target.value)} placeholder="예: 비가 갠 서울의 골목, 우산을 든 인물과 젖은 아스팔트의 반사광" rows={3} /></label>
            <FieldWithChips label="스타일" value={fields.style} onChange={(value) => updateField("style", value)} choices={quickChoices.style} onChoice={(value) => applyChoice("style", value)} placeholder="원하는 시각 언어를 직접 입력하세요" />
            <FieldWithChips label="구도" value={fields.composition} onChange={(value) => updateField("composition", value)} choices={quickChoices.composition} onChoice={(value) => applyChoice("composition", value)} placeholder="카메라와 피사체의 관계를 입력하세요" />
            <FieldWithChips label="조명" value={fields.lighting} onChange={(value) => updateField("lighting", value)} choices={quickChoices.lighting} onChoice={(value) => applyChoice("lighting", value)} placeholder="빛의 방향과 온도를 입력하세요" />
            <div className="split-fields"><label className="field"><span>제외 요소</span><Textarea value={fields.exclude} onChange={(event) => updateField("exclude", event.target.value)} placeholder="원하지 않는 요소, 결함, 분위기" rows={2} /></label><label className="field"><span>추가 지시</span><Textarea value={fields.directions} onChange={(event) => updateField("directions", event.target.value)} placeholder="브랜드 톤, 비율, 출력 목적" rows={2} /></label></div>

            <div className="reference-block"><div className="field-label"><span>참조 이미지</span><small>PNG · JPG · WEBP / 최대 3MB</small></div>
              {reference ? <div className="reference-preview"><img src={reference.dataUrl} alt={`${reference.name} 미리보기`} /><div><strong>{reference.name}</strong><small>{(reference.size / 1024 / 1024).toFixed(2)} MB · 업로드 완료</small></div><button className="icon-button" type="button" onClick={() => setReference(null)} aria-label="참조 이미지 제거"><X size={16} /></button></div> : <button className="upload-zone" type="button" onClick={() => fileRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files?.[0]); }}><span className="upload-icon"><ImagePlus size={19} /></span><span><strong>이미지를 드래그하거나 선택하세요</strong><small>시각적 무드와 디테일을 분석하는 데 사용됩니다.</small></span><Upload size={17} /></button>}
              <input ref={fileRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} />
            </div>
          </div>
          {error && <p className="error-message" role="alert">{error}</p>}
          <Button className="generate-button" onClick={handleGenerate} disabled={generate.isPending}>{generate.isPending ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />} {generate.isPending ? "장면을 다듬는 중" : "프롬프트 생성하기"}<span>↗</span></Button>
        </section>

        <section className="panel output-panel" aria-labelledby="output-heading">
          <div className="panel-heading"><div><span className="panel-index">02 / OUTPUT</span><h2 id="output-heading">정제된 프롬프트</h2></div><button className="reset-button" type="button" onClick={() => { setFields(initialFields); setReference(null); setResult(null); setError(""); }}><RefreshCw size={14} /> 초기화</button></div>
          {!result ? <div className="empty-output"><div className="empty-orbit"><span /><span /><span /><Sparkles size={22} /></div><h3>당신의 다음 장면을 기다리고 있습니다.</h3><p>왼쪽에 장면 정보를 입력하면<br />완성된 이미지 프롬프트가 이곳에 나타납니다.</p><div className="empty-rule" /></div> : <div className="result-stack"><div className="result-card primary-result"><div className="result-card-head"><div><span className="result-label">IMAGE PROMPT / KO</span><h3>이미지 모델용 프롬프트</h3></div><button className="copy-button" type="button" onClick={copyPrompt}><Copy size={15} /> 복사</button></div><p className="prompt-text">{result.prompt}</p><div className="tag-row"><span>cinematic detail</span><span>natural texture</span><span>high fidelity</span></div></div><div className="result-card"><span className="result-label">NEGATIVE PROMPT</span><p className="negative-text">{result.negativePrompt}</p></div><div className="suggestion-card"><div className="suggestion-title"><span className="lightbulb"><Lightbulb size={15} /></span><div><span className="result-label">CURATOR'S NOTES</span><h3>더 좋아지기 위한 제안</h3></div></div><ul>{result.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></div><div className="visual-note-row"><span className="result-label">VISUAL CHECK</span>{result.visualNotes.map((note) => <span className="visual-pill" key={note}>{note}</span>)}</div></div>}
        </section>
      </div>
      <footer className="footer-note"><span>GUNMIN-KIM PROMPT GENERATOR</span><span>정확한 장면 · 섬세한 언어 · 더 나은 이미지</span></footer>
    </main>
  );
}

function FieldWithChips({ label, value, onChange, choices, onChoice, placeholder }: { label: string; value: string; onChange: (value: string) => void; choices: readonly string[]; onChoice: (value: string) => void; placeholder: string }) {
  return <label className="field"><span>{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /> <div className="chip-row">{choices.map((choice) => <button className={`chip ${value === choice ? "active" : ""}`} key={choice} type="button" onClick={() => onChoice(choice)}>{choice}</button>)}</div></label>;
}
