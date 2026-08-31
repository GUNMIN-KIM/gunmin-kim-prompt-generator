# Verification Notes

## Implementation

The attached `BananaNode_Desktop_v1.2.6.zip` was inspected. Its non-internal payload contains `BananaNode.exe` rather than editable source files, so exact source-level parity with the desktop application cannot be verified. The new web project therefore implements the requested prompt-builder workflow and branding independently.

## Automated checks

- `pnpm check`: passed.
- `pnpm test`: passed, 2 test files and 3 tests.
- `pnpm build`: passed.

## Browser checks

- Preview title rendered as `gunmin-kim 프롬프트 생성기`.
- Desktop 1280px full-page visual review completed.
- Mobile 390x844 full-page visual review completed.
- Required scene input and quick chips were exercised with a sample Seoul rainy-alley scene.
- AI structured output returned a Korean image prompt, negative prompt, curator suggestions, and visual checks.
- Copy interaction displayed `프롬프트를 클립보드에 복사했습니다.`.
- Reset interaction returned the form to `0 / 6 complete`.
- Empty submission displayed `먼저 만들고 싶은 장면을 입력해 주세요.`.
- Reference image code path supports PNG/JPG/WEBP, 3MB validation, drag-and-drop, preview, and remove; upload input could not be driven through the preview harness because the native file input is intentionally visually hidden.

## Deployment constraint

The project is checkpointed as version `851e219c`. Public deployment must be initiated from the project management UI's Publish action; the development preview is not a public URL.

## Neon redesign verification

The redesign uses a near-black canvas, deep violet framing, acid-lime signal accents, large display typography, glow borders, orbit/spark motifs, and a split input/output workshop layout inspired by the supplied reference image. Desktop 1280px and mobile 390x844 full-page screenshots were captured after the redesign. The mobile layout stacks the input and output panels while preserving readable controls and the neon action button.

## Post-redesign interaction check

After the neon redesign, the preview was reloaded. A new scene was entered (`보랏빛 네온 간판이 빛나는 미래 도시의 골목, 홀로 서 있는 탐험가`) and the generate action produced a structured output card with prompt text, negative prompt, curator suggestions, and visual-check pills. The redesign preserved the input-to-output flow and the purple/lime visual language across the action state.

## 2026-08-31 비디오 전환 검증
프리뷰에서 샘플 비디오 장면을 입력하고 움직임 칩을 선택한 뒤 생성 버튼을 실행했다. 로컬 초안이 즉시 표시된 후 AI 응답이 정상적으로 갱신되었으며, 출력에는 VIDEO PROMPT / KO, 비디오 모델용 프롬프트, NEGATIVE / CONTROL, DIRECTOR'S NOTES, MOTION CONTROL이 표시되었다. 프롬프트는 피사체 동선·카메라 추적·렌즈·8초 시간 흐름을 포함했다. 데스크톱과 390px 모바일 스크린샷에서 AI VIDEO WORKSHOP, AI VIDEO PROMPT LAB, 비디오 설계 입력과 모바일 1열 레이아웃을 확인했다. 생성된 결과의 복사 버튼과 초기화 버튼은 출력 상태에서 제공된다.

추가 상호작용 검증: 샘플 장면 입력 후 ‘느린 인물의 이동’ 칩을 선택하고 생성 버튼을 눌렀다. 비디오 프롬프트 출력과 디렉터 제안이 렌더링되었고, ‘복사’ 클릭 시 ‘비디오 프롬프트를 클립보드에 복사했습니다.’ 토스트가 표시되었다. 이어서 ‘초기화’를 클릭하자 입력 카운트가 0 / 9로 돌아가고 출력이 빈 상태로 복원되었다.

## 2026-08-31 GitHub e879cbd 기존 프로젝트 반영

GitHub `main` 브랜치의 커밋 `e879cbd50a632e5515514b6bf03eef93585e5df6`을 기존 Manus 프로젝트 브랜치에 병합했다. 병합 과정에서 `Home.tsx` 상단 헤더 충돌은 e879cbd의 v2.0 이미지·영상 분석 워크플로와 기존 GitHub 소스 링크를 모두 보존하도록 해결했다. `pnpm check`, Vitest 2개 파일 4개 테스트, `pnpm build`가 통과했다. 데스크톱·390px 모바일 전체 화면에서 Text·Image·Video 입력 방식, 새 영상 생성·레퍼런스 재현·원본 영상 편집·VFX 덧방 출력 모드, 모델 프리셋과 출력 길이 설정이 표시됨을 확인했다.

