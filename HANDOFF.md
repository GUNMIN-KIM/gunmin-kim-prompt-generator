# gunmin-kim 비디오 프롬프트 생성기 이관 안내

이 패키지는 현재 `gunmin-kim-prompt-generator` 프로젝트의 편집 가능한 소스입니다. 기존 네온 작업실 디자인, Text·Image·Video 메인 입력 모드, 멀티 이미지·영상 참조, 역할·메모·순서, 개별·통합 분석, 비디오 프롬프트 생성, 테스트와 검증 기록을 포함합니다.

## 다른 Manus 계정에서 사용하기

새 Manus 계정에서 WebDev 프로젝트를 만든 뒤 이 파일들을 업로드하거나 GitHub 저장소를 가져오세요. `pnpm install` 후 `pnpm check`, `pnpm test`, `pnpm build` 순서로 확인하면 됩니다. Manus 프로젝트의 기본 환경값은 새 계정에서 자동 주입되는 값을 사용해야 하며, 기존 계정의 `.env`나 비밀 토큰을 복사하지 마세요.

## Claude·Codex에서 작업하기

GitHub 저장소를 연결한 뒤 다음과 같이 요청하면 됩니다.

> 이 저장소의 `main` 브랜치를 기준으로 작업해줘. 기존 React + Express + tRPC 구조와 네온 비디오 프롬프트 생성기 디자인을 유지하고, 변경 전후에 `pnpm check`, `pnpm test`, `pnpm build`를 실행해줘.

현재 저장소 주소는 `https://github.com/GUNMIN-KIM/gunmin-kim-prompt-generator`입니다.

## GitHub 웹 업로드

저장소에서 `Add file` → `Upload files`를 선택한 후 이 패키지의 압축을 해제한 파일 전체를 업로드하고 커밋하세요. 기존 `package.json`, `pnpm-lock.yaml`, `client/`, `server/`, `shared/`, `drizzle/` 구조를 유지해야 합니다. `node_modules/`, `dist/`, `.env` 파일은 업로드하지 않습니다.

## 환경값 주의

AI 호출과 Manus 인증은 새 프로젝트의 환경값을 사용해야 합니다. `BUILT_IN_FORGE_API_KEY`, `BUILT_IN_FORGE_API_URL`, `JWT_SECRET`, `OAUTH_SERVER_URL`, `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `DATABASE_URL` 같은 값은 채팅이나 GitHub에 기록하지 말고 새 Manus 프로젝트에서 주입하세요.

## 핵심 확장 지점

멀티 참조 타입은 `shared/media.ts`, 개수·순서·상태 전이 규칙은 `shared/mediaRules.ts`, 슬롯 UI는 `client/src/components/MediaReferenceManager.tsx`, 작업실과 모드 분기는 `client/src/pages/Home.tsx`, AI 분석과 통합 프롬프트 라우터는 `server/routers.ts`에 있습니다. 이후 실제 영상 생성 provider를 붙일 때는 `shared/media.ts`의 `VideoGenerationProvider`, `VideoGenerationParams`, `VideoGenerationJob` 타입과 `server/routers.ts`의 생성 경로를 확장하면 됩니다.
