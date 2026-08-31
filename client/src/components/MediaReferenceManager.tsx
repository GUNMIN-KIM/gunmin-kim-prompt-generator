import { Film, ImagePlus, Loader2, Play, Plus, Upload, X } from "lucide-react";
import { useRef } from "react";
import { MEDIA_ROLE_LABELS, MEDIA_ROLE_OPTIONS, type MediaReference, type MediaRole } from "@shared/media";
import { formatTimecode, samplingDescription, type FrameSamplingMode } from "@/lib/videoFrames";

type Props = {
  activeMode: "text" | "image" | "video";
  images: MediaReference[];
  videos: MediaReference[];
  sampling: FrameSamplingMode;
  analyzingIds: Set<string>;
  onAddImage: (file?: File) => void;
  onAddVideo: (file?: File) => void;
  onRemove: (id: string) => void;
  onReplace: (id: string, file?: File) => void;
  onRoleChange: (id: string, role: MediaRole) => void;
  onNoteChange: (id: string, note: string) => void;
  onRetryVideo: (id: string) => void;
  onSamplingChange: (sampling: FrameSamplingMode) => void;
};

const maxImages = 6;
const maxVideos = 3;

export default function MediaReferenceManager(props: Props) {
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const imageSlots = [...props.images, ...(!props.images.length || props.images.length < maxImages ? [undefined] : [])];
  const videoSlots = [...props.videos, ...(!props.videos.length || props.videos.length < maxVideos ? [undefined] : [])];

  const modeCopy = props.activeMode === "image" ? "이미지 참조를 중심으로 여러 장을 배치하세요." : props.activeMode === "video" ? "영상 참조를 중심으로 흐름과 카메라를 배치하세요." : "텍스트를 중심으로 필요한 이미지와 영상을 보조 참조로 추가하세요.";
  return <div className="media-reference-manager" data-active-mode={props.activeMode}>
    <div className="reference-section-head"><div><span className="field-label">멀티 참조</span><small>TEXT + IMAGE + VIDEO / ROLE-BASED</small><p className="active-mode-hint">{modeCopy}</p></div><span className="reference-count">{props.images.length} images · {props.videos.length} videos</span></div>
    <p className="reference-helper">이미지와 영상을 함께 넣어 피사체·배경·움직임·카메라의 관계를 설계하세요. 순서와 역할은 최종 프롬프트에 그대로 전달됩니다.</p>

    {props.activeMode !== "video" && <div className={`reference-subsection ${props.activeMode === "image" ? "mode-focus" : ""}`}><div className="subsection-title"><span>IMAGE REFERENCES</span><small>{props.images.length} / {maxImages}</small></div><div className="reference-slot-grid">
      {imageSlots.map((reference, index) => reference ? <ReferenceCard key={reference.id} reference={reference} analyzing={props.analyzingIds.has(reference.id)} onRemove={props.onRemove} onReplace={props.onReplace} onRoleChange={props.onRoleChange} onNoteChange={props.onNoteChange} /> : <UploadSlot key={`image-empty-${index}`} label={`Image ${index + 1}`} icon={<ImagePlus size={17} />} accept="image/png,image/jpeg,image/webp" helper="PNG · JPG · WEBP / 최대 3MB" onFile={props.onAddImage} inputRef={imageInput} />)}
    </div><button type="button" className="add-reference-button" disabled={props.images.length >= maxImages} onClick={() => imageInput.current?.click()}><Plus size={14} /> Add Image <span>{props.images.length}/{maxImages}</span></button></div>}

    {props.activeMode !== "image" && <div className={`reference-subsection ${props.activeMode === "video" ? "mode-focus" : ""}`}><div className="subsection-title"><span>VIDEO REFERENCES</span><small>{props.videos.length} / {maxVideos}</small></div><div className="sampling-control"><div><span>키프레임 샘플링</span><small>영상별로 독립 분석 · {samplingDescription(30, props.sampling)}</small></div><div className="compact-choice-row">{(["fast", "standard", "detailed"] as FrameSamplingMode[]).map((mode) => <button key={mode} type="button" className={`compact-choice ${props.sampling === mode ? "active" : ""}`} onClick={() => props.onSamplingChange(mode)}>{mode === "fast" ? "Fast" : mode === "standard" ? "Standard" : "Detailed"}</button>)}</div></div><div className="reference-slot-grid video-slot-grid">
      {videoSlots.map((reference, index) => reference ? <ReferenceCard key={reference.id} reference={reference} analyzing={props.analyzingIds.has(reference.id)} onRemove={props.onRemove} onReplace={props.onReplace} onRoleChange={props.onRoleChange} onNoteChange={props.onNoteChange} onRetryVideo={props.onRetryVideo} /> : <UploadSlot key={`video-empty-${index}`} label={`Video ${index + 1}`} icon={<Film size={17} />} accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" helper="MP4 · MOV · WEBM / 최대 250MB" onFile={props.onAddVideo} inputRef={videoInput} />)}
    </div><button type="button" className="add-reference-button" disabled={props.videos.length >= maxVideos} onClick={() => videoInput.current?.click()}><Plus size={14} /> Add Video <span>{props.videos.length}/{maxVideos}</span></button></div>}
    <input ref={imageInput} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => props.onAddImage(event.target.files?.[0])} />
    <input ref={videoInput} className="visually-hidden" type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={(event) => props.onAddVideo(event.target.files?.[0])} />
  </div>;
}

function UploadSlot({ label, icon, accept, helper, onFile, inputRef }: { label: string; icon: React.ReactNode; accept: string; helper: string; onFile: (file?: File) => void; inputRef: React.RefObject<HTMLInputElement | null> }) {
  return <button type="button" className="upload-zone reference-slot-empty" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); onFile(event.dataTransfer.files?.[0]); }}><span className="upload-icon">{icon}</span><span><strong>{label} · 드래그하거나 선택</strong><small>{helper}</small></span><Upload size={16} /></button>;
}

