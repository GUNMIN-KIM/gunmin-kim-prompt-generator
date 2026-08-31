# gunmin-kim 프롬프트 생성기

공개 사이트와 GitHub 저장소를 기준으로 누구나 프로젝트를 이어서 작업할 수 있는 비디오 프롬프트 생성기입니다.

- 사이트: https://gunminprompt-f8mxquxe.manus.space/
- 소스: https://github.com/GUNMIN-KIM/gunmin-kim-prompt-generator

## 다른 환경에서 이어서 작업하기

1. 사이트 링크를 열어 현재 동작과 화면을 확인합니다.
2. GitHub 저장소를 clone하거나 작업 환경에 연결합니다.
3. `main`에서 새 브랜치를 만들고 변경사항을 커밋합니다.
4. 검증 후 Pull Request를 열거나, 저장소 소유자가 확인한 뒤 `main`에 병합합니다.

```bash
pnpm install
pnpm check
pnpm test
pnpm build
```

AI 작업자에게 전달할 최소 컨텍스트는 위의 사이트 링크와 GitHub 링크입니다. 사이트의 동작을 기준으로 삼고, 구현·변경 이력은 GitHub를 기준으로 유지합니다.

## 비밀값

`.env*`와 `.project-config.json`은 커밋하지 않습니다. AI/API 키, 데이터베이스 URL, OAuth 비밀값은 각 실행 환경의 비밀값 저장소에서 주입해야 합니다. 예시는 [.env.example](.env.example)을 참고하세요.