프리뷰에서 Image 모드로 전환했을 때 PNG·JPG·WEBP(최대 3MB) 분석 업로드 영역과 자동 분석 안내가 나타났고, Video 모드에서는 MP4·MOV·WEBM(최대 250MB) 업로드 영역, Fast·Standard·Detailed 키프레임 샘플링, 0%~95% 구간 다중 프레임 분석 안내가 나타났다.

## 2026-08-31 기존 공개 주소 재배포 확인

기존 공개 주소 `https://gunminprompt-f8mxquxe.manus.space/?verify=e879cbd-redeploy-20260831`를 캐시 우회 파라미터와 함께 직접 조회했다. 브라우저 제목은 `gunmin-kim 프롬프트 생성기`이고, 화면에는 `AI VIDEO WORKSHOP v2.0`, GitHub 링크, Text·Image·Video 입력 모드, 새 영상 생성·레퍼런스 재현·원본 영상 편집·VFX 덧방, 모델 프리셋, 출력 길이 설정이 표시됐다. 공개 배포본은 기존 주소를 유지한 채 GitHub e879cbd의 이미지·영상 분석 워크플로로 갱신되었다.

공개 주소의 Text 모드에서 ‘노을 진 해안 도로를 달리는 오토바이를 드론 카메라가 따라가는 10초 광고 영상’ 샘플 장면을 입력했으며, 입력 진행 상태가 1 / 9 complete로 정상 갱신됐다.

같은 공개 주소에서 ‘비디오 프롬프트 생성하기’를 실행했고, AI 응답은 10초 해안 도로 오토바이 광고 영상의 카메라 동선·조명·액션을 포함한 VIDEO PROMPT / KO, 시간대별 TIMELINE, PRESERVATION LOCK, NEGATIVE / CONTROL, DIRECTOR'S NOTES, MOTION CONTROL로 정상 렌더링됐다.

공개 배포본의 최종 응답은 0-3초·3-7초·7-10초 구간별 시간축과 해안 도로·오토바이·골든 아워 조명 보존 조건을 제공했으며, 제어 항목에는 드론 카메라 경로·주행과 카메라 속도 동기화·역광 활용 지시가 표시됐다.

동일한 공개 배포본에서 ‘복사’를 클릭하자 ‘완성형 비디오 프롬프트를 클립보드에 복사했습니다.’ 확인 메시지가 표시됐고, ‘초기화’를 클릭하자 입력 진행 상태는 0 / 9 complete, 출력은 빈 상태로 정상 복원됐다.

## 2026-08-31 최신 체크포인트 확인
저장소 `GUNMIN-KIM/gunmin-kim-prompt-generator`의 `main` 브랜치에서 비디오 전환 커밋이 공개되어 있음을 확인했다. 프리뷰 헤더의 `GitHub ↗` 링크가 해당 저장소로 연결되고, 저장소의 설명과 화면 문구가 비디오 프롬프트 생성기 중심으로 정리되어 있다. 소스 전체와 공개 프리뷰 텍스트를 다시 검색한 결과 `AI IMAGE WORKSHOP`, `IMAGE WORKSHOP`, `image prompt`, `이미지 생성`, `이미지 프롬프트` 잔여 문구는 발견되지 않았다. 참조 이미지는 비디오 무드보드와 첫 프레임 설계 입력으로만 안내된다.

검증 대상 프리뷰: https://gunminprompt-f8mxquxe.manus.space/?verify=video-20260831
검증 대상 저장소: https://github.com/GUNMIN-KIM/gunmin-kim-prompt-generator

## 2026-08-31 멀티 참조 확장 검증

데스크톱 프리뷰에서 기존 네온 블랙·퍼플·라임 분위기와 2단 작업실을 유지하면서 멀티 참조 패널이 표시됐다. 이미지 슬롯은 Image 1, 최대 6개 카운터, Add Image 버튼과 PNG·JPG·WEBP/3MB 안내를 제공했고, 영상 슬롯은 Video 1, 최대 3개 카운터, Fast·Standard·Detailed 샘플링과 Add Video 버튼을 제공했다. 모바일 390px 프리뷰에서는 입력 폼·멀티 참조·역할 입력 영역이 한 열로 전환되고 출력 패널이 이어졌다.

라우터 계약은 `mediaReferences[]`로 확장되어 각 항목의 id·type·name·size·role·note·order·analysis·영상 meta·키프레임을 전달한다. 멀티 참조 배열 제한 테스트와 기존 인증 테스트를 포함해 TypeScript, 5개 Vitest 테스트, 프로덕션 빌드가 통과했다.

