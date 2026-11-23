# 배경음악 (BGM)

`public/audio/`에 mp3를 두면 GitHub Pages / 로컬에서
`import.meta.env.BASE_URL + 'audio/' + 파일명`으로 로드됩니다.

| 파일명 | 키 | 용도 | 권장 길이 | 루프 |
|---|---|---|---|---|
| `bgm_lobby.mp3` | `lobby` | 타이틀 · 출진 · 편성 · 등용 · 장수록 · 도전 | 1~2분 | 예 |
| `bgm_battle.mp3` | `battle` | 전투·결과 화면 (`view === 'battle'`) | 1~2분 | 예 |

효과음(SFX)은 아직 쓰지 않습니다. 곡을 추가할 때는 `src/audio/audioManager.ts`의 `BGM_FILES`에 키·파일명을 넣으면 됩니다.
