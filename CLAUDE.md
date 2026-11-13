# Oath & Banner (ThreeKingdoms) — 작업 메모

삼국지 장수 수집 + 6칸 부대(주장·부장×2·참모·보좌×2) 시너지 자동 전투 웹게임. 구조와 규칙 요약은 README.md 참고.

## 개발 · 배포
- `npm install` → `npm run dev` (http://localhost:5173), `npm run build` = 타입 체크 + 빌드
- `main`에 푸시하면 GitHub Actions가 GitHub Pages로 자동 배포 → https://jinmo78.github.io/ThreeKingdoms/
- 빌드 base 경로는 `/ThreeKingdoms/` (vite.config.ts)
- 공개 저장소이므로 커밋 이메일은 noreply 사용: 새로 clone한 PC에서는
  `git config user.email "109587767+jinmo78@users.noreply.github.com"` 를 이 저장소에 설정

## 원칙
- UI는 SVG · CSS · 이모지 · lucide-react 아이콘만 사용. 외부 URL 이미지(핫링크) 금지
- 예외: 장수 초상 그림은 저장소 안 `public/portraits/`에 직접 만든 webp로만 둔다 (아래 '장수 초상' 참고)
- 코에이 '삼국지 패도'는 장르 참고만. 고유 명칭·UI·능력치 체계는 베끼지 않음
- 저장은 localStorage(`oath-banner-save`, zustand persist). 저장 구조를 바꾸면 persist `version`을 올리고 `migrate` 작성
- UI 문구와 커밋 메시지는 한국어

## 코드 구조 요점
- 전투·편성 로직은 `src/engine/`(순수 함수, localStorage 의존 없음 → Web Worker에서도 사용)
- 적군 맞춤 편성은 `src/workers/counter.worker.ts`에서 실행
- 편성 편집기는 `src/components/FormationEditor.tsx` 하나를 편성 탭 · 토벌전 · 모의전이 공용으로 씀
- 모바일 레이아웃: grid 열은 `minmax(0,1fr)` + `min-w-0`로 가로 넘침 방지

## 장수 초상
- 기본은 SVG 상반신 (`src/components/Portrait.tsx`, 외형 정의 `src/data/portraits.ts`). 모든 장수 토큰(`GeneralToken`)이 사용
- 그림 초상으로 교체 진행 중: `public/portraits/<장수 id>.webp`를 넣고 `src/data/portraitImages.ts`의
  `PORTRAIT_IMAGES`에 id를 추가하면 그 장수만 그림으로 바뀐다 (목록에 없으면 SVG 유지)
- 규격: 정사각형 512×512 webp, 장당 60KB 이하 목표, 얼굴이 위쪽 절반 중앙 (토큰이 `object-top`으로 잘라 씀,
  작게는 32px까지 축소되므로 얼굴이 크게 보이는 구도)
- 화풍: 실사풍 디지털 페인팅(semi-realistic painterly), 극적인 역광, 어두운 배경에 세력 색 기운
  (위 파랑 · 촉 초록 · 오 빨강 · 군웅 주황/황금). 글자·테두리·워터마크 없음
- 저작권: 코에이 '삼국지 패도' 등 기존 게임 CG를 참고 이미지로 넣거나 캐릭터 디자인을 따라 하지 말 것.
  프롬프트에는 게임 이름 없이 화풍과 인물의 역사·연의 속 특징만 쓴다 (예: 관우 = 붉은 얼굴, 긴 수염, 녹색 두건)
- 장수 id·이름·세력 목록은 `src/data/generals.json` (적 전용 장수 포함 100명). 우선순위: SSR → SR → R → 적 전용
- 2026-11-13 Figma AI 크레딧 소진으로 생성 보류. 작업용 Figma 파일(비어 있음): https://www.figma.com/design/VfMIQJInXIQa4j2eW6qHTp

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
