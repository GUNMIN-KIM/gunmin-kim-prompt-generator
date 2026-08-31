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

## 2026-08-31 최신 체크포인트 확인
저장소 `GUNMIN-KIM/gunmin-kim-prompt-generator`의 `main` 브랜치에서 비디오 전환 커밋이 공개되어 있음을 확인했다. 프리뷰 헤더의 `GitHub ↗` 링크가 해당 저장소로 연결되고, 저장소의 설명과 화면 문구가 비디오 프롬프트 생성기 중심으로 정리되어 있다. 소스 전체와 공개 프리뷰 텍스트를 다시 검색한 결과 `AI IMAGE WORKSHOP`, `IMAGE WORKSHOP`, `image prompt`, `이미지 생성`, `이미지 프롬프트` 잔여 문구는 발견되지 않았다. 참조 이미지는 비디오 무드보드와 첫 프레임 설계 입력으로만 안내된다.

검증 대상 프리뷰: https://gunminprompt-f8mxquxe.manus.space/?verify=video-20260831
검증 대상 저장소: https://github.com/GUNMIN-KIM/gunmin-kim-prompt-generator
