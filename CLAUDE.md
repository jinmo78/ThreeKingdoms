# Oath & Banner (ThreeKingdoms) — 작업 메모

삼국지 장수 수집 + 6칸 부대(주장·부장×2·참모·보좌×2) 시너지 자동 전투 웹게임. 구조와 규칙 요약은 README.md 참고.

## 개발 · 배포
- `npm install` → `npm run dev` (http://localhost:5173), `npm run build` = 타입 체크 + 빌드
- `main`에 푸시하면 GitHub Actions가 GitHub Pages로 자동 배포 → https://jinmo78.github.io/ThreeKingdoms/
- 빌드 base 경로는 `/ThreeKingdoms/` (vite.config.ts)
- 공개 저장소이므로 커밋 이메일은 noreply 사용: 새로 clone한 PC에서는
  `git config user.email "109587767+jinmo78@users.noreply.github.com"` 를 이 저장소에 설정

## 원칙
- 외부 이미지 없이 SVG · CSS · 이모지 · lucide-react 아이콘만 사용
- 코에이 '삼국지 패도'는 장르 참고만. 고유 명칭·UI·능력치 체계는 베끼지 않음
- 저장은 localStorage(`oath-banner-save`, zustand persist). 저장 구조를 바꾸면 persist `version`을 올리고 `migrate` 작성
- UI 문구와 커밋 메시지는 한국어

## 코드 구조 요점
- 전투·편성 로직은 `src/engine/`(순수 함수, localStorage 의존 없음 → Web Worker에서도 사용)
- 적군 맞춤 편성은 `src/workers/counter.worker.ts`에서 실행
- 편성 편집기는 `src/components/FormationEditor.tsx` 하나를 편성 탭 · 토벌전 · 모의전이 공용으로 씀
- 모바일 레이아웃: grid 열은 `minmax(0,1fr)` + `min-w-0`로 가로 넘침 방지

## 밸런스 점검 방법
수치를 바꿀 때는 감으로 하지 말고 시뮬레이션으로 확인:
`src/engine`의 `simulateBattle`, `autoFormation`, `rollGenerals`(시드 고정)를 import하는 임시 스크립트를
`npx esbuild <script>.ts --bundle --platform=node --outfile=<out>.cjs` 로 묶어 `node`로 실행
(임시 스크립트는 저장소 밖에 둘 것). 기준: 자동 편성 덱이 일반 스테이지는 무난히, 장 보스는 60~90%,
시너지를 무시한 무작위 배치는 보스에서 크게 지도록.

## 다음 단계 후보
- 구글 로그인 + 클라우드 세이브: StatEleven(jinmo78/StatEleven)의 cloudStore.ts 방식을 이식.
  Supabase는 StatEleven과 같은 프로젝트를 공유하되 기존 `game_saves`(PK가 user_id 단독)와 별도 테이블을 만들 것.
  Supabase Site URL은 바꾸지 말고 Redirect URLs에만 추가
- PWA(홈 화면 설치), 일기토(장수 1:1 미니게임)