## 2026-08-31 멀티 참조 통합 분석 보완

전체 참조 통합 분석 라우터를 추가해 첨부 전체를 별도 입력으로 보내고 summary·priorityOrder·conflicts·synthesisNotes를 구조화해 반환하도록 했다. 생성 버튼은 통합 분석이 완료된 뒤 그 결과를 최종 비디오 프롬프트의 analysisNotes에도 포함한다. 프롬프트 본문에는 primary reference, 시각 보존 우선순위, first/last frame 경계, motion/camera/lighting/fx 연출 규칙, 충돌 해결 원칙을 명시했다. `VideoGenerationJob`과 `VideoGenerationParams` 타입도 향후 실제 영상 생성 연동을 위해 추가했다.

멀티 참조 규칙 단위 테스트를 추가해 혼합 참조 순서와 이미지 6개·영상 3개 제한을 검증했다. 총 2개 테스트 파일, 7개 테스트가 통과했고 TypeScript 검사와 프로덕션 빌드도 통과했다. 데스크톱·390px 모바일 프리뷰에서 기존 네온 작업실, Image 1·Video 1 슬롯, Add Image·Add Video, 샘플링 선택, 1열 모바일 전환을 확인했다.

## 2026-08-31 통합 분석 UI 최종 시각 검증

통합 분석 보완 후 데스크톱·390px 모바일 프리뷰에서 기존 네온 작업실 구조가 유지되고, 멀티 참조 패널의 이미지·영상 슬롯·역할 입력·샘플링 선택이 표시되는 것을 확인했다. 화면은 모바일에서 한 열로 전환되며 입력과 출력이 가로로 무너지지 않는다. 전체 통합 분석 카드는 실제 참조 분석이 완료된 뒤 summary, 우선순위, 충돌 해결, 합성 메모리를 표시하도록 연결했다.

## 2026-08-31 멀티 슬롯 실제 상호작용 검증

Playwright로 개발 프리뷰를 실제 조작했다. 이미지 입력에 PNG 2개를 순서대로 추가해 Image 1·Image 2와 1/6 카운터를 확인했고, 두 번째 이미지가 채워진 뒤 새 빈 슬롯이 유지되는 것을 확인했다. 첫 이미지의 role을 Background / Environment로 변경하고 “배경의 네온 색감 유지” 메모를 입력했다. 첫 카드를 제거한 뒤 남은 카드가 Image 1로 재정렬되는지 확인했고, 파일 입력을 초기화한 뒤 이미지를 다시 추가했다. 이어서 짧은 MP4를 영상 입력에 업로드해 Video 1 카드와 영상 참조 카드 렌더링을 확인했다. 결과 출력은 이미지·영상이 혼합된 상태를 정상 인식했다.

## 2026-08-31 메인 입력 방식 분기 UX 검증

Text·Image·Video 메인 입력 카드는 유지하면서 멀티 참조 관리자에 activeMode를 전달하도록 연결했다. 선택 모드에 따라 안내 카피와 해당 참조 섹션의 lime focus 보더·글로우가 바뀌며, Text는 텍스트 중심 안내, Image는 이미지 참조 중심 안내, Video는 영상·카메라·흐름 중심 안내를 표시한다. 기존 혼합 첨부 구조와 Add Image·Add Video는 그대로 유지된다. TypeScript 검사와 Vitest 8개 테스트가 통과했고, 데스크톱과 390px 모바일에서 입력 카드와 멀티 참조 패널의 반응형 표시를 확인했다.

## 2026-08-31 메인 모드별 작업 영역 실제 상호작용 검증

Playwright로 메인 입력 카드의 Image·Video·Text를 순서대로 클릭했다. Image 선택 상태에서는 IMAGE REFERENCES 영역만 렌더링되고 VIDEO REFERENCES는 숨겨졌으며, Video 선택 상태에서는 VIDEO REFERENCES와 키프레임 샘플링만 렌더링되고 IMAGE REFERENCES는 숨겨졌다. Text 선택 상태에서는 두 참조 영역이 다시 함께 표시됐다. 이후 이미지 PNG 2개를 추가해 Image 1·Image 2, 2/6 카운터, 역할 select와 메모 입력을 확인했고, 첫 카드 제거 후 순서 재정렬과 영상 MP4 Video 1 카드 렌더링까지 확인했다.
