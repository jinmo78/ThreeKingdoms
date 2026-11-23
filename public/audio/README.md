# 배경음악 (BGM)

`public/audio/`에 두면 GitHub Pages / 로컬에서
`import.meta.env.BASE_URL + 'audio/' + 파일명`으로 로드됩니다.

| 파일명 | 키 | 용도 | 권장 길이 | 루프 |
|---|---|---|---|---|
| `bgm_lobby.wav` | `lobby` | 타이틀 · 출진 · 편성 · 등용 · 장수록 · 도전 | 1~2분 | 예 |
| `bgm_battle.wav` | `battle` | 전투·결과 화면 (`view === 'battle'`) | 1~2분 | 예 |

## 현재 파일

`scripts/generate-bgm.mjs`로 만든 **임시 합성음**입니다 (오리지널 곡 아님).
제대로 된 BGM으로 바꿀 때는 같은 파일명으로 덮어쓰거나,
`src/audio/audioManager.ts`의 `BGM_FILES` 확장자·이름을 맞추면 됩니다.

재생: `npm run audio:bgm`
