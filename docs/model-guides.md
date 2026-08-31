# 모델별 프롬프트 기준

이 문서는 모델 프리셋이 따르는 핵심 작성 규칙입니다. 가이드의 원문이 바뀌면 이 문서와 `server/routers.ts`의 `presetInstruction`을 함께 갱신합니다.

## MiniMax H3

공식 H3 가이드는 작업 유형에 따라 T2VA(텍스트), I2VA(첫 프레임), FL2VA(첫·마지막 프레임), L2VA(마지막 프레임)를 구분하고, 다음 구조를 사용합니다.

1. 참조·프레임 정렬 지시
2. `integrated_multimodal_description`
3. `overall_soundscape`
4. `non_diegetic_music`

샷은 시간 순서대로 쓰고, 카메라 이동은 종류·크기·속도를 자연스러운 문장으로 표현합니다. 대사와 화면 텍스트는 원문을 보존합니다.

공식 가이드: https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/docs/VIDEO_PROMPT_WRITING_GUIDE_base_en.md

## Seedance

Seedance 공식 자료의 핵심은 멀티모달 참조, 멀티샷 스토리텔링, 복잡한 동작의 원인·행동·결과, 카메라 전개와 연속성입니다. 앱은 참조마다 역할을 부여하고, 필요할 때 `[Shot N]`과 타임코드를 포함하도록 프롬프트를 구성합니다.

공식 자료: https://seed.bytedance.com/en/seedance

프로젝트의 한국어 편집 레퍼런스도 함께 반영합니다: https://github.com/GUNMIN-KIM/seedance-video-editing-ko

최신 Seedance 2.5 멀티모달·편집 기능: https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5

## Kling

Kling 원본 편집은 새 영상을 다시 설명하는 대신 `SOURCE LOCK → PRESERVE → EDIT ONLY → CHANGE → PHYSICAL MATCH → KEEP EVERYTHING ELSE UNCHANGED` 계약으로 작성합니다. 인물·액팅·카메라·배경을 잠그고, 대상·위치·시간만 국소적으로 바꾸도록 지시합니다.

한국어 편집 레퍼런스: https://github.com/GUNMIN-KIM/kling-video-editing-ko

## MiniMax H3 R2V / Ref2VA

H3의 전체 참조 모드는 참조 라벨과 보존 관계를 먼저 정의한 뒤, `subject_definitions`, `summary`, `retention_analysis`, `detailed_description`, `overall_soundscape`, `non_diegetic_music` 순서로 출력합니다. 공식 모델 저장소의 가이드는 R2V/Ref2VA에서 `<Subject N>`, `<Picture N>`, `<Video N>`, `<Audio N>` 라벨을 끝까지 일관되게 사용할 것을 요구합니다.

공식 저장소: https://github.com/MiniMax-AI/MiniMax-H3
