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
- `Modal`은 `createPortal(..., document.body)` — sticky/overflow 조상 안에 두면 PC에서 레이아웃이 깨짐

## 장수 초상 · 전신
- 기본은 SVG 상반신 (`src/components/Portrait.tsx`, 외형 정의 `src/data/portraits.ts`). 모든 장수 토큰(`GeneralToken`)이 사용
- 그림 초상: `public/portraits/<id>.webp` + `PORTRAIT_IMAGES` (목록에 없으면 SVG)
- 전신: `public/portraits/<id>-full.webp` + `PORTRAIT_FULL_IMAGES`. 상세에서 초상 클릭 → 전체화면
- 상반신 규격: 정사각형 512×512 webp, 장당 60KB 이하 목표, 얼굴이 위쪽 절반 중앙 (`object-top`)
- 전신 비율: 등애 전신 정도의 자연스러운 ~7등신. 과도하게 긴 패션 크로키는 피할 것
- 화풍: 실사풍 디지털 페인팅, 극적인 역광, 어두운 배경에 세력 색 기운
  (위 파랑 · 촉 초록 · 오 빨강 · 군웅 주황/황금). 글자·테두리·워터마크 없음
- 저작권: 코에이 CG를 참고 이미지로 넣거나 디자인을 따라 하지 말 것. 프롬프트에는 게임 이름 없이
  화풍과 역사·연의 속 특징만 (예: 관우 = 붉은 얼굴, 긴 수염, 녹색 두건)
- 장수 id 목록: `src/data/generals.json` (약 100명). 초상·전신 webp는 전원 등록된 상태(2026-11-15)

## 등용 · 출석 · 금화
- 유료: 1회 100 · 10연 900. 무료 잔여가 있으면 먼저 소모 (`src/engine/attendance.ts`)
- 매일 무료 10회 자동 지급. 출석(하루 1회, 연속 보상 1·1·2·2·3·3·5)으로 추가 무료
- 원정·토벌 금화 보상은 2026-11-15에 약 절반으로 축소. 체감이 가혹하면 재조정
- SAVE_VERSION 9: `freePulls`, `freeGrantDay`, `attendDay`, `attendStreak`

## 공성 (패도식 개편 1단계, 2026-11-17)
- 원정 스테이지 = 성. 부대 1~3개를 골라 나눠 출정 (`SiegePanel`, `startBattle(stageId, picks)`)
- 부상: 출정 부대(주장 id 기준 `u:<id>`)와 공격받은 수비대(`c:<스테이지>:<번호>`)의 남은 병력 비율을 `wounds`에 저장 (SAVE_VERSION 12)
- 회복은 타이머 없이 저장 시각으로 계산 (`src/engine/siege.ts`): 부대 3분, 수비대 15분, 병력 10% 미만은 출정 불가
- 2단계 행군(SAVE_VERSION 13): `startMarch`가 `marches`에 출발 편성 스냅샷과 도착 시각(eta)을 저장, 도착하면 Campaign 화면이 `resolveMarches`로 전투 계산 → 전투 화면. 행군 시간 `marchMs` = (10 + 스테이지번호×3)초, 동시 행군 3개, 행군 중 부대는 잠김
- 3단계 전술(`src/engine/tactics.ts`): 성마다 지형(강·숲·관문·평지, `STAGE_TERRAIN`), 날씨는 30분마다 시각으로 계산. 출정 때 정면/수공/화공/기습을 고름(금화 0/40/40/30, March.tactic). 수공·화공=수비대 전체 병력 %, 기습=선공+지원군 차단. 지원군(확률 20~50%, 행군 id로 고정)은 수비대에 부대 1개 추가
- 4단계 내정(SAVE_VERSION 14, `src/engine/domain.ts`): 점령하면 `castles[stageId]` 생성(레벨·수비 부대·마지막 징수 시각). 수입 = (6+번호×1.5)×(1+0.35×(Lv-1))×(수비 1.25) 금/시, 최대 8시간분 적립, 징수는 `collectGold`, 투자는 `upgradeCastle` (최대 Lv5). 수비 부대는 `setGarrison`(출정 불가로 잠김, 5단계 방어에 사용 예정). 이전 저장은 `ensureCastles`가 보충
- 로드맵: 5 AI 군주 · 비동기 대전
- UI 규칙(2026-11-17): 긴 목록은 `HSlide`(ui.tsx, 가로 슬라이드 · PC 화살표/폰 스와이프) 사용. 모바일 군령 시트(`Briefing`)는 처음엔 닫힘 + ✕ 버튼, 출정 버튼은 시트 맨 위 고정. 지도 틀(`.war-map`)은 `overflow-clip`이라 `scrollIntoView` 금지(`window.scrollTo` 사용)

## 폰 가로 모드 (2026-11-18, 1단계)
- 조건: 가로 + 높이 500px 이하. CSS는 `land:` 변형(index.css `@custom-variant`), JS는 `useLandscape()`(ui.tsx) — 두 조건은 항상 같게 유지
- 가로면 `App.tsx`의 `LandShell`로 전환 (패도식 HUD, 2026-11-18): 원정 지도가 화면 전체(자체 스크롤, 프런티어 성이 가운데로 시작) + 그 위에 HUD. 위 얇은 반투명 바, 오른쪽 메뉴 버튼 열(편성·도전·등용·장수록 → `Modal wide`), 좌상단 영지 요약 + 드롭 필터, 좌하단 행군 목록, 성을 누르면 군령 패널이 오른쪽에 떠오름(✕로 닫기). 세로는 기존 UI 그대로
- `Campaign.tsx`는 `land` 분기로 같은 JSX를 공유 (지도 폭 `max-w-[25rem]`, 프레임·모서리·방위표 제거). 전투는 종이 판 위에 로그를 옆으로
- PWA 설치 앱은 manifest `orientation: any`로 바꿨지만 이미 설치된 앱은 지우고 다시 설치해야 반영됨
- 참고한 '삼국지 패도' 화면은 배치 구조만 참고 (HUD가 지도 위, 기능은 모달). 그림·명칭 모방 금지
- 다음: 가로 전용 천하 지도(드래그 이동), 전투 HUD화, 모달 내부 편성 화면 가로 최적화

## 밸런스 점검 방법
수치를 바꿀 때는 감으로 하지 말고 시뮬레이션으로 확인:
`src/engine`의 `simulateBattle`, `autoFormation`, `rollGenerals`(시드 고정)를 import하는 임시 스크립트를
`npx esbuild <script>.ts --bundle --platform=node --outfile=<out>.cjs` 로 묶어 `node`로 실행
(임시 스크립트는 저장소 밖에 둘 것). 기준: 자동 편성 덱이 일반 스테이지는 무난히, 장 보스는 60~90%,
시너지를 무시한 무작위 배치는 보스에서 크게 지도록.

## 다음 단계 후보
- 출석·무료 등용 UX, 금화 수급 재조정
- 폰 가로 모드(2026-11-17 논의, 미착수): `docs/작업기록-2026-11-17.md` 참고
- 일기토(장수 1:1 미니게임), 장수·스테이지 확장, 장비/보물
- 일자별 상세 기록: `docs/작업기록-YYYY-MM-DD.md` (최근: 2026-11-17)

## PWA
- `vite-plugin-pwa` + Workbox. 빌드 산출물에 SW·manifest 포함 (`registerType: autoUpdate`)
- 아이콘은 `npm run icons:pwa`로 `public/pwa-*.png` · `apple-touch-icon.png` 재생성
- 오프라인은 앱 셸·정적 에셋·웹폰트까지. Firebase(로그인·동기화)는 온라인 필요