function ReferenceCard({ reference, analyzing, onRemove, onReplace, onRoleChange, onNoteChange, onRetryVideo }: { reference: MediaReference; analyzing: boolean; onRemove: (id: string) => void; onReplace: (id: string, file?: File) => void; onRoleChange: (id: string, role: MediaRole) => void; onNoteChange: (id: string, note: string) => void; onRetryVideo?: (id: string) => void }) {
  const replaceInput = useRef<HTMLInputElement>(null);
  return <article className="reference-card"><div className="reference-card-top"><span className="reference-order">{reference.type === "image" ? "Image" : "Video"} {reference.order}</span><span className="reference-type">{reference.type.toUpperCase()}</span><button type="button" className="icon-button" onClick={() => onRemove(reference.id)} aria-label={`${reference.name} 제거`}><X size={15} /></button></div>{reference.type === "image" && reference.dataUrl ? <img className="reference-thumb" src={reference.dataUrl} alt={`${reference.name} 미리보기`} /> : reference.previewUrl ? <video className="reference-thumb" src={reference.previewUrl} muted playsInline controls preload="metadata" /> : <div className="reference-thumb video-thumb-placeholder"><Film size={22} /></div>}<div className="reference-card-meta"><strong title={reference.name}>{reference.name}</strong><small>{(reference.size / 1024 / 1024).toFixed(2)} MB {reference.meta ? `· ${formatTimecode(reference.meta.duration)} · ${reference.meta.width}×${reference.meta.height}` : ""}</small>{reference.frames?.length ? <small>{reference.frames.length}개 키프레임 분석 완료</small> : analyzing ? <small><Loader2 size={12} className="spin" /> 분석 중</small> : null}</div>{reference.analysis && <details className="reference-analysis"><summary>개별 분석 메모 보기</summary><p>{reference.analysis}</p></details>}<label className="reference-role"><span>ROLE</span><select value={reference.role} onChange={(event) => onRoleChange(reference.id, event.target.value as MediaRole)}>{MEDIA_ROLE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="reference-note"><span>NOTE <small>optional</small></span><input value={reference.note} onChange={(event) => onNoteChange(reference.id, event.target.value)} placeholder="이 참조에서 유지할 요소" /></label><div className="reference-actions"><button type="button" className="mini-action" onClick={() => replaceInput.current?.click()}><Upload size={12} /> 교체</button>{reference.type === "video" && onRetryVideo && <button type="button" className="mini-action" disabled={analyzing} onClick={() => onRetryVideo(reference.id)}><Play size={12} /> 다시 분석</button>}</div><input ref={replaceInput} className="visually-hidden" type="file" accept={reference.type === "image" ? "image/png,image/jpeg,image/webp" : "video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"} onChange={(event) => onReplace(reference.id, event.target.files?.[0])} /></article>;
}

export { MEDIA_ROLE_LABELS };
