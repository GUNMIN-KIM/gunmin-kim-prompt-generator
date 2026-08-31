# 작업 규칙

이 저장소를 수정하는 모든 작업자는 다음 두 링크를 기준으로 합니다.

- 공개 동작/화면: https://gunminprompt-f8mxquxe.manus.space/
- 소스와 변경 이력: https://github.com/GUNMIN-KIM/gunmin-kim-prompt-generator

## 협업 방식

- `main`에 직접 덮어쓰지 말고 작업 브랜치와 커밋을 사용합니다.
- 기존 React + Express + tRPC 구조와 현재 UI를 유지합니다.
- 작업 전후에 가능한 범위에서 `pnpm check`, `pnpm test`, `pnpm build`를 실행합니다.
- 완료 시 변경 요약, 검증 결과, 남은 환경 의존성을 커밋 메시지 또는 PR에 기록합니다.

## 보안

- `.env*`, `.project-config.json`, API 키, 토큰, 데이터베이스 접속 정보를 저장소에 추가하지 않습니다.
- 사이트 링크에 표시되지 않는 동작은 추측하지 말고 소스와 실행 결과로 확인합니다.
